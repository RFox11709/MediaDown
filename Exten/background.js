chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" }).catch(() => {
    console.warn("Could not toggle UI. Content script may not be loaded. Try refreshing the page.");
  });
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

