import { setupUI } from './ui.js';
import * as helpers from './helpers.js';
import { renderHistory } from './history.js';
import { initVideoDetector } from './videoDetector.js';

// Initialize UI structure inside Shadow DOM
const { host, shadow } = setupUI();

// Element references
const urlInput = shadow.getElementById('urlInput');
const filenameInput = shadow.getElementById('filenameInput');
const pathInput = shadow.getElementById('pathInput');
const browseBtn = shadow.getElementById('browseBtn');
const loadBtn = shadow.getElementById('loadBtn');
const startBtn = shadow.getElementById('startBtn');
const stopBtn = shadow.getElementById('stopBtn');
const formatSelect = shadow.getElementById('formatSelect');
const qualitySelect = shadow.getElementById('qualitySelect');
const qualityCol = shadow.getElementById('qualityCol');
const dlControls = shadow.getElementById('downloadControls');
const resetLink = shadow.getElementById('resetLink');
const fetchStatus = shadow.getElementById('fetch-status');
const statusText = shadow.getElementById('status-text');
const progressBar = shadow.getElementById('progressBar');
const percentVal = shadow.getElementById('percent-val');
const progressPhase = shadow.getElementById('progress-phase');
const statusArea = shadow.getElementById('status-area');
const connBadge = shadow.getElementById('conn-badge');
const closeBtn = shadow.getElementById('closeBtn');
const mainPanel = shadow.getElementById('mainPanel');
const historyPanel = shadow.getElementById('historyPanel');
const historyBtn = shadow.getElementById('historyBtn');
const historyList = shadow.getElementById('historyList');
const clearHistBtn = shadow.getElementById('clearHistBtn');
const backBtn = shadow.getElementById('backBtn');
const mediaOptions = shadow.getElementById('mediaOptions');
const directOptions = shadow.getElementById('directOptions');
const dlTypeBadge = shadow.getElementById('download-type-badge');
const dlTypeText = shadow.getElementById('download-type-text');
const directFmtSel = shadow.getElementById('directFormatSelect');
const modeTabs = shadow.querySelectorAll('.mode-tab');

const interceptPrompt = shadow.getElementById('interceptPrompt');
const interceptFilename = shadow.getElementById('interceptFilename');
const interceptBtnYes = shadow.getElementById('interceptBtnYes');
const interceptBtnNo = shadow.getElementById('interceptBtnNo');

// ──────────────────────────── STATE ────────────────────────────────
let socket = null;
let isDirectDownload = false;
let currentMode = 'merge';
let retryDelay = 2000;
let retryTimer = null;
let lastResolutions = [];

const videoFormats = ['mp4', 'mkv', 'webm', 'avi', 'mov'];
const audioFormats = ['mp3', 'm4a', 'opus', 'flac', 'wav', 'aac'];

// Prevent keyboard capture leaks
[urlInput, filenameInput, pathInput].forEach(el => {
    ['keydown', 'keyup', 'keypress'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation()));
});

// ──────────────────────────── UI HELPERS ───────────────────────────
function setFetchStatus(msg, cls = '') {
    fetchStatus.textContent = msg;
    fetchStatus.className = cls;
}

function setStatusText(msg, cls = '') {
    statusText.textContent = msg;
    statusText.className = cls;
}

function updateModeFormatOptions() {
    formatSelect.innerHTML = '';
    qualitySelect.innerHTML = '';

    if (currentMode === 'image') {
        const oFmt = document.createElement('option');
        oFmt.value = 'auto'; oFmt.textContent = 'Original Format';
        formatSelect.appendChild(oFmt);

        const oQual = document.createElement('option');
        oQual.value = 'best'; oQual.textContent = 'Original Quality';
        qualitySelect.appendChild(oQual);

        qualityCol.classList.remove('disabled');
        return;
    }

    const formats = currentMode === 'audio' ? audioFormats : videoFormats;
    formats.forEach(ext => {
        const o = document.createElement('option');
        o.value = ext; o.textContent = '.' + ext.toUpperCase();
        formatSelect.appendChild(o);
    });

    const bestOpt = document.createElement('option');
    bestOpt.value = 'best'; bestOpt.textContent = 'Best Quality';
    qualitySelect.appendChild(bestOpt);

    lastResolutions.forEach(res => {
        const o = document.createElement('option');
        o.value = res; o.textContent = res + 'p';
        qualitySelect.appendChild(o);
    });

    qualityCol.classList.toggle('disabled', currentMode === 'audio');
}

