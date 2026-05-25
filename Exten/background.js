chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggle_ui" }).catch(() => {
    console.warn("Could not toggle UI. Content script may not be loaded. Try refreshing the page.");
  });
});
