import os
import sys
import subprocess
import venv
import shutil
import time
from pathlib import Path

# --- CONFIGURATION ---
ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / ".venv"
REQ_FILE = ROOT / "requirements.txt"
DLP_BAT = ROOT / "dlp_server.bat"            # the file to copy to startup and run
CREATE_NO_WINDOW = 0x08000000                # to hide windows if desired (not used when launching .bat)
VERBOSE = True

def log(*args, **kwargs):
    if VERBOSE:
        print("[*]", *args, **kwargs)

def error(*args, **kwargs):
    print("[!]", *args, **kwargs, file=sys.stderr)

def is_windows():
    return sys.platform.startswith("win")

def get_venv_python(venv_dir: Path) -> Path:
    if is_windows():
        return venv_dir / "Scripts" / "python.exe"
    return venv_dir / "bin" / "python"

def ensure_venv():
    """Create virtual environment if missing. Returns path to python inside venv."""
    if not VENV_DIR.exists():
        log(f".venv not found. Creating virtual environment at {VENV_DIR} ...")
        venv.create(VENV_DIR, with_pip=True)
        log("Virtual environment created.")
    else:
        log(".venv already exists, skipping creation.")
    venv_python = get_venv_python(VENV_DIR)
    if not venv_python.exists():
        raise FileNotFoundError(f"Python binary not found in venv: {venv_python}")
    return venv_python

