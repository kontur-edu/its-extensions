try {
  importScripts("./constants.js");
} catch (e) {
  console.error(e);
}

const SETTINGS = {
  [NOTION_MAIN_PAGE_KEY]: NOTION_MAIN_PAGE_VALUE,
  [PROXY_URL_KEY]: PROXY_URL_VALUE,
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === "set") {
    if (request.hasOwnProperty("key") && request.hasOwnProperty("value")) {
      const key = request["key"];
      SETTINGS[key] = request["value"];
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
      sendResponse({ success: true, value: SETTINGS[key] });
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
});
