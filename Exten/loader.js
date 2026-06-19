(async () => {
    try {
        const src = chrome.runtime.getURL('content.js');
        await import(src);
    } catch (err) {
        console.error('Failed to load MediaVal module:', err);
    }
})();