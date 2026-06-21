import asyncio
import json
import os
import re
import tkinter as tk
from tkinter import filedialog
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import yt_dlp
from pathlib import Path
import uuid
from datetime import datetime
import httpx
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


app = FastAPI()

# Default Download Path
DEFAULT_DOWNLOAD_PATH = os.path.join(str(Path.home()), "Downloads", "DLP")
SETTINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "settings.json")
HISTORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "download_history.json")

def clean_text(text):
    """Removes ANSI color codes from strings"""
    if not text:
        return "-"
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

def open_folder_dialog():
    """Opens a native folder selection dialog and returns the path."""
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        path = filedialog.askdirectory(title="Select Download Folder")
        root.destroy()
        return path
    except Exception as e:
        print(f"Error opening dialog: {e}")
        return ""

# --- Persistent Settings Helpers ---
def load_settings():
    if not os.path.exists(SETTINGS_FILE):
        return {}
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_settings(settings):
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Failed to save settings: {e}")

def get_last_download_path():
    settings = load_settings()
    return settings.get("last_download_path", DEFAULT_DOWNLOAD_PATH)

def save_last_download_path(path):
    if not path:
        return
    settings = load_settings()
    settings["last_download_path"] = path
    save_settings(settings)

# --- Persistent History Helpers ---
def load_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_history(history):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Failed to save history: {e}")

def add_history_item(url, title, filename, save_path, status, size="-"):
    history = load_history()
    item = {
        "id": str(uuid.uuid4()),
        "url": url,
        "title": title,
        "filename": filename,
        "save_path": save_path,
        "status": status,
        "size": size,
        "timestamp": datetime.now().isoformat()
    }
    history.insert(0, item)
    history = history[:100]  # Keep last 100 entries
    save_history(history)
    return item

class DownloadManager:
    def __init__(self, websocket: WebSocket, cancellation_event: asyncio.Event):
        self.websocket = websocket
        self.cancellation_event = cancellation_event
        self.download_phase = 0
        try:
            self.loop = asyncio.get_running_loop()
        except RuntimeError:
            self.loop = asyncio.get_event_loop()

    def progress_hook(self, d):
        if self.cancellation_event.is_set():
            raise Exception("Download Cancelled by User")

        if d['status'] == 'finished':
            self.download_phase += 1
            # Send a transition message so UI doesn't appear stuck at 50%
            if self.download_phase == 1:
                try:
                    asyncio.run_coroutine_threadsafe(
                        self.websocket.send_text(json.dumps({
                            "status": "downloading",
                            "percent": "50",
                            "speed": "-",
                            "eta": "-",
                            "size": "-",
                            "custom_status": "Downloading audio…"
                        })), self.loop
                    )
                except Exception:
                    pass
            return

        if d['status'] == 'downloading':
            try:
                p_str = d.get('_percent_str', '0%').replace('%','')
                raw_percent = float(clean_text(p_str))
            except ValueError:
                raw_percent = 0

            # Seamless Progress Logic
            if self.download_phase == 0:
                seamless_percent = raw_percent / 2 
                status_msg = "Downloading…"
            else:
                seamless_percent = 50 + (raw_percent / 2)
                status_msg = "Processing / Converting…"

            if seamless_percent > 99:
                seamless_percent = 99

            speed = clean_text(d.get('_speed_str', '-'))
            eta = clean_text(d.get('_eta_str', '-'))

            total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate')
            size_str = "-"
            if total_bytes:
                size_str = f"{total_bytes / 1024 / 1024:.2f} MiB"

            data = {
                "status": "downloading",
                "filename": d.get('filename', 'Unknown'),
                "percent": f"{seamless_percent:.1f}",
                "eta": eta,
                "speed": speed,
                "size": size_str,
                "custom_status": status_msg 
            }
            
            try:
                asyncio.run_coroutine_threadsafe(
                    self.websocket.send_text(json.dumps(data)), self.loop
                )
            except Exception:
                pass

    def pp_hook(self, d):
        if self.cancellation_event.is_set():
            raise Exception("Download Cancelled by User")

        if d['status'] == 'started':
            # Animate progress from wherever it is to ~98% during post-processing
            status_msgs = {
                'FFmpegMergerPP': 'Merging video & audio…',
                'FFmpegExtractAudioPP': 'Converting audio…',
                'FFmpegVideoConvertorPP': 'Converting video…',
                'FFmpegMetadataPP': 'Writing metadata…',
                'EmbedThumbnailPP': 'Embedding thumbnail…',
            }
            pp_name = d.get('postprocessor', 'FFmpegMergerPP')
            status_msg = status_msgs.get(pp_name, 'Finalizing…')
            try:
                asyncio.run_coroutine_threadsafe(
                    self.websocket.send_text(json.dumps({
                        "status": "downloading",
                        "percent": "99",
                        "speed": "-",
                        "eta": "-",
                        "size": "-",
                        "custom_status": status_msg
                    })), self.loop
                )
            except Exception:
                pass