function showDownloadControls(direct = false) {
    isDirectDownload = direct;
    dlControls.style.display = 'flex';
    loadBtn.style.display = 'none';
    mediaOptions.style.display = direct ? 'none' : 'block';
    directOptions.style.display = direct ? 'block' : 'none';
    dlTypeBadge.style.display = direct ? 'flex' : 'none';
    statusArea.style.display = 'none';
    stopBtn.style.display = 'none';
    startBtn.style.display = 'flex';
    startBtn.disabled = false;
    startBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download Now`;
}

function resetUI(full = true) {
    dlControls.style.display = 'none';
    loadBtn.style.display = 'flex';
    loadBtn.disabled = false;
    loadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Fetch &amp; Detect`;
    stopBtn.style.display = 'none';
    statusArea.style.display = 'none';
    progressBar.style.width = '0%';
    progressBar.classList.remove('indeterminate');
    percentVal.textContent = '0%';
    setStatusText('Ready');
    ['stat-size', 'stat-speed', 'stat-eta'].forEach(id => shadow.getElementById(id).textContent = '—');
    if (full) setFetchStatus('');
}

// ──────────────────────────── ACTIONS ──────────────────────────────
modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        modeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentMode = tab.dataset.mode;
        updateModeFormatOptions();
    });
});

browseBtn.addEventListener('click', () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    browseBtn.disabled = true;
    socket.send(JSON.stringify({ action: 'browse_folder' }));
});

resetLink.addEventListener('click', () => {
    if (stopBtn.style.display === 'flex') return;
    urlInput.value = window.location.href;
    resetUI();
});

urlInput.addEventListener('input', () => {
    if (dlControls.style.display !== 'none') resetUI(false);
});

closeBtn.addEventListener('click', () => { host.style.display = 'none'; });

// ──────────────────────────── HISTORY ──────────────────────────────
function showHistory() {
    mainPanel.style.display = 'none';
    historyPanel.style.display = 'flex';
    historyBtn.classList.add('active');
    if (socket && socket.readyState === WebSocket.OPEN) {
        historyList.innerHTML = '<div class="no-history">Loading…</div>';
        socket.send(JSON.stringify({ action: 'get_history' }));
    } else {
        historyList.innerHTML = '<div class="no-history" style="color:#f87171">Server offline</div>';
    }
}

function hideHistory() {
    historyPanel.style.display = 'none';
    mainPanel.style.display = 'flex';
    historyBtn.classList.remove('active');
}

historyBtn.addEventListener('click', () => historyPanel.style.display === 'flex' ? hideHistory() : showHistory());
backBtn.addEventListener('click', hideHistory);
clearHistBtn.addEventListener('click', () => {
    if (confirm('Clear all download history?')) {
        socket.send(JSON.stringify({ action: 'clear_history' }));
    }
});

// ──────────────────────────── FETCHING ─────────────────────────────
function fetchFormats() {
    let url = urlInput.value.trim();
    if (!url) { setFetchStatus('Please enter a URL', 'error'); return; }

    if (url.startsWith('blob:')) {
        url = window.location.href;
        urlInput.value = url;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        setFetchStatus('Server not connected. Retrying…', 'error');
        connectWS();
        return;
    }

    if (helpers.detectDirectDownload(url)) {
        const ext = helpers.getExtFromUrl(url);
        const name = helpers.getFilenameFromUrl(url);
        filenameInput.value = helpers.sanitize(name);
        pathInput.value = pathInput.value || '';

        const opt = [...directFmtSel.options].find(o => o.value === ext);
        if (opt) directFmtSel.value = ext;
        else directFmtSel.value = 'auto';

        dlTypeText.textContent = `Direct Download  (.${ext})`;
        socket.send(JSON.stringify({ action: 'get_default_path' }));
        showDownloadControls(true);
        setFetchStatus('');
        return;
    }

    setFetchStatus('Fetching formats…');
    loadBtn.disabled = true;
    loadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"/></svg> Fetching…`;

    try {
        const domain = new URL(url).hostname.replace(/^www\./, '');
        chrome.runtime.sendMessage({ action: 'get_cookies', domain: domain }, (response) => {
            const cookies = (response && response.cookies) ? response.cookies : [];
            socket.send(JSON.stringify({ action: 'get_formats', url, cookies }));
        });
    } catch (e) {
        socket.send(JSON.stringify({ action: 'get_formats', url, cookies: [] }));
    }
}

loadBtn.addEventListener('click', fetchFormats);

