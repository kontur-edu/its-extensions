const SETTINGS = {
  [NOTION_MAIN_PAGE_KEY]: NOTION_MAIN_PAGE_VALUE,
  [PROXY_URL_KEY]: PROXY_URL_VALUE,
};

const mupNameToItems = {};

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const loadingDiv = document.createElement("div");
const LOADING_DIV_TAG = "its_ext_loading_container";
loadingDiv.id = LOADING_DIV_TAG;
loadingDiv.style = "position: fixed; bottom: 0; right: 0;";
loadingDiv.innerHTML = `<button class="btn btn-primary" type="button" disabled>
<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
ITS Extension is loading...
</button>`;
loadingDiv.classList.add("hide");
document.body.appendChild(loadingDiv);

function startLoading() {
  document.getElementById(LOADING_DIV_TAG).classList.remove("hide");
}

function finishLoading() {
  document.getElementById(LOADING_DIV_TAG).classList.add("hide");
}

async function waitForMups(mupNameToNotionInfo) {
  const locations = getMupCardLocations();
  if (locations.length > 0 && locations.every((i) => i.descriptionElement)) {
    prepareItems(locations, mupNameToItems);
    await placeButtonsAndFrames(mupNameToItems, mupNameToNotionInfo);
  } else {
    await timeout(1000);
    waitForMups(mupNameToNotionInfo);
  }
}

function getMupCardLocations() {
  const res = [];
  // available-mup-table
  const mupTable = document.getElementsByClassName("available-mup-table");
  if (mupTable.length === 0) return [];
  const tbodies = mupTable[0].getElementsByTagName("tbody");
  for (const tbody of tbodies) {
    const infoItem = {
      mupName: "",
      descriptionElement: null,
    };
    const nameHolders = tbody.getElementsByClassName(
      "row-available-mup-primary-info"
    );
    if (nameHolders.length === 0) continue;
    const nameHolderMupNameSpans =
      nameHolders[0].getElementsByClassName("col-mup-name");
    if (nameHolderMupNameSpans.length === 0) continue;
    infoItem.mupName = nameHolderMupNameSpans[0].innerText;

    const details = tbody.getElementsByClassName("el-card__body"); // mup-details-card
    if (details.length > 0) {
      infoItem.descriptionElement = details[0];
    }
    res.push(infoItem);
  }

  return res;
}

function prepareItems(locations, itemsToFill) {
  for (const loc of locations) {
    itemsToFill[loc.mupName] = {
      mupName: loc.mupName,
      descriptionElement: loc.descriptionElement,
      button: null,
      frame: null,
    };
  }
}

function getUrlByMupName(mupName, mupNameToNotionInfo) {
  if (mupNameToNotionInfo.hasOwnProperty(mupName)) {
    return mupNameToNotionInfo[mupName].url;
  }

  for (const mupNameFromNotion of Object.keys(mupNameToNotionInfo).sort()) {
    if (mupNameFromNotion.startsWith(mupName)) {
      return mupNameToNotionInfo[mupNameFromNotion].url;
    }
  }

  return null;
}

function getTagsByMupName(mupName, mupNameToNotionInfo) {
  if (mupNameToNotionInfo.hasOwnProperty(mupName)) {
    return mupNameToNotionInfo[mupName].properties;
  }

  for (const mupNameFromNotion of Object.keys(mupNameToNotionInfo).sort()) {
    if (mupNameFromNotion.startsWith(mupName)) {
      return mupNameToNotionInfo[mupNameFromNotion].properties;
    }
  }

  return null;
}

function checkTagName(name) {
  for (const tagPart of ALLOWED_TAG_PARTS) {
    if (name.includes(tagPart)) {
      return true;
    }
  }
  return false;
}

