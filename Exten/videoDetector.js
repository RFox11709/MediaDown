import { videoOverlayStylesText } from './styles.js';

const VIDEO_BTN_ATTR = 'data-mediavar-btn';
const LINK_LOGGED_ATTR = 'data-mediavar-link-logged';

// Cache of video element → resolved URL (populated by hover tracker)
const hoverUrlCache = new WeakMap();

export function initVideoDetector(host, urlInput, resetUI, fetchFormats, connectWS) {
    // Append layout style
    const videoOverlayStyle = document.createElement('style');
    videoOverlayStyle.textContent = videoOverlayStylesText;
    document.head.appendChild(videoOverlayStyle);

    // ── Hover-based URL tracker ──────────────────────────────────────
    // Proactively captures real video URLs from YouTube link elements
    // so they're available when the download button is clicked.
    let lastHoveredUrl = null;

    document.addEventListener('mouseover', (e) => {
        const videoLink = e.target.closest(
            'a[href*="/watch"], a[href*="/shorts/"], a[href*="/video/"]'
        );
        if (!videoLink) return;

        const href = videoLink.getAttribute('href');
        if (!href) return;

        const fullUrl = new URL(href, window.location.origin).href;
        lastHoveredUrl = fullUrl;

        // Mark so we don't re-process
        if (!videoLink.hasAttribute(LINK_LOGGED_ATTR)) {
            videoLink.setAttribute(LINK_LOGGED_ATTR, '1');
        }

        // Associate with any video element inside this link's container
        const container = videoLink.closest(
            'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ' +
            'ytd-compact-video-renderer, ytd-reel-item-renderer, ' +
            '[data-video-id], .video-card, .video-item, article'
        );
        if (container) {
            const videos = container.querySelectorAll('video');
            videos.forEach(v => hoverUrlCache.set(v, fullUrl));
        }
    });

    // ── Alt+Click shortcut on video links ────────────────────────────
    // Hold Alt and click a video thumbnail/link to download directly
    document.addEventListener('click', (e) => {
        if (!e.altKey) return;

        const videoLink = e.target.closest(
            'a[href*="/watch"], a[href*="/shorts/"], a[href*="/video/"]'
        );
        if (!videoLink) return;

        e.preventDefault();
        e.stopPropagation();

        const href = videoLink.getAttribute('href');
        if (!href) return;

        const fullUrl = new URL(href, window.location.origin).href;

        // Open the panel and start fetching
        if (host.style.display === 'none') {
            host.style.display = 'block';
            connectWS();
        }
        urlInput.value = fullUrl;
        resetUI(true);
        setTimeout(fetchFormats, 300);
    }, true);

    // ── Video overlay button ─────────────────────────────────────────
    function addVideoButton(video) {
        if (video.hasAttribute(VIDEO_BTN_ATTR)) return;
        video.setAttribute(VIDEO_BTN_ATTR, '1');

        // Wrap video if not already in a positioned parent
        let wrap = video.parentElement;
        if (!wrap || !['relative', 'absolute', 'fixed', 'sticky'].includes(getComputedStyle(wrap).position)) {
            wrap = document.createElement('div');
            wrap.className = 'mediavar-video-wrap';
            video.parentNode.insertBefore(wrap, video);
            wrap.appendChild(video);
        } else {
            wrap.classList.add('mediavar-video-wrap');
        }

        const btn = document.createElement('button');
        btn.className = 'mediavar-dl-btn';
        btn.title = 'Download with MediaVal';
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
        `;

        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            const targetUrl = findRealVideoUrl(video);

            // Open MediaVal UI and populate URL
            if (host.style.display === 'none') {
                host.style.display = 'block';
                connectWS();
            }
            urlInput.value = targetUrl;
            resetUI(true);
            setTimeout(fetchFormats, 300);
        });

        wrap.appendChild(btn);
    }

    function findRealVideoUrl(vid) {
        // 1. Check hover cache first (most reliable for YouTube)
        const cached = hoverUrlCache.get(vid);
        if (cached) return cached;

        // 2. Check if the last hovered URL is still contextually relevant
        //    (user hovered a link then clicked the overlay button nearby)
        if (lastHoveredUrl) {
            const container = vid.closest(
                'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ' +
                'ytd-compact-video-renderer, ytd-reel-item-renderer, ' +
                '[data-video-id], .video-card, .video-item, article'
            );
            if (container) {
                const link = container.querySelector(
                    'a[href*="/watch"], a[href*="/shorts/"], a[href*="/video/"]'
                );
                if (link) {
                    const linkUrl = new URL(link.getAttribute('href'), window.location.origin).href;
                    if (linkUrl === lastHoveredUrl) return lastHoveredUrl;
                }
            }
        }

        // 3. Direct src (non-blob)
        const src = vid.currentSrc || vid.src || vid.querySelector('source')?.src || '';
        if (src && !src.startsWith('blob:')) return src;

        // 4. Closest anchor
        const closestA = vid.closest('a[href]');
        if (closestA && closestA.href) return closestA.href;

        // 5. YouTube-specific container lookup
        const ytContainer = vid.closest(
            'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ' +
            'ytd-compact-video-renderer, ytd-reel-item-renderer'
        );
        if (ytContainer) {
            const ytLink = ytContainer.querySelector('a#thumbnail, a#video-title, a');
            if (ytLink && ytLink.href) return ytLink.href;
        }

        // 6. Walk up DOM looking for a video link
        let parent = vid.parentElement;
        while (parent && parent !== document.body) {
            const a = parent.querySelector(
                'a[href*="/watch"], a[href*="/shorts/"], a[href*="/video/"]'
            );
            if (a && a.href) return a.href;
            parent = parent.parentElement;
        }

        // 7. Fallback: current page URL
        return window.location.href;
    }

    function scanVideos() {
        document.querySelectorAll('video').forEach(v => {
            if (v.readyState >= 1 || v.currentSrc || v.src)
                addVideoButton(v);
        });
    }

    scanVideos();

    // Catch dynamically added videos
    const obs = new MutationObserver(mutations => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.tagName === 'VIDEO') addVideoButton(node);
                if (node.querySelectorAll) node.querySelectorAll('video').forEach(addVideoButton);
            });
        });
    });
    obs.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('canplay', e => {
        if (e.target && e.target.tagName === 'VIDEO') addVideoButton(e.target);
    }, true);
}