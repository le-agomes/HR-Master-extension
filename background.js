// Listen for messages from external web pages (specified in manifest.json -> externally_connectable)
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (message.type === 'AUTH_SUCCESS' && message.token) {
      console.log("Received token from external page");
      
      // Save the token to local storage
      chrome.storage.local.set({ jwt: message.token }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving token:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log("Token saved successfully.");
          sendResponse({ success: true });
        }
      });

      // Return true to indicate we wish to send a response asynchronously
      return true;
    }
  }
);