function checkIsUrl(str) {
  return /^(?:(http[s]?|ftp):\/)\/?([^:\/\s]+)((?:\/[\-\w]+)*\/?)([\w\-\.]+[^#?\s]+)?(.*)?(#[\w\-]+)?$/i.test(
    str
  );
}

function addTags(item, tags) {
  const divElement = document.createElement("div");
  divElement.classList.add("ext_tag_holder");
  let count = 0;
  for (const tagName in tags) {
    const nameLower = tagName.toLocaleLowerCase();
    if (!checkTagName(nameLower)) continue;
    count++;
    const tagValue = tags[tagName];
    const isLink = checkIsUrl(tagValue);
    const htmlTagName = isLink ? "a" : "span";
    const tagElement = document.createElement(htmlTagName);
    tagElement.classList.add("load-title-tag", "el-tag");

    if (nameLower.startsWith("тест") || nameLower.startsWith("отбор")) {
      if (tagValue.toLocaleLowerCase().startsWith("неогр")) {
        tagElement.classList.add("el-tag--success");
      } else {
        tagElement.classList.add("el-tag--danger");
      }
    } else {
      tagElement.classList.add("el-tag--warning");
    }
    if (isLink) {
      tagElement.href = tagValue;
      tagElement.setAttribute("target", "_blank");
      tagElement.setAttribute("rel", "noopener noreferrer");
      tagElement.textContent = `${tagName}`;
    } else {
      tagElement.textContent = `${tagName}: ${tagValue}`;
    }
    divElement.appendChild(tagElement);
  }
  if (count > 0) {
    item.descriptionElement.appendChild(divElement);
  }
}

function addLink(item, url) {
  const linkElement = document.createElement("a");
  linkElement.href = url;
  linkElement.setAttribute("target", "_blank");
  linkElement.setAttribute("rel", "noopener noreferrer");
  linkElement.textContent = "Источник";
  item.descriptionElement.appendChild(linkElement);
}

function addButton(item) {
  const button = document.createElement("button");
  button.innerText = "Подробная информация";
  button.style = "margin-right: 1em";
  button.classList.add(
    "el-button",
    "el-button--primary",
    "el-button--small",
    "is-plain"
  );

  item.descriptionElement.appendChild(button);
  item.button = button;
}

function addFrame(item, url) {
  const iframe = document.createElement("iframe");
  iframe.name = item.mupName;

  iframe.src = url;
  iframe.src = SETTINGS[PROXY_URL_KEY] + url;
  iframe.classList.add("its_ext_display_none", "its_ext_iframe");
  item.descriptionElement.appendChild(iframe);
  item.frame = iframe;
}

function addBr(item) {
  const brElement = document.createElement("br");
  item.descriptionElement.appendChild(brElement);
}

function addMarkup(item, mupNameToNotionInfo) {
  if (!item.descriptionElement) {
    return;
  }
  const url = getUrlByMupName(item.mupName, mupNameToNotionInfo);
  const tags = getTagsByMupName(item.mupName, mupNameToNotionInfo);

  addBr(item);
  addTags(item, tags);
  if (url) {
    addBr(item);

    addButton(item);
    addLink(item, url);

    addFrame(item, url);

    item.button.addEventListener("click", () => {
      if (item.frame) {
        item.frame.classList.toggle("its_ext_display_none");
      }
    });
  }
}

async function placeButtonsAndFrames(items, mupNameToNotionInfo) {
  for (const mupName in items) {
    const item = items[mupName];
    addMarkup(item, mupNameToNotionInfo);
  }
}

function getName(elem) {
  let children = elem.getElementsByTagName("div");
  if (children.length === 0) return null;
  children = children[0].getElementsByTagName("div");
  if (children.length === 0) return null;
  children = children[0].getElementsByTagName("span");
  if (children.length === 0) return null;
  return children[0].innerText;
}

async function getSettingsPromise(key) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "get", key: key }, async (resp) => {
      resolve(await resp);
    });
  });
}

function onLoad() {
  startLoading();
  timeout(1)
    .then(() => {
      return Promise.allSettled([
        getSettingsPromise(PROXY_URL_KEY).then((resp) => {
          const url = resp.value;
          if (url) {
            SETTINGS[PROXY_URL_KEY] = url;
          }
        }),
        getSettingsPromise(NOTION_MAIN_PAGE_KEY).then((resp) => {
          const url = resp.value;
          if (url) {
            SETTINGS[NOTION_MAIN_PAGE_KEY] = url;
          }
        }),
      ]);
    })
    .then(() => {
      return prepareMupNameToNotionInfo(
        SETTINGS[NOTION_MAIN_PAGE_KEY],
        SETTINGS[PROXY_URL_KEY]
      );
    })
    .then((mupNameToNotionInfo) => {
      if (!mupNameToNotionInfo) {
        alert(
          "Не получилось подготовить данные, проверьте настройки расширения Дисциплин по выбору"
        );
        return;
      }
      return waitForMups(mupNameToNotionInfo);
    })
    .catch((err) => {
      alert("При подготовке данных расширения произошла ошибка: " + err);
      console.error("Error: ", err);
    })
    .finally(() => finishLoading());
}

window.addEventListener("load", () => onLoad(), false);