// ──────────────────────────── START DOWNLOAD ───────────────────────
startBtn.addEventListener('click', () => {
    let url = urlInput.value.trim();
    const filename = helpers.sanitize(filenameInput.value.trim()) || 'download';
    const path = pathInput.value.trim();
    if (!path) { setFetchStatus('Please select a destination folder', 'error'); return; }

    if (url.startsWith('blob:')) {
        url = window.location.href;
        urlInput.value = url;
    }

    if (isDirectDownload) {
        let ext = directFmtSel.value;
        if (ext === 'auto') ext = helpers.getExtFromUrl(url);
        socket.send(JSON.stringify({
            action: 'direct_download', url, filename, path, ext
        }));
    } else {
        socket.send(JSON.stringify({
            action: 'check_file',
            format: formatSelect.value,
            filename, path
        }));
    }
    statusArea.style.display = 'flex';
    setStatusText('Checking…');
});

stopBtn.addEventListener('click', () => {
    stopBtn.disabled = true;
    stopBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Stopping…`;
    socket.send(JSON.stringify({ action: 'stop' }));
});

// ──────────────────────────── WEBSOCKET ────────────────────────────
function connectWS() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    connBadge.textContent = '● Connecting';
    connBadge.className = 'connecting';

    socket = new WebSocket('ws://127.0.0.1:8000/ws');

    socket.onopen = () => {
        connBadge.textContent = '● Online';
        connBadge.className = 'connected';
        retryDelay = 2000;
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        socket.send(JSON.stringify({ action: 'get_default_path' }));
    };

    socket.onclose = () => {
        connBadge.textContent = '● Offline';
        connBadge.className = '';
        retryTimer = setTimeout(connectWS, retryDelay);
        retryDelay = Math.min(retryDelay * 1.5, 30000);
    };

    socket.onerror = () => socket.close();

    socket.onmessage = e => {
        let data;
        try { data = JSON.parse(e.data); } catch { return; }

        switch (data.status) {
            case 'detecting':
                setFetchStatus(data.message || 'Detecting media type…');
                break;

            case 'default_path':
                if (data.path && !pathInput.value) pathInput.value = data.path;
                break;

            case 'path_selected':
                browseBtn.disabled = false;
                if (data.path) {
                    pathInput.value = data.path;
                    setFetchStatus('Folder updated', 'success');
                } else {
                    setFetchStatus('Selection cancelled');
                }
                setTimeout(() => setFetchStatus(''), 2000);
                break;

            case 'formats_loaded':
                qualitySelect.innerHTML = '';
                formatSelect.innerHTML = '';
                
                shadow.getElementById('modeFieldGroup').style.display = 'flex';

                if (data.type === 'image') {
                    // Image/Gallery mode
                    currentMode = 'image';
                    
                    // Hide video/audio tabs, show only image tab
                    modeTabs.forEach(t => {
                        if (t.dataset.mode === 'image') {
                            t.style.display = 'block';
                        } else {
                            t.style.display = 'none';
                        }
                    });
                    
                    filenameInput.value = helpers.sanitize(data.title || 'image');
                    updateModeFormatOptions();
                    // Show some visual indicator for gallery if count > 1
                    if (data.count > 1) {
                        setFetchStatus(`Found ${data.count} images in gallery`, 'success');
                    } else {
                        setFetchStatus('');
                    }
                } else {
                    // Video/Audio mode
                    const activeTab = shadow.querySelector('.mode-tab.active');
                    currentMode = (activeTab && activeTab.dataset.mode !== 'image') ? activeTab.dataset.mode : 'merge';
                    
                    // Show all tabs so the user can manually switch to Image/Gallery if they want
                    modeTabs.forEach(t => {
                        t.style.display = 'block';
                    });
                    
                    lastResolutions = data.resolutions || [];
                    filenameInput.value = helpers.sanitize(data.title || 'video');
                    updateModeFormatOptions();
                    setFetchStatus('');
                }
                
                if (data.default_path) pathInput.value = data.default_path;
                showDownloadControls(false);
                
                // Switch active tab visually
                modeTabs.forEach(t => t.classList.remove('active'));
                const targetTab = Array.from(modeTabs).find(t => t.dataset.mode === currentMode);
                if (targetTab) targetTab.classList.add('active');
                break;

            case 'downloading':
                startBtn.style.display = 'none';
                stopBtn.style.display = 'flex';
                stopBtn.disabled = false;
                statusArea.style.display = 'flex';
                
                const pct = parseFloat(data.percent) || 0;
                if (pct >= 0) {
                    progressBar.classList.remove('indeterminate');
                    progressBar.style.width = pct + '%';
                    percentVal.textContent = pct.toFixed(1) + '%';
                } else {
                    progressBar.classList.add('indeterminate');
                    percentVal.textContent = '…';
                }
                
                progressPhase.textContent = data.custom_status || '';
                setStatusText(data.custom_status || 'Downloading…');
                shadow.getElementById('stat-speed').textContent = data.speed || '—';
                shadow.getElementById('stat-eta').textContent = data.eta || '—';
                shadow.getElementById('stat-size').textContent = data.size || '—';
                break;

            case 'direct_progress':
                startBtn.style.display = 'none';
                stopBtn.style.display = 'flex';
                stopBtn.disabled = false;
                statusArea.style.display = 'flex';
                if (data.percent != null && data.percent >= 0) {
                    progressBar.classList.remove('indeterminate');
                    progressBar.style.width = data.percent + '%';
                    percentVal.textContent = data.percent.toFixed(1) + '%';
                } else {
                    progressBar.classList.add('indeterminate');
                    percentVal.textContent = '…';
                }
                shadow.getElementById('stat-speed').textContent = data.speed || '—';
                shadow.getElementById('stat-size').textContent = data.size || '—';
                setStatusText('Downloading file…');
                break;

            case 'finished':
                progressBar.style.width = '100%';
                progressBar.classList.remove('indeterminate');
                percentVal.textContent = '100%';
                stopBtn.style.display = 'none';
                startBtn.style.display = 'flex';
                startBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Done – Download Another`;
                setStatusText('Download complete!', 'success');
                break;

            case 'stopped':
                stopBtn.style.display = 'none';
                startBtn.style.display = 'flex';
                startBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Retry Download`;
                setStatusText('Cancelled', 'error');
                progressBar.style.width = '0%';
                percentVal.textContent = '0%';
                break;

            case 'error':
                loadBtn.style.display = 'flex';
                loadBtn.disabled = false;
                loadBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Fetch &amp; Detect`;
                dlControls.style.display = 'none';
                stopBtn.style.display = 'none';
                startBtn.style.display = 'flex';
                setFetchStatus('Error: ' + (data.message || 'Unknown error'), 'error');
                break;

            case 'file_check_result':
                if (data.exists) {
                    if (!confirm('A file with this name already exists. Overwrite?')) {
                        setStatusText('Cancelled');
                        return;
                    }
                }
                setStatusText('Starting…');
                const startUrl = urlInput.value.trim();
                const payload = {
                    action: 'start',
                    url: startUrl,
                    quality: qualitySelect.value,
                    mode: currentMode,
                    format: formatSelect.value,
                    filename: helpers.sanitize(filenameInput.value.trim()) || 'download',
                    path: pathInput.value.trim()
                };
                try {
                    const startDomain = new URL(startUrl).hostname.replace(/^www\./, '');
                    chrome.runtime.sendMessage({ action: 'get_cookies', domain: startDomain }, (response) => {
                        payload.cookies = (response && response.cookies) ? response.cookies : [];
                        socket.send(JSON.stringify(payload));
                    });
                } catch (e) {
                    payload.cookies = [];
                    socket.send(JSON.stringify(payload));
                }
                break;

            case 'history_data':
                renderHistory(historyList, data.history, socket);
                break;
        }
    };
}

