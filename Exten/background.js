chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" }).catch(() => {
    console.warn("Could not toggle UI. Content script may not be loaded. Try refreshing the page.");
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

