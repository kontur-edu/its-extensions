chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(`chrome.runtime.onMessage.addListener`);
  console.log(request);
  if (request.type === "set") {
    if (request.hasOwnProperty("key") && request.hasOwnProperty("value")) {
      const key = request["key"];
      chrome.storage.sync.set({ [key]: request["value"] });
      sendResponse({
        success: true,
      });
    } else {
      sendResponse({
        success: false,
      });
    }
  } else if (request.type === "get") {
    if (request.hasOwnProperty("key")) {
      const key = request["key"];
      chrome.storage.sync.get(request["key"], (val) => {
        sendResponse({ success: true, value: val[key] });
      });
    } else {
      sendResponse({
        success: false,
      });
    }
  } else {
    sendResponse({ success: false });
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log(`Extension Loaded`);
});