// ──────────────────────────── MESSAGE RECEIVER ──────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle_ui') {
        if (host.style.display === 'none') {
            host.style.display = 'block';
            if (!urlInput.value || urlInput.value !== window.location.href) {
                urlInput.value = window.location.href;
            }
            connectWS();
        } else {
            host.style.display = 'none';
        }
    } else if (request.action === 'intercept_download_prompt') {
        // Show prompt
        if (host.style.display === 'none') {
            host.style.display = 'block';
        }
        interceptPrompt.style.display = 'flex';
        interceptFilename.textContent = request.item.filename;
        
        const cleanup = () => {
            interceptPrompt.style.display = 'none';
            interceptBtnYes.onclick = null;
            interceptBtnNo.onclick = null;
        };

        interceptBtnYes.onclick = () => {
            cleanup();
            sendResponse({ intercept: true });
        };
        interceptBtnNo.onclick = () => {
            cleanup();
            sendResponse({ intercept: false });
        };
        
        return true; // Keep channel open
    } else if (request.action === 'trigger_direct_download') {
        // Trigger a direct download now that we intercepted it
        if (host.style.display === 'none') host.style.display = 'block';
        connectWS();
        
        urlInput.value = request.url;
        const namePart = request.filename.split('.').slice(0, -1).join('.') || request.filename;
        filenameInput.value = namePart;
        
        // Show UI setup as a direct download
        resetUI(true);
        showDownloadControls(true);
        dlTypeText.textContent = 'Intercepted File Download';
        const ext = request.filename.split('.').pop() || 'download';
        directFmtSel.innerHTML = `<option value="${ext}">.${ext.toUpperCase()}</option>`;
        
        setStatusText('Ready to save intercepted file.', 'success');
    }
});

// Init on load
connectWS();
initVideoDetector(host, urlInput, resetUI, fetchFormats, connectWS);