def parse_requirements(req_path: Path):
    """Parse requirements.txt into list of requirement strings (ignores comments/empty lines)."""
    if not req_path.exists():
        log(f"{req_path} not found. No requirements to check.")
        return []
    reqs = []
    with req_path.open("r", encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            reqs.append(s)
    return reqs

def check_missing_packages(venv_python: Path, requirements):
    """
    Use pip to check installed packages inside the venv.
    Returns list of requirement strings that appear missing or need upgrade.
    This works by asking pip to check --disable-pip-version-check freeze and comparing names.
    """
    if not requirements:
        return []
    # Get installed packages in venv
    try:
        proc = subprocess.run([str(venv_python), "-m", "pip", "freeze"], capture_output=True, text=True, check=True)
        installed = proc.stdout.splitlines()
        installed_map = {}
        for item in installed:
            # pip freeze gives lines like pkg==1.2.3 or pkg @ file://..., keep left side lowercase name
            if "==" in item:
                name, ver = item.split("==", 1)
                installed_map[name.lower()] = item.strip()
            elif "@" in item:
                name = item.split("@",1)[0].strip()
                installed_map[name.lower()] = item.strip()
            else:
                # fallback
                installed_map[item.lower()] = item.strip()
    except subprocess.CalledProcessError as e:
        error("Failed to query pip freeze:", e)
        # if we cannot get pip freeze, treat all as missing to force install
        return requirements[:]

    missing = []
    for req in requirements:
        # compare by package name (handle 'pkg==1.2.3' and extras like 'pkg[extra]==1.2.3')
        # We'll take the part before any comparison operator or extras
        req_name = req.split(";",1)[0].strip()  # strip environment markers
        for op in ["==", ">=", "<=", "~=", ">", "<", "!="]:
            if op in req_name:
                req_name = req_name.split(op,1)[0].strip()
        # strip extras
        if "[" in req_name:
            req_name = req_name.split("[",1)[0].strip()
        if req_name.lower() not in installed_map:
            missing.append(req)
        else:
            # optional: we could check versions, but pip will handle upgrades if version mismatch
            pass
    return missing

def install_requirements(venv_python: Path, req_path: Path) -> bool:
    """Install requirements.txt into the venv. Returns True on success."""
    if not req_path.exists():
        log("No requirements.txt to install.")
        return True
    cmd = [str(venv_python), "-m", "pip", "install", "--upgrade", "-r", str(req_path)]
    log("Installing requirements using:", " ".join(cmd))
    try:
        subprocess.run(cmd, check=True)
        log("Requirements installed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        error("pip install failed:", e)
        # Try a retry with cache purge
        try:
            log("Retrying after pip cache purge...")
            subprocess.run([str(venv_python), "-m", "pip", "cache", "purge"], check=True)
            subprocess.run(cmd, check=True)
            log("Requirements installed on retry.")
            return True
        except subprocess.CalledProcessError as e2:
            error("Retry failed. Aborting installation step.", e2)
            return False

def get_windows_startup_folder(all_users=False):
    if all_users:
        # All users startup (requires admin privileges)
        return Path(os.environ.get("PROGRAMDATA", "C:\\ProgramData")) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "StartUp"
    # per-user startup
    appdata = os.environ.get("APPDATA")
    if not appdata:
        raise EnvironmentError("APPDATA environment variable not set; cannot find startup folder.")
    return Path(appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"

def copy_to_startup(src: Path):
    """Copy the given file (src) to the OS-specific startup folder. Returns path copied to or None on failure."""
    if not src.exists():
        error("Source file to copy to startup does not exist:", src)
        return None

    if is_windows():
        # Try per-user startup first
        try:
            dest_folder = get_windows_startup_folder(all_users=False)
            dest_folder.mkdir(parents=True, exist_ok=True)
            dest = dest_folder / src.name
            shutil.copy2(src, dest)
            log(f"Copied {src.name} to per-user Startup: {dest}")
            return dest
        except Exception as e:
            error("Failed to copy to per-user startup:", e)
            # Attempt all-users startup (requires admin)
            try:
                dest_folder = get_windows_startup_folder(all_users=True)
                dest_folder.mkdir(parents=True, exist_ok=True)
                dest = dest_folder / src.name
                shutil.copy2(src, dest)
                log(f"Copied {src.name} to all-users Startup: {dest}")
                return dest
            except Exception as e2:
                error("Failed to copy to all-users startup:", e2)
                return None
    else:
        # Linux / macOS fallback: create a .desktop autostart entry under ~/.config/autostart
        try:
            autostart_dir = Path.home() / ".config" / "autostart"
            autostart_dir.mkdir(parents=True, exist_ok=True)
            desktop_path = autostart_dir / f"{src.stem}.desktop"
            # Build a simple .desktop file that launches the .bat (via wine) or a wrapper shell script
            desktop_content = f"""[Desktop Entry]
Type=Application
Name={src.stem}
Exec={str(src)}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
"""
            desktop_path.write_text(desktop_content, encoding="utf-8")
            log(f"Created autostart .desktop file: {desktop_path}")
            return desktop_path
        except Exception as e:
            error("Failed to create autostart entry on non-Windows OS:", e)
            return None

def run_bat(path: Path):
    """Run the .bat file. Non-blocking; returns Popen object (or None on failure)."""
    if not path or not Path(path).exists():
        error("Can't run: path missing or doesn't exist:", path)
        return None
    try:
        if is_windows():
            # On Windows, .bat needs to be run via the shell. Start in a new console window.
            # Use 'start' command to create a new window (works in cmd.exe)
            cmd = f'start "" "{str(path)}"'
            proc = subprocess.Popen(cmd, shell=True)  # non-blocking
            log(f"Launched {path} via start.")
            return proc
        else:
            # On *nix, try to execute it directly (it may be a shell script)
            proc = subprocess.Popen([str(path)], shell=False)
            log(f"Launched {path}. PID: {proc.pid}")
            return proc
    except Exception as e:
        error("Failed to launch", path, ":", e)
        return None

def main():
    log("Starting setup_and_run helper...")

    # Step 1: Ensure venv and get python inside it
    try:
        venv_python = ensure_venv()
    except Exception as e:
        error("Failed to ensure venv:", e)
        return 1

    # Step 2: Parse requirements and check installed packages
    requirements = parse_requirements(REQ_FILE)
    if requirements:
        missing = check_missing_packages(venv_python, requirements)
        if missing:
            log("Missing/outdated packages detected (will install):", missing)
            ok = install_requirements(venv_python, REQ_FILE)
            if not ok:
                error("Failed to install required packages. Exiting.")
                return 2
        else:
            log("All required packages are already installed in the venv.")
    else:
        log("No requirements to check. Continuing.")

    # Step 3: Copy dlp_server.bat to startup
    startup_dest = copy_to_startup(DLP_BAT)
    if not startup_dest:
        error("Warning: Failed to install dlp_server.bat into startup. You may need to copy it manually.")
    else:
        log("Startup installation successful. File located at:", startup_dest)

    # Step 4: Run dlp_server.bat
    proc = run_bat(DLP_BAT)
    if proc:
        log("dlp_server.bat launched successfully. Exiting helper (server runs separately).")
        return 0
    else:
        error("Failed to launch dlp_server.bat.")
        return 3

if __name__ == "__main__":
    rc = main()
    sys.exit(rc)