// ============================================================
//  MediaVal – Content Script  v3.0
//  Features:
//    • Dark glassmorphism UI, draggable, resizable
//    • Auto-detects <video> elements → floating download button
//    • Supports yt-dlp (video/audio) AND direct file downloads
//      (.exe .zip .pdf .apk .dmg .iso .rar .7z .tar .gz …)
//    • WebSocket reconnect with exponential back-off
//    • History panel, browse folder, progress stats
// ============================================================

if (!document.getElementById('ytdlp-downloader-host')) {

    // ──────────────────────────── SHADOW HOST ────────────────────────────
    const host = document.createElement('div');
    host.id = 'ytdlp-downloader-host';
    host.style.cssText = `
        position:fixed; top:24px; right:24px;
        z-index:2147483647; display:none;
    `;
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // ──────────────────────────── STYLES ─────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :host { font-family: 'Inter', sans-serif; }
        * { box-sizing: border-box; margin:0; padding:0; }

        /* ── Container ── */
        #container {
            width: clamp(340px, 26vw, 460px);
            max-height: 90vh;
            background: rgba(13,17,23,0.92);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            color: #e2e8f0;
        }

        /* ── Header ── */
        #header {
            padding: 14px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            flex-shrink: 0;
            background: rgba(255,255,255,0.03);
        }
        .logo {
            display: flex; align-items: center; gap: 10px;
        }
        .logo-icon {
            width: 30px; height: 30px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
        }
        .logo-icon svg { width:16px; height:16px; }
        #header h3 {
            font-size: 15px;
            font-weight: 700;
            color: #f1f5f9;
            letter-spacing: -0.3px;
        }
        .header-right { display:flex; gap:8px; align-items:center; }
        .icon-btn {
            background: none; border: none; cursor: pointer;
            color: #64748b; padding: 6px; border-radius: 8px;
            display:flex; align-items:center; justify-content:center;
            transition: all 0.15s;
        }
        .icon-btn:hover { color: #cbd5e1; background: rgba(255,255,255,0.06); }
        .icon-btn.active { color: #818cf8; background: rgba(129,140,248,0.12); }

        /* ── Connection badge ── */
        #conn-badge {
            font-size: 10px; font-weight: 600; letter-spacing: 0.5px;
            padding: 3px 8px; border-radius: 20px;
            background: rgba(239,68,68,0.18); color: #f87171;
            border: 1px solid rgba(239,68,68,0.25);
            transition: all 0.3s;
        }
        #conn-badge.connected {
            background: rgba(34,197,94,0.15); color: #4ade80;
            border-color: rgba(34,197,94,0.25);
        }
        #conn-badge.connecting {
            background: rgba(251,191,36,0.15); color: #fbbf24;
            border-color: rgba(251,191,36,0.25);
        }

        /* ── Scrollable body ── */
        .panel-body {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
            flex: 1;
        }
        .panel-body::-webkit-scrollbar { width: 4px; }
        .panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .panel-body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        /* ── Field groups ── */
        .field-group { display:flex; flex-direction:column; gap:6px; }
        label {
            font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
            text-transform: uppercase; color: #475569;
        }
        input[type="text"], select {
            width: 100%; padding: 10px 14px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 10px;
            font-size: 13px; color: #cbd5e1;
            outline: none; transition: all 0.2s;
            font-family: inherit;
        }
        input::placeholder { color: #334155; }
        input:focus, select:focus {
            border-color: rgba(99,102,241,0.5);
            background: rgba(99,102,241,0.06);
            box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 10px center;
            background-size: 13px;
            padding-right: 32px;
            cursor: pointer;
            color: #94a3b8;
        }
        select option { background: #1e293b; color: #cbd5e1; }

        /* ── URL row with paste btn ── */
        .input-row { display:flex; gap:8px; align-items:center; }
        .input-row input { flex:1; }

        /* ── Mode tabs ── */
        .mode-tabs { display:flex; gap:6px; }
        .mode-tab {
            flex:1; padding: 8px 6px; border-radius: 8px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.07);
            color: #64748b; font-size: 11px; font-weight: 600;
            cursor: pointer; text-align: center; transition: all 0.15s;
            font-family: inherit;
        }
        .mode-tab:hover { background: rgba(255,255,255,0.07); color: #94a3b8; }
        .mode-tab.active {
            background: rgba(99,102,241,0.18);
            border-color: rgba(99,102,241,0.4);
            color: #a5b4fc;
        }

        /* ── Selects row ── */
        .row { display:flex; gap:10px; }
        .col { flex:1; display:flex; flex-direction:column; gap:6px; }
        .col.disabled { opacity:0.35; pointer-events:none; }

        /* ── Browse btn ── */
        #browseBtn {
            width: 40px; height: 40px; flex-shrink:0;
            background: rgba(99,102,241,0.12);
            border: 1px solid rgba(99,102,241,0.25);
            border-radius: 10px; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
            color: #818cf8; transition: all 0.2s;
        }
        #browseBtn:hover { background: rgba(99,102,241,0.22); }
        #browseBtn svg { width:18px; height:18px; }

        /* ── Buttons ── */
        .btn-primary {
            width: 100%; padding: 12px 16px;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            border: none; border-radius: 11px;
            color: white; font-size: 14px; font-weight: 700;
            cursor: pointer; display:flex; align-items:center; justify-content:center; gap:8px;
            transition: all 0.2s; font-family: inherit;
            letter-spacing: -0.2px;
        }
        .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { background: #1e293b; color:#475569; cursor:not-allowed; filter:none; transform:none; box-shadow:none; }

        .btn-danger {
            width: 100%; padding: 10px 16px;
            background: rgba(239,68,68,0.12);
            border: 1px solid rgba(239,68,68,0.25);
            border-radius: 10px; color: #f87171;
            font-size: 13px; font-weight: 600; cursor:pointer;
            display:none; align-items:center; justify-content:center; gap:8px;
            transition: all 0.2s; font-family: inherit;
        }
        .btn-danger:hover { background: rgba(239,68,68,0.2); }
        .btn-danger:disabled { opacity:0.5; cursor:not-allowed; }

        .btn-secondary {
            width: 100%; padding: 10px 16px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px; color: #64748b;
            font-size: 13px; font-weight: 600; cursor:pointer;
            transition: all 0.2s; font-family: inherit;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.08); color:#94a3b8; }

        .link-btn {
            background:none; border:none; color:#818cf8;
            font-size:11px; font-weight:600; cursor:pointer;
            font-family:inherit; padding:0;
            text-decoration:underline; text-underline-offset:2px;
            transition: color 0.15s;
        }
        .link-btn:hover { color:#a5b4fc; }

        /* ── Fetch status ── */
        #fetch-status {
            font-size: 12px; color: #475569; min-height: 16px;
            text-align: center; transition: all 0.2s;
        }
        #fetch-status.error { color: #f87171; }
        #fetch-status.success { color: #4ade80; }

        /* ── Download type badge ── */
        #download-type-badge {
            display: none;
            align-items: center; gap: 6px;
            padding: 6px 10px; border-radius: 8px;
            background: rgba(251,191,36,0.1);
            border: 1px solid rgba(251,191,36,0.2);
            font-size: 11px; font-weight: 600; color: #fbbf24;
        }

        /* ── Progress Area ── */
        #status-area {
            display: none;
            flex-direction: column; gap: 10px;
            padding: 14px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 12px;
        }
        .status-header { display:flex; justify-content:space-between; align-items:center; }
        .status-label { font-size: 11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.8px; }
        #status-text { font-size: 13px; font-weight:600; color:#cbd5e1; }
        #status-text.success { color:#4ade80; }
        #status-text.error { color:#f87171; }

        .progress-row { display:flex; justify-content:space-between; align-items:center; font-size:12px; }
        .progress-wrapper {
            height: 6px; border-radius: 3px;
            background: rgba(255,255,255,0.07);
            overflow:hidden;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #4f46e5, #8b5cf6);
            width: 0%; border-radius: 3px;
            transition: width 0.3s ease;
        }
        .progress-bar.indeterminate {
            width: 40% !important;
            animation: indeterminate 1.2s ease-in-out infinite;
        }
        @keyframes indeterminate {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
        }

        .stats-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
        .stat-box {
            background: rgba(255,255,255,0.04); border-radius:8px;
            padding: 8px; text-align:center;
        }
        .stat-label { font-size:9px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.8px; display:block; margin-bottom:3px; }
        .stat-value { font-size:13px; font-weight:600; color:#94a3b8; }

        /* ── History panel ── */
        #historyPanel { display:none; flex-direction:column; gap:12px; }
        .history-header { display:flex; justify-content:space-between; align-items:center; }
        .history-header h4 { font-size:14px; font-weight:700; color:#f1f5f9; }
        #historyList { display:flex; flex-direction:column; gap:8px; max-height:350px; overflow-y:auto; padding-right:2px; }
        #historyList::-webkit-scrollbar { width:4px; }
        #historyList::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
        .history-item {
            padding: 12px; border-radius: 10px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            display:flex; flex-direction:column; gap:6px;
            position:relative; transition: border-color 0.15s;
        }
        .history-item:hover { border-color: rgba(99,102,241,0.3); }
        .history-item-name { font-size:12px; font-weight:600; color:#cbd5e1; padding-right:22px; word-break:break-all; }
        .history-item-meta { display:flex; justify-content:space-between; align-items:center; font-size:10px; color:#475569; }
        .badge { padding:2px 7px; border-radius:20px; font-size:9px; font-weight:700; text-transform:uppercase; }
        .badge-finished { background:rgba(34,197,94,0.15); color:#4ade80; }
        .badge-stopped  { background:rgba(239,68,68,0.12); color:#f87171; }
        .badge-failed   { background:rgba(239,68,68,0.12); color:#f87171; }
        .history-item-actions { display:flex; gap:6px; }
        .history-action-btn {
            background:none; border:none; font-size:11px; font-weight:600;
            color:#475569; cursor:pointer; padding:3px 6px; border-radius:6px;
            transition: all 0.15s; display:flex; align-items:center; gap:4px; font-family:inherit;
        }
        .history-action-btn:hover { background:rgba(255,255,255,0.06); color:#94a3b8; }
        .history-del-btn {
            position:absolute; top:8px; right:8px;
            background:none; border:none; color:#334155;
            cursor:pointer; font-size:16px; line-height:1;
            border-radius:50%; padding:2px; transition: all 0.15s;
        }
        .history-del-btn:hover { color:#f87171; background:rgba(239,68,68,0.1); }
        .no-history { text-align:center; color:#334155; font-size:12px; padding:30px 0; }

        /* ── Separator ── */
        .sep { height:1px; background:rgba(255,255,255,0.05); }
        .reset-row { display:flex; justify-content:flex-end; }
    `;

    // ──────────────────────────── HTML ───────────────────────────────────
    const html = document.createElement('div');
    html.id = 'container';
    html.innerHTML = `
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
                    <div class="field-group" style="gap:8px;">
                        <label>Mode</label>
                        <div class="mode-tabs">
                            <button class="mode-tab active" data-mode="merge">Video + Audio</button>
                            <button class="mode-tab" data-mode="video">Video Only</button>
                            <button class="mode-tab" data-mode="audio">Audio Only</button>
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
                            <option value="exe">.exe – Windows Installer</option>
                            <option value="zip">.zip – Archive</option>
                            <option value="rar">.rar – Archive</option>
                            <option value="7z">.7z – Archive</option>
                            <option value="tar">.tar – Archive</option>
                            <option value="gz">.gz – Archive</option>
                            <option value="dmg">.dmg – macOS Installer</option>
                            <option value="apk">.apk – Android App</option>
                            <option value="iso">.iso – Disk Image</option>
                            <option value="pdf">.pdf – Document</option>
                            <option value="msi">.msi – Windows Installer</option>
                            <option value="deb">.deb – Linux Package</option>
                            <option value="rpm">.rpm – Linux Package</option>
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
        </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(html);

    // ──────────────────────────── ELEMENT REFS ──────────────────────────
    const urlInput      = shadow.getElementById('urlInput');
    const filenameInput = shadow.getElementById('filenameInput');
    const pathInput     = shadow.getElementById('pathInput');
    const browseBtn     = shadow.getElementById('browseBtn');
    const loadBtn       = shadow.getElementById('loadBtn');
    const startBtn      = shadow.getElementById('startBtn');
    const stopBtn       = shadow.getElementById('stopBtn');
    const formatSelect  = shadow.getElementById('formatSelect');
    const qualitySelect = shadow.getElementById('qualitySelect');
    const qualityCol    = shadow.getElementById('qualityCol');
    const dlControls    = shadow.getElementById('downloadControls');
    const resetLink     = shadow.getElementById('resetLink');
    const fetchStatus   = shadow.getElementById('fetch-status');
    const statusText    = shadow.getElementById('status-text');
    const progressBar   = shadow.getElementById('progressBar');
    const percentVal    = shadow.getElementById('percent-val');
    const progressPhase = shadow.getElementById('progress-phase');
    const statusArea    = shadow.getElementById('status-area');
    const connBadge     = shadow.getElementById('conn-badge');
    const closeBtn      = shadow.getElementById('closeBtn');
    const headerEl      = shadow.getElementById('header');
    const mainPanel     = shadow.getElementById('mainPanel');
    const historyPanel  = shadow.getElementById('historyPanel');
    const historyBtn    = shadow.getElementById('historyBtn');
    const historyList   = shadow.getElementById('historyList');
    const clearHistBtn  = shadow.getElementById('clearHistBtn');
    const backBtn       = shadow.getElementById('backBtn');
    const mediaOptions  = shadow.getElementById('mediaOptions');
    const directOptions = shadow.getElementById('directOptions');
    const dlTypeBadge   = shadow.getElementById('download-type-badge');
    const dlTypeText    = shadow.getElementById('download-type-text');
    const directFmtSel  = shadow.getElementById('directFormatSelect');

    const modeTabs = shadow.querySelectorAll('.mode-tab');

    // ──────────────────────────── STATE ────────────────────────────────
    let socket = null;
    let isDirectDownload = false;
    let currentMode = 'merge';
    let retryDelay = 2000;
    let retryTimer = null;

    const videoFormats = ['mp4', 'mkv', 'webm', 'avi', 'mov'];
    const audioFormats = ['mp3', 'm4a', 'opus', 'flac', 'wav', 'aac'];

    // Direct-download-detectable extensions
    const DIRECT_EXTS = new Set([
        'exe','zip','rar','7z','tar','gz','bz2','xz','dmg',
        'apk','iso','pdf','msi','deb','rpm','pkg','cab',
        'jar','war','ear','AppImage','snap',
        'mp3','mp4','mkv','avi','mov','webm', // also media served as direct files
    ]);

    // ──────────────────────────── DRAG ─────────────────────────────────
    let isDragging = false, startX, startY, origX, origY;
    headerEl.addEventListener('mousedown', e => {
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
        host.style.top  = (origY + dy) + 'px';
        host.style.right = 'auto';
    });

    // ──────────────────────────── PREVENT KEY BUBBLING ─────────────────
    [urlInput, filenameInput, pathInput].forEach(el => {
        ['keydown','keyup','keypress'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation()));
    });

    // ──────────────────────────── HELPERS ──────────────────────────────
    function sanitize(name) {
        return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
    }

    function setFetchStatus(msg, cls = '') {
        fetchStatus.textContent = msg;
        fetchStatus.className = cls;
    }

    function setStatusText(msg, cls = '') {
        statusText.textContent = msg;
        statusText.className = cls;
    }

    function detectDirectDownload(url) {
        try {
            const u = new URL(url);
            const pathname = u.pathname.toLowerCase();
            const ext = pathname.split('.').pop().split('?')[0];
            return DIRECT_EXTS.has(ext);
        } catch { return false; }
    }

    function getExtFromUrl(url) {
        try {
            const u = new URL(url);
            const pathname = u.pathname.toLowerCase();
            return pathname.split('.').pop().split('?')[0] || 'bin';
        } catch { return 'bin'; }
    }

    function getFilenameFromUrl(url) {
        try {
            const u = new URL(url);
            const parts = u.pathname.split('/');
            const last = parts[parts.length - 1] || 'download';
            return decodeURIComponent(last.split('.')[0]) || 'download';
        } catch { return 'download'; }
    }

    function updateModeFormatOptions() {
        formatSelect.innerHTML = '';
        const formats = currentMode === 'audio' ? audioFormats : videoFormats;
        formats.forEach(ext => {
            const o = document.createElement('option');
            o.value = ext; o.textContent = '.' + ext.toUpperCase();
            formatSelect.appendChild(o);
        });
        qualityCol.classList.toggle('disabled', currentMode === 'audio');
    }

    function showDownloadControls(direct = false) {
        isDirectDownload = direct;
        dlControls.style.display = 'flex';
        loadBtn.style.display = 'none';
        mediaOptions.style.display  = direct ? 'none' : 'block';
        directOptions.style.display = direct ? 'block' : 'none';
        dlTypeBadge.style.display   = direct ? 'flex' : 'none';
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
        ['stat-size','stat-speed','stat-eta'].forEach(id => shadow.getElementById(id).textContent = '—');
        if (full) setFetchStatus('');
    }

    // ──────────────────────────── MODE TABS ────────────────────────────
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.dataset.mode;
            updateModeFormatOptions();
        });
    });

    // ──────────────────────────── BROWSE ───────────────────────────────
    browseBtn.addEventListener('click', () => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        browseBtn.disabled = true;
        socket.send(JSON.stringify({ action: 'browse_folder' }));
    });

    // ──────────────────────────── RESET ────────────────────────────────
    resetLink.addEventListener('click', () => {
        if (stopBtn.style.display === 'flex') return;
        urlInput.value = window.location.href;
        resetUI();
    });
    urlInput.addEventListener('input', () => {
        if (dlControls.style.display !== 'none') resetUI(false);
    });

    // ──────────────────────────── CLOSE ────────────────────────────────
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
        if (confirm('Clear all download history?'))
            socket.send(JSON.stringify({ action: 'clear_history' }));
    });

    function renderHistory(history) {
        historyList.innerHTML = '';
        if (!history || history.length === 0) {
            historyList.innerHTML = '<div class="no-history">No downloads yet.</div>';
            return;
        }
        history.forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-item';
            const date = item.timestamp ? new Date(item.timestamp).toLocaleString() : '';
            const badgeClass = `badge-${item.status || 'failed'}`;
            const badgeLabel = { finished:'Finished', stopped:'Stopped', failed:'Failed' }[item.status] || item.status;
            el.innerHTML = `
                <button class="history-del-btn" data-id="${item.id}" title="Remove">✕</button>
                <div class="history-item-name" title="${item.url}">${item.filename || item.title || item.url}</div>
                <div class="history-item-meta">
                    <span class="badge ${badgeClass}">${badgeLabel}</span>
                    <span>${item.size || ''} &nbsp;${date}</span>
                </div>
                <div class="history-item-actions"></div>
            `;
            const actionsRow = el.querySelector('.history-item-actions');
            if (item.status === 'finished') {
                const openBtn = document.createElement('button');
                openBtn.className = 'history-action-btn';
                openBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Open Folder`;
                openBtn.addEventListener('click', () => socket.send(JSON.stringify({ action: 'open_folder', path: item.save_path })));
                actionsRow.appendChild(openBtn);
            }
            const copyBtn = document.createElement('button');
            copyBtn.className = 'history-action-btn';
            copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy URL`;
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(item.url).then(() => {
                    const orig = copyBtn.innerHTML;
                    copyBtn.textContent = '✓ Copied';
                    setTimeout(() => copyBtn.innerHTML = orig, 1500);
                });
            });
            actionsRow.appendChild(copyBtn);

            el.querySelector('.history-del-btn').addEventListener('click', () => {
                socket.send(JSON.stringify({ action: 'delete_history_item', id: item.id }));
            });
            historyList.appendChild(el);
        });
    }

    // ──────────────────────────── FETCH ────────────────────────────────
    function fetchFormats() {
        let url = urlInput.value.trim();
        if (!url) { setFetchStatus('Please enter a URL', 'error'); return; }

        // Final safeguard against blob URLs - if one sneaks in, fall back to the page URL
        if (url.startsWith('blob:')) {
            url = window.location.href;
            urlInput.value = url;
        }

        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setFetchStatus('Server not connected. Retrying…', 'error');
            connectWS();
            return;
        }

        // Check if it's a direct downloadable file
        if (detectDirectDownload(url)) {
            const ext = getExtFromUrl(url);
            const name = getFilenameFromUrl(url);
            filenameInput.value = sanitize(name);
            pathInput.value = pathInput.value || '';
            // Pre-select format in direct select
            const opt = [...directFmtSel.options].find(o => o.value === ext);
            if (opt) directFmtSel.value = ext;
            else directFmtSel.value = 'auto';
            dlTypeText.textContent = `Direct Download  (.${ext})`;
            socket.send(JSON.stringify({ action: 'get_default_path' }));
            showDownloadControls(true);
            setFetchStatus('');
            return;
        }

        // Otherwise use yt-dlp
        setFetchStatus('Fetching formats…');
        loadBtn.disabled = true;
        loadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"/></svg> Fetching…`;
        socket.send(JSON.stringify({ action: 'get_formats', url }));
    }

    loadBtn.addEventListener('click', fetchFormats);

    // ──────────────────────────── START DOWNLOAD ───────────────────────
    startBtn.addEventListener('click', () => {
        let url      = urlInput.value.trim();
        const filename = sanitize(filenameInput.value.trim()) || 'download';
        const path     = pathInput.value.trim();
        if (!path) { setFetchStatus('Please select a destination folder', 'error'); return; }

        if (url.startsWith('blob:')) {
            url = window.location.href;
            urlInput.value = url;
        }

        if (isDirectDownload) {
            let ext = directFmtSel.value;
            if (ext === 'auto') ext = getExtFromUrl(url);
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
            // Retrieve last path
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
                    const bestOpt = document.createElement('option');
                    bestOpt.value = 'best'; bestOpt.textContent = 'Best Quality';
                    qualitySelect.appendChild(bestOpt);
                    (data.resolutions || []).forEach(res => {
                        const o = document.createElement('option');
                        o.value = res; o.textContent = res + 'p';
                        qualitySelect.appendChild(o);
                    });
                    filenameInput.value = sanitize(data.title || 'video');
                    if (data.default_path) pathInput.value = data.default_path;
                    updateModeFormatOptions();
                    showDownloadControls(false);
                    setFetchStatus('');
                    break;

                case 'downloading':
                    startBtn.style.display = 'none';
                    stopBtn.style.display = 'flex';
                    stopBtn.disabled = false;
                    statusArea.style.display = 'flex';
                    progressBar.classList.remove('indeterminate');
                    const pct = parseFloat(data.percent) || 0;
                    progressBar.style.width = pct + '%';
                    percentVal.textContent = pct.toFixed(1) + '%';
                    progressPhase.textContent = data.custom_status || '';
                    setStatusText(data.custom_status || 'Downloading…');
                    shadow.getElementById('stat-speed').textContent = data.speed || '—';
                    shadow.getElementById('stat-eta').textContent   = data.eta   || '—';
                    shadow.getElementById('stat-size').textContent  = data.size  || '—';
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
                    shadow.getElementById('stat-size').textContent  = data.size  || '—';
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
                    socket.send(JSON.stringify({
                        action: 'start',
                        url: urlInput.value.trim(),
                        quality: qualitySelect.value,
                        mode: currentMode,
                        format: formatSelect.value,
                        filename: sanitize(filenameInput.value.trim()) || 'download',
                        path: pathInput.value.trim()
                    }));
                    break;

                case 'history_data':
                    renderHistory(data.history);
                    break;
            }
        };
    }

    // ──────────────────────────── TOGGLE ───────────────────────────────
    chrome.runtime.onMessage.addListener(request => {
        if (request.action !== 'toggle_ui') return;
        if (host.style.display === 'none') {
            host.style.display = 'block';
            if (!urlInput.value || urlInput.value !== window.location.href)
                urlInput.value = window.location.href;
            connectWS();
        } else {
            host.style.display = 'none';
        }
    });

    connectWS();

    // ═══════════════════════════════════════════════════════════════════
    //  VIDEO OVERLAY – detect <video> elements and add a floating ⬇ btn
    // ═══════════════════════════════════════════════════════════════════
    const VIDEO_BTN_ATTR = 'data-mediavar-btn';

    const videoOverlayStyle = document.createElement('style');
    videoOverlayStyle.textContent = `
        .mediavar-video-wrap { position:relative !important; }
        .mediavar-dl-btn {
            position:absolute !important;
            top:10px !important; right:10px !important;
            z-index:2147483646 !important;
            background:rgba(10,10,20,0.75) !important;
            backdrop-filter:blur(6px) !important;
            border:1px solid rgba(255,255,255,0.15) !important;
            border-radius:9px !important;
            padding:7px 12px !important;
            display:flex !important; align-items:center !important; gap:6px !important;
            cursor:pointer !important;
            color:#fff !important;
            font:600 12px/1 'Inter',sans-serif !important;
            opacity:0 !important;
            transition:opacity 0.2s !important;
            pointer-events:auto !important;
            text-decoration:none !important;
        }
        .mediavar-dl-btn svg { flex-shrink:0 !important; }
        .mediavar-video-wrap:hover .mediavar-dl-btn { opacity:1 !important; }
        .mediavar-dl-btn:hover { background:rgba(99,102,241,0.85) !important; }
    `;
    document.head.appendChild(videoOverlayStyle);

    function addVideoButton(video) {
        if (video.hasAttribute(VIDEO_BTN_ATTR)) return;
        video.setAttribute(VIDEO_BTN_ATTR, '1');

        // Wrap video if not already in a positioned parent
        let wrap = video.parentElement;
        if (!wrap || !['relative','absolute','fixed','sticky'].includes(getComputedStyle(wrap).position)) {
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

            // Helper to find the actual video link if the src is a blob (e.g., YouTube homepage previews)
            function findRealVideoUrl(vid) {
                const src = vid.currentSrc || vid.src || vid.querySelector('source')?.src || '';
                if (src && !src.startsWith('blob:')) return src;

                // 1. Is the video inside a clickable link?
                const closestA = vid.closest('a[href]');
                if (closestA && closestA.href) return closestA.href;

                // 2. YouTube specific: find the closest video container and grab its link
                const ytContainer = vid.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-reel-item-renderer');
                if (ytContainer) {
                    const ytLink = ytContainer.querySelector('a#thumbnail, a#video-title, a');
                    if (ytLink && ytLink.href) return ytLink.href;
                }

                // 3. General fallback: look for a video link in the parent elements
                let parent = vid.parentElement;
                while (parent && parent !== document.body) {
                    const a = parent.querySelector('a[href*="/watch"], a[href*="/video"]');
                    if (a && a.href) return a.href;
                    parent = parent.parentElement;
                }

                // 4. Absolute fallback
                return window.location.href;
            }

            const targetUrl = findRealVideoUrl(video);

            // Open MediaVal and populate the URL
            if (host.style.display === 'none') {
                host.style.display = 'block';
                connectWS();
            }
            urlInput.value = targetUrl;
            resetUI(true);
            // Auto-fetch after a tick to ensure WS is alive
            setTimeout(fetchFormats, 300);
        });

        wrap.appendChild(btn);
    }

    function scanVideos() {
        document.querySelectorAll('video').forEach(v => {
            if (v.readyState >= 1 || v.currentSrc || v.src)
                addVideoButton(v);
        });
    }

    scanVideos();

    // MutationObserver to catch dynamically added videos
    const obs = new MutationObserver(mutations => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.tagName === 'VIDEO') addVideoButton(node);
                node.querySelectorAll && node.querySelectorAll('video').forEach(addVideoButton);
            });
        });
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Also watch for src changes on existing videos
    document.addEventListener('canplay', e => {
        if (e.target && e.target.tagName === 'VIDEO') addVideoButton(e.target);
    }, true);

    // Add spin keyframe
    const spinStyle = document.createElement('style');
    spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    shadow.appendChild(spinStyle);

} // end guard