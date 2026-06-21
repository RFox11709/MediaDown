import { mainStylesText } from './styles.js';

export const htmlTemplate = `
    <div id="header">
        <div class="logo">
            <div class="logo-icon">
                <svg viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <h3>MediaVal</h3>
        </div>
        <div class="header-right">
            <span id="conn-badge">●&nbsp;Offline</span>
            <button id="historyBtn" class="icon-btn" title="History">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </button>
            <button id="closeBtn" class="icon-btn" title="Close">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
    </div>

    <!-- ── MAIN PANEL ── -->
    <div class="panel-body" id="mainPanel">
        <div id="fetch-status"></div>

        <div class="field-group">
            <label>Source URL</label>
            <div class="input-row">
                <input type="text" id="urlInput" placeholder="Paste URL or use current page…" />
            </div>
        </div>

        <button id="loadBtn" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Fetch &amp; Detect
        </button>

        <!-- ── download controls (shown after fetch) ── -->
        <div id="downloadControls" style="display:none; flex-direction:column; gap:14px;">

            <div class="sep"></div>

            <div id="download-type-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span id="download-type-text">Direct File Download</span>
            </div>

            <div class="field-group">
                <label>Save As</label>
                <input type="text" id="filenameInput" placeholder="Filename (without extension)" />
            </div>

            <div class="field-group">
                <label>Destination</label>
                <div class="input-row">
                    <input type="text" id="pathInput" placeholder="Select folder…" />
                    <button id="browseBtn" title="Browse folder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </button>
                </div>
            </div>

            <!-- Mode tabs (hidden for direct downloads) -->
            <div id="mediaOptions">
                <div class="field-group" style="gap:8px;" id="modeFieldGroup">
                    <label>Mode</label>
                    <div class="mode-tabs">
                        <button class="mode-tab active" data-mode="merge">Video + Audio</button>
                        <button class="mode-tab" data-mode="video">Video Only</button>
                        <button class="mode-tab" data-mode="audio">Audio Only</button>
                        <button class="mode-tab" data-mode="image" title="Uses gallery-dl for images/media">Image/Gallery</button>
                    </div>
                </div>

                <div class="row" style="margin-top:10px;">
                    <div class="col">
                        <label>Format</label>
                        <select id="formatSelect"></select>
                    </div>
                    <div class="col" id="qualityCol">
                        <label>Quality</label>
                        <select id="qualitySelect"></select>
                    </div>
                </div>
            </div>

            <!-- Direct file format (shown for direct downloads) -->
            <div id="directOptions" style="display:none;">
                <div class="col">
                    <label>File Type</label>
                    <select id="directFormatSelect">
                        <option value="auto">Auto (from URL)</option>
                        <option value="exe">.exe - Windows Installer</option>
                        <option value="zip">.zip - Archive</option>
                        <option value="rar">.rar - Archive</option>
                        <option value="7z">.7z - Archive</option>
                        <option value="tar">.tar - Archive</option>
                        <option value="gz">.gz - Archive</option>
                        <option value="dmg">.dmg - macOS Installer</option>
                        <option value="apk">.apk - Android App</option>
                        <option value="iso">.iso - Disk Image</option>
                        <option value="pdf">.pdf - Document</option>
                        <option value="msi">.msi - Windows Installer</option>
                        <option value="deb">.deb - Linux Package</option>
                        <option value="rpm">.rpm - Linux Package</option>
                    </select>
                </div>
            </div>

            <div class="reset-row">
                <button id="resetLink" class="link-btn">↺ Reset &amp; Change URL</button>
            </div>

            <button id="startBtn" class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Now
            </button>

            <button id="stopBtn" class="btn-danger">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                Stop
            </button>

            <div id="status-area">
                <div class="status-header">
                    <span class="status-label">Status</span>
                    <span id="status-text">Ready</span>
                </div>
                <div class="progress-row">
                    <span style="font-size:10px;color:#475569;" id="progress-phase"></span>
                    <span style="font-size:12px;font-weight:700;color:#818cf8;" id="percent-val">0%</span>
                </div>
                <div class="progress-wrapper">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
                <div class="stats-row">
                    <div class="stat-box">
                        <span class="stat-label">Size</span>
                        <span class="stat-value" id="stat-size">—</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Speed</span>
                        <span class="stat-value" id="stat-speed">—</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">ETA</span>
                        <span class="stat-value" id="stat-eta">—</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ── HISTORY PANEL ── -->
    <div class="panel-body" id="historyPanel">
        <div class="history-header">
            <h4>Download History</h4>
            <button id="clearHistBtn" class="link-btn" style="color:#f87171;">Clear All</button>
        </div>
        <div id="historyList"></div>
        <button id="backBtn" class="btn-secondary">← Back to Downloader</button>
        <!-- ── Intercept Download Prompt ── -->
        <div id="interceptPrompt" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.85); z-index:9999; flex-direction:column; justify-content:center; align-items:center; padding:20px; text-align:center;">
            <div style="background:#2C2F36; padding:20px; border-radius:12px; width:100%; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top:0; color:#fff; font-size:16px;">Intercept Download?</h3>
                <p id="interceptFilename" style="color:#A0A5B1; font-size:13px; word-break:break-all; margin:10px 0 20px;">filename.ext</p>
                <div style="display:flex; gap:10px;">
                    <button id="interceptBtnYes" class="btn-primary" style="flex:1;">Intercept</button>
                    <button id="interceptBtnNo" class="btn-secondary" style="flex:1;">Let Chrome Download</button>
                </div>
            </div>
        </div>
    </div>
`;

export function setupUI() {
    let host = document.getElementById('ytdlp-downloader-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'ytdlp-downloader-host';
        host.style.cssText = `
            position:fixed; top:24px; right:24px;
            z-index:2147483647; display:none;
        `;
        document.body.appendChild(host);
    }

    const shadow = host.hasChildNodes() ? host.shadowRoot : host.attachShadow({ mode: 'open' });

    // Clear out any old elements inside Shadow Root if they exist
    shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = mainStylesText;
    shadow.appendChild(style);

    const container = document.createElement('div');
    container.id = 'container';
    container.innerHTML = htmlTemplate;
    shadow.appendChild(container);

    setupDraggable(host, shadow.getElementById('header'));

    return { host, shadow };
}

function setupDraggable(host, header) {
    let isDragging = false, startX, startY, origX, origY;

    header.addEventListener('mousedown', e => {
        if (e.target.closest('.icon-btn')) return;
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        const rect = host.getBoundingClientRect();
        origX = rect.left; origY = rect.top;
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => isDragging = false);

    document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        host.style.left = (origX + dx) + 'px';
        host.style.top = (origY + dy) + 'px';
        host.style.right = 'auto';
    });
}