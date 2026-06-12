// Check if already injected
if (!document.getElementById('ytdlp-downloader-host')) {

    const host = document.createElement('div');
    host.id = 'ytdlp-downloader-host';
    host.style.position = 'fixed';
    host.style.top = '20px';
    host.style.right = '20px';
    host.style.zIndex = '2147483647';
    host.style.display = 'none';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');

        :host { 
            font-family: 'Outfit', sans-serif; 
            color: #1e293b; 
        }
        * { box-sizing: border-box; }
        
        #container {
            width: clamp(320px, 25vw, 450px);
            max-width: 95vw;
            max-height: 95vh;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.15);
            border: 1px solid #f0f7f6;
            display: flex;
            flex-direction: column;
            padding: 10px;
        }

        /* Dynamic scaling based on screen size */
        @media (max-width: 768px) {
            #container { width: 95vw; zoom: 0.85; }
        }
        @media (min-width: 1920px) {
            #container { zoom: 1.2; }
        }
        @media (min-width: 2560px) {
            #container { zoom: 1.5; }
        }

        #header {
            padding: 15px 20px;
            cursor: move;
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            user-select: none;
            margin-bottom: 5px;
            flex-shrink: 0;
        }
        #header h3 { 
            margin: 0; 
            font-size: 20px; 
            font-weight: 700; 
            color: #2d5a55; 
            letter-spacing: -0.5px;
        }
        .header-actions { display: flex; gap: 15px; align-items: center; }
        .icon-btn { 
            cursor: pointer; 
            background: none; 
            border: none; 
            padding: 0; 
            color: #7d8b8a; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            transition: color 0.2s;
        }
        .icon-btn:hover { color: #2d5a55; }
        .icon-btn.active { color: #00d2be; }
        .icon-btn.active:hover { color: #1d6e65; }
        #closeBtn { font-size: 24px; font-weight: 400; }

        .content { 
            padding: 10px 15px; 
            display: flex; 
            flex-direction: column; 
            gap: 18px; 
            overflow-y: auto;
        }
        
        .content::-webkit-scrollbar { width: 6px; }
        .content::-webkit-scrollbar-track { background: transparent; }
        .content::-webkit-scrollbar-thumb { background: #c3f5f0; border-radius: 3px; }
        .content::-webkit-scrollbar-thumb:hover { background: #a9eeea; }

        .field-group { display: flex; flex-direction: column; gap: 6px; }
        label { 
            font-size: 11px; 
            font-weight: 700; 
            color: #8fa6a3; 
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        input[type="text"], select {
            width: 100%; 
            padding: 12px 16px;
            border: 1px solid #d4f2ef; 
            border-radius: 12px;
            font-size: 14px; 
            outline: none; 
            background: #e6f9f7;
            color: #2d5a55;
            transition: all 0.2s;
            font-weight: 500;
        }
        input::placeholder { color: #a1c7c2; font-weight: 400; }
        input:focus, select:focus { border-color: #00d2be; background: #f0fdfc; }
        
        .input-with-action { position: relative; display: flex; align-items: center; }
        
        #resetLink { 
            align-self: flex-end;
            font-size: 11px; 
            color: #2d5a55; 
            cursor: pointer; 
            text-decoration: underline; 
            font-weight: 600;
            margin-top: -12px;
        }

        .row { display: flex; gap: 12px; }
        .col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        
        #browseBtn {
            width: 44px;
            height: 44px;
            margin-left: 10px;
            background: #a9eeea;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: none;
            color: #2d5a55;
            flex-shrink: 0;
            transition: 0.2s;
        }
        #browseBtn:hover { background: #86dbd6; }
        #browseBtn svg { width: 22px; height: 22px; }

        select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232d5a55'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 14px;
            padding-right: 35px;
        }

        .btn-main {
            width: 100%;
            padding: 14px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 700;
            color: white;
            border: none;
            cursor: pointer;
            background: linear-gradient(135deg, #1d6e65 0%, #00d2be 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-top: 5px;
        }
        .btn-main:active { transform: scale(0.98); }
        .btn-main:disabled { background: #cbd5e1; cursor: not-allowed; }
        
        #stopBtn { 
            background: #ff6b6b; 
            font-size: 14px; 
            padding: 10px; 
            display: none; 
            margin-top: 10px;
        }

        /* Status Section */
        #status-area {
            margin-top: 10px;
            padding: 20px;
            border: 1px dashed #c2dcd8;
            border-radius: 20px;
            display: none;
        }
        .status-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .status-title { font-size: 14px; font-weight: 700; color: #2d5a55; }
        .encrypted-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            background: #c3f5f0;
            color: #2d5a55;
            border-radius: 10px;
            text-transform: uppercase;
        }

        .progress-container { margin-bottom: 15px; }
        .progress-text-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 600;
            color: #2d5a55;
            margin-bottom: 8px;
        }
        .progress-wrapper { 
            background: #e6f9f7; 
            height: 10px; 
            border-radius: 5px; 
            overflow: hidden;
        }
        .progress-bar { 
            height: 100%; 
            background: #00d2be;
            width: 0%; 
            transition: width 0.3s ease; 
        }

        .stats-grid { 
            display: grid; 
            grid-template-columns: 1fr 1px 1fr 1px 1fr; 
            align-items: center;
            text-align: center; 
        }
        .stat-box { display: flex; flex-direction: column; gap: 2px; }
        .stat-label { font-size: 10px; font-weight: 700; color: #8fa6a3; text-transform: uppercase; }
        .stat-value { font-size: 13px; font-weight: 600; color: #2d5a55; }
        .divider { background: #e6f9f7; height: 30px; width: 1px; }

        #fetch-status { text-align: center; font-size: 12px; color: #64748b; margin-top: -10px; min-height: 14px; }
        .error-msg { color: #ef4444 !important; }
        .success-msg { color: #00d2be !important; }

        /* History Panel */
        #historyPanel {
            display: none;
            flex-direction: column;
            gap: 15px;
        }
        .history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e6f9f7;
            padding-bottom: 8px;
        }
        .history-header h4 {
            margin: 0;
            font-size: 16px;
            color: #2d5a55;
            font-weight: 700;
        }
        .text-btn {
            background: none;
            border: none;
            color: #ff6b6b;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            padding: 0;
            transition: opacity 0.2s;
        }
        .text-btn:hover {
            opacity: 0.8;
            text-decoration: underline;
        }
        #historyList {
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 320px;
            overflow-y: auto;
            padding-right: 4px;
        }
        #historyList::-webkit-scrollbar {
            width: 6px;
        }
        #historyList::-webkit-scrollbar-track {
            background: #f0fdfc;
            border-radius: 3px;
        }
        #historyList::-webkit-scrollbar-thumb {
            background: #c3f5f0;
            border-radius: 3px;
        }
        #historyList::-webkit-scrollbar-thumb:hover {
            background: #a9eeea;
        }
        .history-item {
            padding: 12px;
            border-radius: 12px;
            background: #f0fdfc;
            border: 1px solid #d4f2ef;
            display: flex;
            flex-direction: column;
            gap: 6px;
            position: relative;
            transition: all 0.2s;
        }
        .history-item:hover {
            border-color: #86dbd6;
            box-shadow: 0 4px 12px rgba(0,210,190,0.05);
        }
        .history-item-title {
            font-size: 13px;
            font-weight: 600;
            color: #2d5a55;
            padding-right: 20px;
            word-break: break-all;
        }
        .history-item-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #8fa6a3;
        }
        .history-item-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 4px;
            border-top: 1px dashed #e6f9f7;
            padding-top: 6px;
        }
        .history-action-btn {
            background: none;
            border: none;
            font-size: 11px;
            font-weight: 600;
            color: #2d5a55;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 2px 6px;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .history-action-btn:hover {
            background: #c3f5f0;
        }
        .history-action-btn svg {
            flex-shrink: 0;
        }
        .history-delete-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            color: #a1c7c2;
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
            font-size: 16px;
            line-height: 1;
        }
        .history-delete-btn:hover {
            color: #ff6b6b;
            background: #ffe3e3;
        }
        .badge {
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 8px;
            text-transform: uppercase;
        }
        .badge-finished {
            background: #c3f5f0;
            color: #1d6e65;
        }
        .badge-stopped {
            background: #ffe3e3;
            color: #ff6b6b;
        }
        .badge-failed {
            background: #ffe3e3;
            color: #ff6b6b;
        }
        .no-history {
            text-align: center;
            color: #8fa6a3;
            font-size: 13px;
            padding: 30px 10px;
        }
        .btn-secondary {
            width: 100%;
            padding: 12px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            color: #2d5a55;
            border: 1px solid #d4f2ef;
            background: #e6f9f7;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }
        .btn-secondary:hover {
            background: #c3f5f0;
        }
    `;

    const html = document.createElement('div');
    html.id = 'container';
    html.innerHTML = `
        <div id="header">
            <h3>MediaVal</h3>
            <div class="header-actions">
                <button id="historyBtn" class="icon-btn" title="History">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </button>
                <button id="closeBtn" class="icon-btn">&times;</button>
            </div>
        </div>
        
        <div class="content" id="mainPanel">
            <div id="fetch-status"></div>
            
            <div class="field-group">
                <label>Source URL</label>
                <input type="text" id="urlInput" placeholder="https://vimeo.com/video/..." />
            </div>
            
            <button id="loadBtn" class="btn-main">Fetch Formats</button>

            <div id="downloadControls" style="display: none; flex-direction: column; gap: 18px; width: 100%;">
                <a id="resetLink">Change Video (Auto-Fetch)</a>
                
                <div class="field-group">
                    <label>Save As</label>
                    <input type="text" id="filenameInput" placeholder="Filename" />
                </div>

                <div class="field-group">
                    <label>Destination</label>
                    <div style="display: flex; align-items: center;">
                        <input type="text" id="pathInput" placeholder="/Downloads/MediaVal/Cinematics" />
                        <button id="browseBtn" title="Select Folder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        </button>
                    </div>
                </div>

                <div class="row">
                    <div class="col">
                        <label>Mode</label>
                        <select id="modeSelect">
                            <option value="merge">Video + Audio</option>
                            <option value="video">Video Only</option>
                            <option value="audio">Audio Only</option>
                        </select>
                    </div>
                    
                    <div class="col">
                        <label>Ext</label>
                        <select id="formatSelect">
                            <option value="mp4">.MP4</option>
                        </select>
                    </div>

                    <div class="col" id="qualityContainer">
                        <label>Quality</label>
                        <select id="qualitySelect">
                            <option value="best">4K Ultra</option>
                        </select>
                    </div>
                </div>

                <button id="startBtn" class="btn-main">
                    Download Now 
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                
                <button id="stopBtn" class="btn-main">Stop Download</button>

                <div id="status-area" style="width: 100%;">
                    <div class="status-header">
                        <span class="status-title">STATUS</span>
                        <span class="encrypted-badge">Encrypted</span>
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-text-row">
                            <span id="status">Ready</span>
                            <span id="percent-val">0%</span>
                        </div>
                        <div class="progress-wrapper">
                            <div class="progress-bar" id="progressBar"></div>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-box"><span class="stat-label">Size</span><span id="size" class="stat-value">-</span></div>
                        <div class="divider"></div>
                        <div class="stat-box"><span class="stat-label">Speed</span><span id="speed" class="stat-value">-</span></div>
                        <div class="divider"></div>
                        <div class="stat-box"><span class="stat-label">ETA</span><span id="eta" class="stat-value">-</span></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="content" id="historyPanel">
            <div class="history-header">
                <h4>Download History</h4>
                <button id="clearHistoryBtn" class="text-btn">Clear All</button>
            </div>
            <div id="historyList"></div>
            <button id="backBtn" class="btn-secondary">Back to Downloader</button>
        </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(html);

    let socket;
    const urlInput = shadow.getElementById('urlInput');
    const filenameInput = shadow.getElementById('filenameInput');
    const pathInput = shadow.getElementById('pathInput');
    const browseBtn = shadow.getElementById('browseBtn');
    const loadBtn = shadow.getElementById('loadBtn');
    const startBtn = shadow.getElementById('startBtn');
    const stopBtn = shadow.getElementById('stopBtn');
    const qualitySelect = shadow.getElementById('qualitySelect');
    const modeSelect = shadow.getElementById('modeSelect');
    const formatSelect = shadow.getElementById('formatSelect');
    const qualityContainer = shadow.getElementById('qualityContainer');
    const downloadControls = shadow.getElementById('downloadControls');
    const resetLink = shadow.getElementById('resetLink');
    const statusDiv = shadow.getElementById('status');
    const progressBar = shadow.getElementById('progressBar');
    const closeBtn = shadow.getElementById('closeBtn');
    const header = shadow.getElementById('header');
    const fetchStatus = shadow.getElementById('fetch-status');

    // History elements
    const historyBtn = shadow.getElementById('historyBtn');
    const mainPanel = shadow.getElementById('mainPanel');
    const historyPanel = shadow.getElementById('historyPanel');
    const historyList = shadow.getElementById('historyList');
    const clearHistoryBtn = shadow.getElementById('clearHistoryBtn');
    const backBtn = shadow.getElementById('backBtn');

    // Data for formats
    const videoFormats = ['mp4', 'mkv', 'webm', 'avi', 'mov'];
    const audioFormats = ['mp3', 'm4a', 'wav', 'opus', 'flac', 'aac'];

    urlInput.value = window.location.href;

    const stopBubbling = (e) => { e.stopPropagation(); };
    [urlInput, filenameInput, pathInput].forEach(input => {
        input.addEventListener('keydown', stopBubbling);
        input.addEventListener('keyup', stopBubbling);
        input.addEventListener('keypress', stopBubbling);
    });

    let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;
    header.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);
    function dragStart(e) {
        initialX = e.clientX - xOffset; initialY = e.clientY - yOffset;
        if (e.target === header || e.target.parentNode === header) isDragging = true;
    }
    function dragEnd() { initialX = currentX; initialY = currentY; isDragging = false; }
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX; currentY = e.clientY - initialY;
            xOffset = currentX; yOffset = currentY;
            host.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    }

    function resetUI() {
        if (stopBtn.style.display === 'flex') return;
        downloadControls.style.display = 'none';
        loadBtn.style.display = 'flex';
        loadBtn.disabled = false;
        loadBtn.innerHTML = 'Fetch Formats';
        statusDiv.textContent = 'Ready';
        statusDiv.className = '';
        progressBar.style.width = '0%';
        shadow.getElementById('percent-val').textContent = '0%';
        shadow.getElementById('speed').textContent = '-';
        shadow.getElementById('eta').textContent = '-';
        shadow.getElementById('size').textContent = '-';
        shadow.getElementById('status-area').style.display = 'none';
        stopBtn.disabled = false;
        stopBtn.innerHTML = "Stop Download";
    }

    function sanitizeFilename(name) {
        return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
    }

    function updateFormatOptions() {
        formatSelect.innerHTML = '';
        const mode = modeSelect.value;
        let options = [];

        if (mode === 'audio') {
            options = audioFormats;
            qualityContainer.style.opacity = '0.5';
            qualityContainer.style.pointerEvents = 'none';
        } else {
            options = videoFormats;
            qualityContainer.style.opacity = '1';
            qualityContainer.style.pointerEvents = 'auto';
        }

        options.forEach(ext => {
            const opt = document.createElement('option');
            opt.value = ext;
            opt.textContent = ext.toUpperCase();
            formatSelect.appendChild(opt);
        });
    }

    modeSelect.addEventListener('change', updateFormatOptions);

    browseBtn.addEventListener('click', () => {
        browseBtn.disabled = true;
        statusDiv.textContent = "Please select a folder...";
        socket.send(JSON.stringify({ action: "browse_folder" }));
    });

    // --- History functions ---
    function showHistory() {
        mainPanel.style.display = 'none';
        historyPanel.style.display = 'flex';
        historyBtn.classList.add('active');
        
        if (socket && socket.readyState === WebSocket.OPEN) {
            historyList.innerHTML = '<div class="no-history">Loading history...</div>';
            socket.send(JSON.stringify({ action: "get_history" }));
        } else {
            historyList.innerHTML = '<div class="no-history error-msg">Server disconnected. Cannot load history.</div>';
        }
    }

    function hideHistory() {
        historyPanel.style.display = 'none';
        mainPanel.style.display = 'flex';
        historyBtn.classList.remove('active');
    }

    historyBtn.addEventListener('click', () => {
        if (historyPanel.style.display === 'flex') {
            hideHistory();
        } else {
            showHistory();
        }
    });

    backBtn.addEventListener('click', hideHistory);

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all download history?")) {
            socket.send(JSON.stringify({ action: "clear_history" }));
        }
    });

    function renderHistory(history) {
        historyList.innerHTML = '';
        if (!history || history.length === 0) {
            historyList.innerHTML = '<div class="no-history">No downloads yet.</div>';
            return;
        }

        history.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'history-item';
            
            let timeStr = '';
            try {
                const date = new Date(item.timestamp);
                timeStr = date.toLocaleString();
            } catch(e) {
                timeStr = item.timestamp || '';
            }

            const badgeClass = `badge-${item.status}`;
            let badgeLabel = 'Unknown';
            if (item.status === 'finished') badgeLabel = 'Finished';
            else if (item.status === 'stopped') badgeLabel = 'Stopped';
            else if (item.status === 'failed') badgeLabel = 'Failed';

            itemEl.innerHTML = `
                <button class="history-delete-btn" data-id="${item.id}" title="Delete entry">&times;</button>
                <div class="history-item-title" title="${item.filename}">${item.filename}</div>
                <div class="history-item-meta">
                    <span class="badge ${badgeClass}">${badgeLabel}</span>
                    <span>${item.size || '-'}</span>
                </div>
                <div style="font-size: 10px; color: #8fa6a3; margin-top: 2px;">
                    ${timeStr}
                </div>
            `;

            const actionsRow = document.createElement('div');
            actionsRow.className = 'history-item-actions';

            if (item.status === 'finished') {
                const openFolderBtn = document.createElement('button');
                openFolderBtn.className = 'history-action-btn';
                openFolderBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    Show in Folder
                `;
                openFolderBtn.addEventListener('click', () => {
                    socket.send(JSON.stringify({ action: "open_folder", path: item.save_path }));
                });
                actionsRow.appendChild(openFolderBtn);
            }

            const copyLinkBtn = document.createElement('button');
            copyLinkBtn.className = 'history-action-btn';
            copyLinkBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                Copy URL
            `;
            copyLinkBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(item.url).then(() => {
                    const originalText = copyLinkBtn.innerHTML;
                    copyLinkBtn.textContent = 'Copied!';
                    setTimeout(() => { copyLinkBtn.innerHTML = originalText; }, 1500);
                });
            });
            actionsRow.appendChild(copyLinkBtn);

            itemEl.appendChild(actionsRow);

            const deleteBtn = itemEl.querySelector('.history-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = deleteBtn.getAttribute('data-id');
                socket.send(JSON.stringify({ action: "delete_history_item", id: id }));
            });

            historyList.appendChild(itemEl);
        });
    }

    function connect() {
        if (socket && socket.readyState === WebSocket.OPEN) return;
        socket = new WebSocket("ws://127.0.0.1:8000/ws");

        socket.onopen = () => fetchStatus.textContent = "Server Connected";
        socket.onclose = () => fetchStatus.textContent = "Server Disconnected";

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.status === "path_selected") {
                browseBtn.disabled = false;
                if (data.path) {
                    pathInput.value = data.path;
                    fetchStatus.textContent = "Folder updated.";
                } else {
                    fetchStatus.textContent = "Selection cancelled.";
                }
                setTimeout(() => { fetchStatus.textContent = ""; }, 2000);
            }
            else if (data.status === "formats_loaded") {
                qualitySelect.innerHTML = "";
                const bestOpt = document.createElement('option');
                bestOpt.value = "best"; bestOpt.textContent = "Best Quality";
                qualitySelect.appendChild(bestOpt);
                data.resolutions.forEach(res => {
                    const opt = document.createElement('option');
                    opt.value = res; opt.textContent = `${res}p`;
                    qualitySelect.appendChild(opt);
                });
                filenameInput.value = sanitizeFilename(data.title);
                pathInput.value = data.default_path;

                updateFormatOptions();

                loadBtn.style.display = "none";
                downloadControls.style.display = "flex";
                startBtn.style.display = "flex";
                fetchStatus.textContent = "";
                statusDiv.textContent = "Configure and Download";
            }
            else if (data.status === "downloading") {
                startBtn.style.display = "none";
                stopBtn.style.display = "flex";
                stopBtn.disabled = false;
                shadow.getElementById('status-area').style.display = 'block';
                statusDiv.textContent = data.custom_status || "Downloading...";
                progressBar.style.width = data.percent + "%";
                shadow.getElementById('percent-val').textContent = data.percent + "%";
                shadow.getElementById('speed').textContent = data.speed;
                shadow.getElementById('eta').textContent = data.eta;
                shadow.getElementById('size').textContent = data.size;
            }
            else if (data.status === "finished") {
                statusDiv.textContent = "Download Complete!";
                statusDiv.className = '';
                statusDiv.classList.add('success-msg');
                progressBar.style.width = "100%";
                stopBtn.style.display = "none";
                startBtn.style.display = "block";
                startBtn.textContent = "Download Another";
            }
            else if (data.status === "stopped") {
                statusDiv.textContent = "Cancelled by User";
                statusDiv.className = '';
                statusDiv.classList.add('error-msg');
                progressBar.style.width = "0%";
                stopBtn.style.display = "none";
                startBtn.style.display = "block";
                startBtn.textContent = "Retry Download";
            }
            else if (data.status === "error") {
                fetchStatus.textContent = data.message;
                fetchStatus.className = '';
                fetchStatus.classList.add('error-msg');
                loadBtn.disabled = false;
                loadBtn.innerHTML = "Fetch Formats";
            }
            else if (data.status === "file_check_result") {
                if (data.exists) {
                    if (!confirm("A file with this name already exists in the destination folder. Do you want to overwrite it?")) {
                        statusDiv.textContent = "Configure and Download";
                        return;
                    }
                }
                statusDiv.textContent = "Starting...";
                socket.send(JSON.stringify({
                    action: "start",
                    url: urlInput.value,
                    quality: qualitySelect.value,
                    mode: modeSelect.value,
                    format: formatSelect.value,
                    filename: filenameInput.value,
                    path: pathInput.value
                }));
            }
            else if (data.status === "history_data") {
                renderHistory(data.history);
            }
        };
    }

    function fetchFormats() {
        fetchStatus.textContent = "Fetching formats, please wait...";
        fetchStatus.className = '';
        loadBtn.disabled = true;
        loadBtn.innerHTML = "Fetching...";
        socket.send(JSON.stringify({ action: "get_formats", url: urlInput.value }));
    }

    loadBtn.addEventListener('click', fetchFormats);

    startBtn.addEventListener('click', () => {
        statusDiv.textContent = "Checking file...";
        socket.send(JSON.stringify({
            action: "check_file",
            format: formatSelect.value,
            filename: filenameInput.value,
            path: pathInput.value
        }));
    });

    stopBtn.addEventListener('click', () => {
        stopBtn.disabled = true;
        stopBtn.textContent = "Stopping...";
        statusDiv.textContent = "Stopping process...";
        socket.send(JSON.stringify({ action: "stop" }));
    });

    resetLink.addEventListener('click', () => {
        if (stopBtn.style.display === 'block') return;
        urlInput.value = window.location.href;
        resetUI();
        fetchFormats();
    });

    urlInput.addEventListener('input', resetUI);
    closeBtn.addEventListener('click', () => host.style.display = 'none');

    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "toggle_ui") {
            if (host.style.display === "none") {
                host.style.display = "block";
                if (urlInput.value !== window.location.href) {
                    urlInput.value = window.location.href;
                    resetUI();
                }
                connect();
            } else {
                host.style.display = "none";
            }
        }
    });

    connect();
}