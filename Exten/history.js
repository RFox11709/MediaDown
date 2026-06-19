export function renderHistory(historyList, history, socket) {
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
        const badgeLabel = { finished: 'Finished', stopped: 'Stopped', failed: 'Failed' }[item.status] || item.status;

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