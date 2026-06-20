chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" }).catch(() => {
    // Content script not loaded — inject it, then retry
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["loader.js"]
    }).then(() => {
      // Give the module a moment to initialize
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" }).catch(() => {
          console.warn("Could not toggle UI even after injection. Try refreshing the page.");
        });
      }, 500);
    }).catch(() => {
      console.warn("Could not inject content script. Try refreshing the page.");
    });
  });
});

// Listener to extract cookies for the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_cookies") {
    if (!chrome.cookies) {
      sendResponse({ cookies: [] });
      return true;
    }
    // Get cookies for the specified domain
    chrome.cookies.getAll({ domain: request.domain }, (cookies) => {
      sendResponse({ cookies: cookies || [] });
    });
    return true; // Keep the message channel open for the async response
  }
});

// --- Auto Reload Extension on Server Restart ---
let ws = null;
let wasConnected = false;

function connectToDevServer() {
  // Use a different path or query param to differentiate from downloader websocket
  ws = new WebSocket("ws://localhost:8000/ws?client=extension_bg");

  ws.onopen = () => {
    console.log("Connected to MediaDown server");
    if (wasConnected) {
      console.log("Server restarted. Reloading extension...");
      chrome.runtime.reload();
    }
    wasConnected = true;
  };

  ws.onclose = () => {
    // Retry connection after 3 seconds
    setTimeout(connectToDevServer, 3000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

// Start connection monitor
connectToDevServer();

// --- Chrome Download Interception ---
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  // Ignore data/blob URLs
  if (downloadItem.url.startsWith('blob:') || downloadItem.url.startsWith('data:')) {
    suggest();
    return false;
  }

  // Ask the active tab if we should intercept
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      suggest();
      return;
    }
    const activeTab = tabs[0];
    
    // Inject content script if missing, then send message
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ["loader.js"]
    }).then(() => {
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'intercept_download_prompt',
        item: downloadItem
      }, (response) => {
        if (chrome.runtime.lastError || !response) {
          suggest();
          return;
        }
        
        if (response.intercept) {
          chrome.downloads.cancel(downloadItem.id);
          // Tell the content script to trigger direct download via UI
          chrome.tabs.sendMessage(activeTab.id, {
            action: 'trigger_direct_download',
            url: downloadItem.url,
            filename: downloadItem.filename
          });
        } else {
          suggest();
        }
      });
    }).catch(() => {
      suggest();
    });
  });

  return true; // indicates asynchronous suggest
});