def write_cookies_txt(cookies_list):
    if not cookies_list:
        return None
    cookie_path = os.path.join(SCRIPT_DIR, "browser_cookies.txt")
    try:
        with open(cookie_path, "w", encoding="utf-8") as f:
            f.write("# Netscape HTTP Cookie File\n")
            for c in cookies_list:
                domain = c.get('domain', '')
                include_subdomains = "TRUE" if domain.startswith('.') else "FALSE"
                path = c.get('path', '/')
                secure = "TRUE" if c.get('secure') else "FALSE"
                expiration = str(int(c.get('expirationDate', 0))) if 'expirationDate' in c else "0"
                name = c.get('name', '')
                value = c.get('value', '')
                f.write(f"{domain}\t{include_subdomains}\t{path}\t{secure}\t{expiration}\t{name}\t{value}\n")
        return cookie_path
    except Exception:
        return None
# ─── URL classification helpers ────────────────────────────────────────────
# Sites that yt-dlp handles well → skip gallery-dl entirely
_YTDLP_DOMAINS = {
    'youtube.com', 'youtu.be', 'm.youtube.com',
    'twitch.tv', 'clips.twitch.tv',
    'twitter.com', 'x.com', 't.co',
    'tiktok.com', 'vm.tiktok.com',
    'vimeo.com', 'player.vimeo.com',
    'dailymotion.com', 'dai.ly',
    'reddit.com', 'v.redd.it', 'redd.it',
    'bilibili.com', 'b23.tv',
    'nico.ms', 'nicovideo.jp',
    'streamable.com',
    'facebook.com', 'fb.watch',
    'instagram.com',      # yt-dlp handles reels; gallery-dl handles posts
    'soundcloud.com',
    'bandcamp.com',
    'mixcloud.com',
    'rumble.com',
    'odysee.com', 'lbry.tv',
    'kick.com',
    'crunchyroll.com',
    'nebula.tv',
}

# Sites that are gallery/image platforms → skip yt-dlp, go straight to gallery-dl
_GALLERY_DOMAINS = {
    'pinterest.com', 'pin.it', 'pinterest.co.uk', 'pinterest.fr',
    'imgur.com', 'i.imgur.com',
    'flickr.com',
    'artstation.com',
    'deviantart.com',
    'danbooru.donmai.us', 'safebooru.org', 'gelbooru.com', 'rule34.xxx',
    'pixiv.net',
    'weibo.com',
    'tumblr.com',
    'giphy.com',
    'gfycat.com',
    '500px.com',
    'vsco.co',
    'unsplash.com',
    'pexels.com',
    'yandex.com',         # Yandex Images
    'e-hentai.org', 'exhentai.org',
    'konachan.com', 'yande.re',
}

# Image file extensions → direct fetch / gallery-dl
_IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.tiff', '.tif', '.svg', '.heic', '.heif'}

