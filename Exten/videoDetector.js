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

        // Use the existing parent — don't wrap in a new div (breaks layouts)
        let wrap = video.parentElement;
        if (!wrap) return;
        const pos = getComputedStyle(wrap).position;
        if (!['relative', 'absolute', 'fixed', 'sticky'].includes(pos)) {
            wrap.style.position = 'relative';
        }
        wrap.classList.add('mediavar-video-wrap');

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
        document.querySelectorAll('video').forEach(v => addVideoButton(v));
    }

    // ── Thumbnail overlay button (for img-based thumbnails) ──────────
    const THUMB_BTN_ATTR = 'data-mediavar-thumb-btn';

    // YouTube renderer selectors that contain video thumbnails
    const YT_RENDERERS = [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-reel-item-renderer',
        'ytd-playlist-video-renderer',
    ].join(', ');

    function addThumbnailButton(renderer) {
        if (renderer.hasAttribute(THUMB_BTN_ATTR)) return;

        // Must contain a link to a video
        const link = renderer.querySelector(
            'a[href*="/watch"], a[href*="/shorts/"]'
        );
        if (!link) return;

        // Find the thumbnail container (the <a> wrapping the <img>)
        const thumbLink = renderer.querySelector('a#thumbnail, a.ytd-thumbnail');
        const thumbTarget = thumbLink || link;

        // Ensure the thumbnail container is positioned
        const pos = getComputedStyle(thumbTarget).position;
        if (!['relative', 'absolute', 'fixed', 'sticky'].includes(pos)) {
            thumbTarget.style.position = 'relative';
        }

        renderer.setAttribute(THUMB_BTN_ATTR, '1');

        const btn = document.createElement('button');
        btn.className = 'mediavar-dl-btn mediavar-thumb-dl-btn';
        btn.title = 'Download with MediaVal';
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
        `;

        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            const href = link.getAttribute('href');
            const fullUrl = new URL(href, window.location.origin).href;

            if (host.style.display === 'none') {
                host.style.display = 'block';
                connectWS();
            }
            urlInput.value = fullUrl;
            resetUI(true);
            setTimeout(fetchFormats, 300);
        });

        thumbTarget.appendChild(btn);
    }

    // ── Generic video thumbnail detector (Pinterest, etc.) ───────────
    // Finds video thumbnails on any site by detecting duration badges
    // (text like "0:11", "3:45", "1:23:45") near links with images.
    const GENERIC_THUMB_ATTR = 'data-mediavar-generic-thumb';
    const durationRegex = /^\s*\d{1,2}:\d{2}(?::\d{2})?\s*$/;

    function addGenericVideoThumb(el) {
        // el is an element whose textContent matches a duration pattern
        // Walk up to find the closest link or card container
        const card = el.closest('a[href], [role="listitem"], [data-test-id], article, li, div[class]');
        if (!card || card.hasAttribute(GENERIC_THUMB_ATTR)) return;

        // Skip if already handled by YouTube renderer logic
        if (card.hasAttribute(THUMB_BTN_ATTR)) return;
        if (card.closest(YT_RENDERERS)) return;

        // Find the link to the video page
        let link = card.closest('a[href]');
        if (!link) link = card.querySelector('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href === '#') return;

        // Find the best visual target to place the button on
        // Prefer the element that contains an <img> (the actual thumbnail)
        let thumbTarget = link;
        const imgContainer = link.querySelector('img')?.parentElement;
        if (imgContainer && imgContainer !== link) {
            thumbTarget = imgContainer.closest('a') || imgContainer;
        }

        card.setAttribute(GENERIC_THUMB_ATTR, '1');

        // Ensure positioned
        const pos = getComputedStyle(thumbTarget).position;
        if (!['relative', 'absolute', 'fixed', 'sticky'].includes(pos)) {
            thumbTarget.style.position = 'relative';
        }

        const btn = document.createElement('button');
        btn.className = 'mediavar-dl-btn mediavar-thumb-dl-btn';
        btn.title = 'Download with MediaVal';
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
        `;

        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            const fullUrl = new URL(href, window.location.origin).href;

            if (host.style.display === 'none') {
                host.style.display = 'block';
                connectWS();
            }
            urlInput.value = fullUrl;
            resetUI(true);
            setTimeout(fetchFormats, 300);
        });

        thumbTarget.appendChild(btn);
    }

    function scanGenericVideoThumbs() {
        // Use a TreeWalker to find text nodes matching duration patterns
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode(node) {
                    // Small elements likely to be duration badges
                    if (node.children.length === 0 &&
                        node.textContent &&
                        durationRegex.test(node.textContent) &&
                        !node.closest('[data-mediavar-generic-thumb]') &&
                        !node.closest(YT_RENDERERS)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        const badges = [];
        while (walker.nextNode()) badges.push(walker.currentNode);
        badges.forEach(addGenericVideoThumb);
    }

    function scanThumbnails() {
        document.querySelectorAll(YT_RENDERERS).forEach(addThumbnailButton);
        scanGenericVideoThumbs();
    }

    scanVideos();
    scanThumbnails();

    // Catch dynamically added videos and thumbnails
    const obs = new MutationObserver(mutations => {
        let hasNewNodes = false;
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                hasNewNodes = true;
                // Video elements
                if (node.tagName === 'VIDEO') addVideoButton(node);
                if (node.querySelectorAll) {
                    node.querySelectorAll('video').forEach(addVideoButton);
                    // YouTube thumbnail renderers
                    if (node.matches && node.matches(YT_RENDERERS)) {
                        addThumbnailButton(node);
                    }
                    node.querySelectorAll(YT_RENDERERS).forEach(addThumbnailButton);
                }
            });
        });
        // Debounced generic scan when new content appears
        if (hasNewNodes) {
            clearTimeout(obs._genericTimer);
            obs._genericTimer = setTimeout(scanGenericVideoThumbs, 300);
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Catch videos at various lifecycle stages
    ['canplay', 'play', 'loadeddata', 'loadedmetadata'].forEach(evt => {
        document.addEventListener(evt, e => {
            if (e.target && e.target.tagName === 'VIDEO') addVideoButton(e.target);
        }, true);
    });

    // Periodic re-scan for lazy-loaded videos (Pinterest, etc.)
    let rescanCount = 0;
    const rescanInterval = setInterval(() => {
        scanVideos();
        scanThumbnails();
        rescanCount++;
        if (rescanCount >= 20) clearInterval(rescanInterval); // Stop after ~20s
    }, 1000);
}