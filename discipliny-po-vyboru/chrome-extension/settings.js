const notionUrlInput = document.getElementById("notion-base-url-input");
const proxyUrlInput = document.getElementById("proxy-url-input");

const applyButton = document.getElementById("apply-btn");
const defaultButton = document.getElementById("default-btn");

const messageHolder = document.getElementById("message-holder");

applyButton.addEventListener("click", handleNotionBaseApply);
defaultButton.addEventListener("click", handleDefaultApply);

notionUrlInput.addEventListener("change", () => {
  messageHolder.innerText = "";
});

proxyUrlInput.addEventListener("change", () => {
  messageHolder.innerText = "";
});


function setSettingsPromise(key, value) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "set", key, value }, async (resp) => {
      resolve(await resp);
    });
  });
}

async function getSettingsPromise(key) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "get", key: key }, async (resp) => {
      resolve(await resp);
    });
  });
}

function getValues(keys) {
  return Promise.allSettled(
    keys.map((key) =>
      getSettingsPromise(key).then((res) => {
        if (res && res.success) {
          return res.value;
        }
        return null;
      })
    )
  ).then((results) => {
    const keyVal = {};
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const key = keys[i];
      if (result.status === "fulfilled") {
        keyVal[key] = result.value;
      }
    }
    return keyVal;
  });
}

function setUpValuesFromStorage() {
  return getValues([NOTION_MAIN_PAGE_KEY, PROXY_URL_KEY]).then((res) => {
    notionUrlInput.value = res[NOTION_MAIN_PAGE_KEY] || "";
    proxyUrlInput.value = res[PROXY_URL_KEY] || "";
  });
}

function setMessage(message, success) {
  if (success) {
    messageHolder.classList.add("text-success");
    messageHolder.classList.remove("text-danger");
  } else {
    messageHolder.classList.remove("text-success");
    messageHolder.classList.add("text-danger");
  }
  messageHolder.innerText = message;
}

function setDefaultValues() {
  return saveValues({
    [NOTION_MAIN_PAGE_KEY]: NOTION_MAIN_PAGE_VALUE,
    [PROXY_URL_KEY]: PROXY_URL_VALUE,
  });
}

function saveValues(keyValues) {
  return Promise.allSettled(
    Object.keys(keyValues).map((key) => {
      return setSettingsPromise(key, keyValues[key]);
    })
  ).then((results) => {
    let success = true;
    for (const result of results) {
      if (
        result.status !== "fulfilled" ||
        !result.value ||
        !result.value.success
      ) {
        success = false;
        break;
      }
    }

    const message = success ? "Сохранено" : "Ошибка";
    setMessage(message, success);
  });
}

function handleNotionBaseApply(event) {
  event.preventDefault();
  const proxyUrl = proxyUrlInput.value;
  const notionUrl = notionUrlInput.value;
  return saveValues({
    [NOTION_MAIN_PAGE_KEY]: notionUrl,
    [PROXY_URL_KEY]: proxyUrl,
  });
}

function handleDefaultApply() {
  setDefaultValues().then(() => setUpValuesFromStorage());
}

setUpValuesFromStorage();