def _classify_url(url: str) -> str:
    """Return 'video', 'gallery', 'image_file', or 'unknown'."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url.lower())
        host = parsed.netloc.lstrip('www.')

        # Strip port if present
        host = host.split(':')[0]

        # Check for direct image file extension
        path = parsed.path.split('?')[0]
        ext = os.path.splitext(path)[1]
        if ext in _IMAGE_EXTS:
            return 'image_file'

        # Exact domain match or subdomain match
        for domain in _YTDLP_DOMAINS:
            if host == domain or host.endswith('.' + domain):
                return 'video'

        for domain in _GALLERY_DOMAINS:
            if host == domain or host.endswith('.' + domain):
                return 'gallery'

    except Exception:
        pass
    return 'unknown'

async def _try_ytdlp(url, cookies, websocket) -> bool:
    """Try yt-dlp. Returns True on success (sends formats_loaded), False on failure."""
    async def extract(use_cookies):
        ydl_opts = {
            'quiet': True, 'no_warnings': True, 'force_ipv4': True, 'noplaylist': True,
            'socket_timeout': 15,
            'ffmpeg_location': SCRIPT_DIR,
        }
        if use_cookies:
            cookie_file = write_cookies_txt(cookies)
            if cookie_file:
                ydl_opts['cookiefile'] = cookie_file
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, lambda: ydl.extract_info(url, download=False))

    try:
        info = None
        if cookies:
            try:
                info = await extract(use_cookies=True)
            except Exception:
                pass
        
        if not info or not any(f.get('height') and f.get('vcodec') != 'none' for f in info.get('formats', [])):
            info = await extract(use_cookies=False)

        formats = info.get('formats', [])
        resolutions = set()
        for f in formats:
            if f.get('height') and f.get('vcodec') != 'none':
                resolutions.add(f['height'])

        await websocket.send_text(json.dumps({
            "status": "formats_loaded",
            "resolutions": sorted(list(resolutions), reverse=True),
            "title": info.get('title', 'Unknown Title'),
            "default_path": get_last_download_path()
        }))
        return True
    except Exception as e:
        import traceback
        traceback.print_exc()
        return False

async def _try_gallery_dl(url, cookies, websocket) -> bool:
    """Try gallery-dl. Returns True on success (sends formats_loaded), False on failure."""
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(["gallery-dl", "-j", url], capture_output=True, text=True, timeout=20)
        )
        if result.returncode != 0 or not result.stdout.strip():
            return False

        data = []
        try:
            parsed_array = json.loads(result.stdout.strip())
            if isinstance(parsed_array, list):
                for item in parsed_array:
                    if isinstance(item, list) and len(item) > 1 and isinstance(item[1], dict):
                        data.append(item[1])
        except Exception:
            return False

        if not data:
            return False

        info = data[0]
        title = info.get("seo_title") or info.get("title") or info.get("author") or "Image/Gallery Download"
        await websocket.send_text(json.dumps({
            "status": "formats_loaded",
            "type": "image",
            "count": len(data),
            "resolutions": ["Original"],
            "title": title,
            "default_path": get_last_download_path()
        }))
        return True
    except Exception:
        return False

async def _try_direct_image(url, cookies, websocket) -> bool:
    """For direct image URLs: send formats_loaded immediately as an image type."""
    try:
        from urllib.parse import urlparse, unquote
        parsed = urlparse(url)
        raw_name = os.path.basename(parsed.path.split('?')[0])
        title = unquote(raw_name) or "image"
        await websocket.send_text(json.dumps({
            "status": "formats_loaded",
            "type": "image",
            "count": 1,
            "resolutions": ["Original"],
            "title": title,
            "default_path": get_last_download_path()
        }))
        return True
    except Exception:
        return False

async def get_video_formats(url, cookies, websocket):
    """Detect media type and route to the best downloader without unnecessary retries."""
    kind = _classify_url(url)

    # Send a status hint so the user sees something immediately
    await websocket.send_text(json.dumps({
        "status": "detecting",
        "message": "Detecting media type…"
    }))

    if kind == 'video':
        # yt-dlp only – no gallery-dl fallback needed for dedicated video platforms
        ok = await _try_ytdlp(url, cookies, websocket)
        if not ok:
            # Some video platforms also host images (e.g. Reddit) – try gallery-dl once
            ok = await _try_gallery_dl(url, cookies, websocket)
        if not ok:
            await websocket.send_text(json.dumps({"status": "error", "message": "Could not detect media (yt-dlp failed). The URL may be private or unsupported."}))

    elif kind == 'gallery':
        # gallery-dl first, then yt-dlp as a backup (e.g. Imgur video GIFs)
        ok = await _try_gallery_dl(url, cookies, websocket)
        if not ok:
            ok = await _try_ytdlp(url, cookies, websocket)
        if not ok:
            await websocket.send_text(json.dumps({"status": "error", "message": "Could not detect media (gallery-dl failed). The URL may be private or unsupported."}))

    elif kind == 'image_file':
        # Direct image file – no need to invoke any external tool for detection
        ok = await _try_direct_image(url, cookies, websocket)
        if not ok:
            # Fallback to gallery-dl just in case
            ok = await _try_gallery_dl(url, cookies, websocket)
        if not ok:
            await websocket.send_text(json.dumps({"status": "error", "message": "Could not load the image URL."}))

    else:
        # Unknown – try yt-dlp first, then gallery-dl
        ok = await _try_ytdlp(url, cookies, websocket)
        if not ok:
            ok = await _try_gallery_dl(url, cookies, websocket)
        if not ok:
            await websocket.send_text(json.dumps({"status": "error", "message": "Could not detect media. The URL may be a direct file, private, or unsupported."}))


async def run_downloader(url, quality, mode, format_ext, filename, save_path, cookies, websocket, cancellation_event):
    manager = DownloadManager(websocket, cancellation_event)
    
    if not os.path.exists(save_path):
        try:
            os.makedirs(save_path)
        except Exception as e:
            await websocket.send_text(json.dumps({"status": "error", "message": f"Cannot create folder: {e}"}))
            return

    # Save the selected path to settings.json
    save_last_download_path(save_path)

    if mode == "image":
        try:
            await websocket.send_text(json.dumps({
                "status": "downloading", 
                "percent": "-1", 
                "custom_status": "Downloading Image(s) via gallery-dl…",
                "speed": "-", "eta": "-", "size": "-"
            }))
            
            # Use gallery-dl for download
            cmd = ["gallery-dl", "-D", save_path, "-f", f"{filename}.{{extension}}", url]
            print(f"[IMAGE DL] Running: {cmd}")
            
            loop = asyncio.get_running_loop()
            
            def run_gallery_dl():
                # We use subprocess.run so we can check the return code and capture output
                return subprocess.run(cmd, capture_output=True, text=True)
            
            # Run gallery-dl in a separate thread so it doesn't block the async event loop
            task = loop.run_in_executor(None, run_gallery_dl)
            
            # Wait for completion or cancellation
            while not task.done():
                if cancellation_event.is_set():
                    task.cancel() # Note: this doesn't kill the underlying thread/process, but stops waiting
                    await websocket.send_text(json.dumps({"status": "stopped"}))
                    add_history_item(url, filename, filename, save_path, "stopped")
                    return
                await asyncio.sleep(0.1)
                
            try:
                result = task.result()
                returncode = result.returncode
                stdout_str = result.stdout
                stderr_str = result.stderr
            except asyncio.CancelledError:
                returncode = -1
                stdout_str = ""
                stderr_str = "Cancelled"
            
            if returncode == 0:
                await websocket.send_text(json.dumps({"status": "finished", "location": save_path}))
                add_history_item(url, filename, filename, save_path, "finished", "Image")
            else:
                err_msg = stderr_str.strip() if stderr_str else "gallery-dl failed"
                print(f"[IMAGE DL] gallery-dl failed (rc={returncode}): {err_msg}")
                await websocket.send_text(json.dumps({"status": "error", "message": err_msg or "gallery-dl failed"}))
                add_history_item(url, filename, filename, save_path, "failed")
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            await websocket.send_text(json.dumps({"status": "error", "message": str(e)}))
        return

    out_tmpl = os.path.join(save_path, f"{filename}.%(ext)s")

    if mode == "audio":
        fmt_str = "bestaudio/best"
    elif mode == "video":
        if quality == "best":
            fmt_str = "bestvideo/best"
        else:
            fmt_str = f"bestvideo[height<={quality}]/bestvideo/best"
    else:
        if quality == "best":
            fmt_str = "bestvideo+bestaudio/best"
        else:
            fmt_str = f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/bestvideo+bestaudio/best"

    ydl_opts = {
        'format': fmt_str,
        'outtmpl': out_tmpl,
        'progress_hooks': [manager.progress_hook],
        'postprocessor_hooks': [manager.pp_hook],
        'noplaylist': True,
        'force_ipv4': True,
        'socket_timeout': 15,
        'sleep_interval': 1, 
        'ffmpeg_location': SCRIPT_DIR,
        'overwrites': True,
        'writethumbnail': True,
    }

    # Initialize Post Processors
    postprocessors = []

    if mode == "audio":
        postprocessors.append({
            'key': 'FFmpegExtractAudio',
            'preferredcodec': format_ext,
        })
    else:
        ydl_opts['merge_output_format'] = format_ext

    # Add Metadata and Embed Thumbnail
    postprocessors.append({'key': 'FFmpegMetadata', 'add_chapters': True})
    postprocessors.append({'key': 'EmbedThumbnail'})

    ydl_opts['postprocessors'] = postprocessors

    try:
        await websocket.send_text(json.dumps({
            "status": "downloading", 
            "percent": "0", 
            "custom_status": "Starting Download…",
            "speed": "-", "eta": "-", "size": "-"
        }))

        async def do_download(use_cookies):
            opts = ydl_opts.copy()
            if use_cookies:
                cookie_file = write_cookies_txt(cookies)
                if cookie_file:
                    opts['cookiefile'] = cookie_file
            else:
                opts.pop('cookiefile', None)

            with yt_dlp.YoutubeDL(opts) as ydl:
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, lambda: ydl.download([url]))

        try:
            await do_download(use_cookies=bool(cookies))
        except Exception as e:
            if cookies:
                # Fallback to no cookies
                await do_download(use_cookies=False)
            else:
                raise e
        
        if not cancellation_event.is_set():
            await websocket.send_text(json.dumps({"status": "finished", "location": save_path}))
            
            # Retrieve size of finished file
            dest_file = os.path.join(save_path, f"{filename}.{format_ext}")
            size_str = "-"
            if os.path.exists(dest_file):
                size_bytes = os.path.getsize(dest_file)
                size_str = f"{size_bytes / 1024 / 1024:.2f} MiB"
            add_history_item(url, filename, f"{filename}.{format_ext}", save_path, "finished", size_str)

    except asyncio.CancelledError:
        try:
            await websocket.send_text(json.dumps({"status": "stopped"}))
        except Exception:
            pass
        add_history_item(url, filename, f"{filename}.{format_ext}", save_path, "stopped")
    except Exception as e:
        if cancellation_event.is_set():
            try:
                await websocket.send_text(json.dumps({"status": "stopped"}))
            except Exception:
                pass
            add_history_item(url, filename, f"{filename}.{format_ext}", save_path, "stopped")
        else:
            try:
                await websocket.send_text(json.dumps({"status": "error", "message": str(e)}))
            except Exception:
                pass
            add_history_item(url, filename, f"{filename}.{format_ext}", save_path, "failed")


# ─────────────────────────────────────────────────────────
#  Direct file download (non-yt-dlp: .exe, .zip, .pdf …)
# ─────────────────────────────────────────────────────────
def _format_bytes(n):
    """Human-readable file size."""
    if n < 1024:
        return f"{n} B"
    elif n < 1024 ** 2:
        return f"{n / 1024:.1f} KiB"
    elif n < 1024 ** 3:
        return f"{n / 1024 / 1024:.2f} MiB"
    else:
        return f"{n / 1024 / 1024 / 1024:.2f} GiB"


async def run_direct_download(url, filename, ext, save_path, websocket, cancellation_event):
    """Stream-download a file directly via HTTP and report progress over the websocket."""

    if not os.path.exists(save_path):
        try:
            os.makedirs(save_path)
        except Exception as e:
            await websocket.send_text(json.dumps({"status": "error", "message": f"Cannot create folder: {e}"}))
            return

    save_last_download_path(save_path)

    dest = os.path.join(save_path, f"{filename}.{ext}")
    tmp  = dest + ".part"

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=httpx.Timeout(30.0, read=300.0)) as client:
            async with client.stream("GET", url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }) as resp:
                resp.raise_for_status()

                total = int(resp.headers.get("content-length", 0)) or None
                downloaded = 0
                last_report = 0
                start_time = asyncio.get_event_loop().time()

                with open(tmp, "wb") as f:
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        if cancellation_event.is_set():
                            break
                        f.write(chunk)
                        downloaded += len(chunk)

                        now = asyncio.get_event_loop().time()
                        if now - last_report >= 0.35:
                            last_report = now
                            elapsed = now - start_time
                            speed = downloaded / elapsed if elapsed > 0 else 0

                            msg = {
                                "status": "direct_progress",
                                "size": _format_bytes(downloaded) + (f" / {_format_bytes(total)}" if total else ""),
                                "speed": _format_bytes(int(speed)) + "/s",
                            }
                            if total:
                                pct = min(downloaded / total * 100, 99.9)
                                msg["percent"] = round(pct, 1)
                            else:
                                msg["percent"] = -1

                            try:
                                await websocket.send_text(json.dumps(msg))
                            except Exception:
                                break

        if cancellation_event.is_set():
            # Clean up partial file
            if os.path.exists(tmp):
                os.remove(tmp)
            await websocket.send_text(json.dumps({"status": "stopped"}))
            add_history_item(url, filename, f"{filename}.{ext}", save_path, "stopped")
            return

        # Rename .part → final
        if os.path.exists(dest):
            os.remove(dest)
        os.rename(tmp, dest)

        size_str = _format_bytes(os.path.getsize(dest))
        await websocket.send_text(json.dumps({"status": "finished", "location": save_path}))
        add_history_item(url, filename, f"{filename}.{ext}", save_path, "finished", size_str)

    except asyncio.CancelledError:
        if os.path.exists(tmp):
            os.remove(tmp)
        try:
            await websocket.send_text(json.dumps({"status": "stopped"}))
        except Exception:
            pass
        add_history_item(url, filename, f"{filename}.{ext}", save_path, "stopped")

    except Exception as e:
        if os.path.exists(tmp):
            os.remove(tmp)
        if cancellation_event.is_set():
            try:
                await websocket.send_text(json.dumps({"status": "stopped"}))
            except Exception:
                pass
            add_history_item(url, filename, f"{filename}.{ext}", save_path, "stopped")
        else:
            try:
                await websocket.send_text(json.dumps({"status": "error", "message": str(e)}))
            except Exception:
                pass
            add_history_item(url, filename, f"{filename}.{ext}", save_path, "failed")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # If the background script is connecting for update checking, just keep it alive
    if websocket.query_params.get("client") == "extension_bg":
        try:
            while True:
                # Just keep connection open, wait for disconnect
                await websocket.receive_text()
        except WebSocketDisconnect:
            return

    current_download_task = None
    cancellation_event = asyncio.Event()
    
    try:
        while True:
            data = await websocket.receive_text()
            cmd = json.loads(data)
            action = cmd.get("action")

            if action == "get_formats":
                await get_video_formats(cmd.get("url"), cmd.get("cookies", []), websocket)

            elif action == "get_default_path":
                await websocket.send_text(json.dumps({
                    "status": "default_path",
                    "path": get_last_download_path()
                }))

            elif action == "check_file":
                format_ext = cmd.get("format", "mp4")
                filename = cmd.get("filename", "video")
                save_path = cmd.get("path", get_last_download_path())
                dest_file = os.path.join(save_path, f"{filename}.{format_ext}")
                exists = os.path.exists(dest_file)
                await websocket.send_text(json.dumps({
                    "status": "file_check_result",
                    "exists": exists
                }))

            elif action == "browse_folder":
                loop = asyncio.get_running_loop()
                path = await loop.run_in_executor(None, open_folder_dialog)
                if path:
                    save_last_download_path(path)
                await websocket.send_text(json.dumps({
                    "status": "path_selected",
                    "path": path if path else None
                }))

            elif action == "start":
                url = cmd.get("url")
                quality = cmd.get("quality", "best")
                mode = cmd.get("mode", "merge")
                format_ext = cmd.get("format", "mp4")
                filename = cmd.get("filename", "video")
                save_path = cmd.get("path", get_last_download_path())
                cookies = cmd.get("cookies", [])
                
                print(f"[START] url={url}, mode={mode}, format={format_ext}, quality={quality}, filename={filename}, path={save_path}")
                cancellation_event.clear()
                current_download_task = asyncio.create_task(
                    run_downloader(url, quality, mode, format_ext, filename, save_path, cookies, websocket, cancellation_event)
                )

            elif action == "direct_download":
                url = cmd.get("url")
                filename = cmd.get("filename", "download")
                ext = cmd.get("ext", "bin")
                save_path = cmd.get("path", get_last_download_path())

                cancellation_event.clear()
                current_download_task = asyncio.create_task(
                    run_direct_download(url, filename, ext, save_path, websocket, cancellation_event)
                )

            elif action == "stop":
                cancellation_event.set()
                if current_download_task and not current_download_task.done():
                    current_download_task.cancel()

            elif action == "get_history":
                history = load_history()
                await websocket.send_text(json.dumps({
                    "status": "history_data",
                    "history": history
                }))

            elif action == "delete_history_item":
                item_id = cmd.get("id")
                history = load_history()
                history = [item for item in history if item.get("id") != item_id]
                save_history(history)
                await websocket.send_text(json.dumps({
                    "status": "history_data",
                    "history": history
                }))

            elif action == "clear_history":
                save_history([])
                await websocket.send_text(json.dumps({
                    "status": "history_data",
                    "history": []
                }))

            elif action == "open_folder":
                path = cmd.get("path")
                if path and os.path.exists(path):
                    try:
                        os.startfile(path)
                    except Exception as e:
                        print(f"Error opening folder {path}: {e}")
                
    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_config=None)