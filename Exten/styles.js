export const mainStylesText = `
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
    @keyframes spin { to { transform: rotate(360deg); } }
`;

export const videoOverlayStylesText = `
    .mediavar-video-wrap { position:relative !important; }
    .mediavar-dl-btn {
        position:absolute !important;
        top:10px !important; left:10px !important;
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
        transform:none !important;
        scale:1 !important;
        margin:0 !important;
        box-sizing:border-box !important;
        min-width:max-content !important;
    }
    .mediavar-dl-btn svg { flex-shrink:0 !important; transform:none !important; }
    .mediavar-video-wrap:hover .mediavar-dl-btn { opacity:1 !important; }
    .mediavar-dl-btn:hover { 
        background:rgba(99,102,241,0.85) !important; 
        transform:none !important;
        scale:1 !important;
    }

    /* Thumbnail download button (shown on hover of parent thumbnail) */
    .mediavar-thumb-dl-btn {
        top:8px !important; left:8px !important;
        padding:5px 10px !important;
        border-radius:7px !important;
        font-size:11px !important;
    }
    a:hover > .mediavar-thumb-dl-btn,
    *:hover > a > .mediavar-thumb-dl-btn,
    ytd-thumbnail:hover .mediavar-thumb-dl-btn,
    [data-mediavar-thumb-btn]:hover .mediavar-thumb-dl-btn {
        opacity:1 !important;
    }
`;