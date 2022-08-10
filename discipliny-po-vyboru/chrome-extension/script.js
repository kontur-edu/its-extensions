const SETTINGS = {
  [NOTION_MAIN_PAGE_KEY]: NOTION_MAIN_PAGE_VALUE,
  [PROXY_URL_KEY]: PROXY_URL_VALUE,
};
// const PROXY_URL = "https://d5dfhr6m42a5gefn5qmb.apigw.yandexcloud.net/notion/";
// const DEFAULT_NOTION_MAIN_PAGE =
//   "https://fiiturfu.notion.site/423725f4115046c9bc29df894a87dbe1?v=5051b6fbb5d34ad38aa681202d595071";
// const NOTION_BASE = "https://fiiturfu.notion.site/";
const mupNameToItems = {};

let mupNameToNotionPage = {};

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMups() {
  console.warn("waitForMups: loop");

  const locations = getMupCardLocations();
  console.log("locations");
  console.log(locations);
  if (locations.length > 0 && locations.every((i) => i.descriptionElement)) {
    prepareItems(locations, mupNameToItems);
    console.log("mupNameToItems");
    console.log(mupNameToItems);
    await placeButtonsAndFrames(mupNameToItems, mupNameToNotionPage);
  } else {
    await timeout(1000);
    waitForMups();
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

function getUrlByMupName(mupName, mupNameToNotionPage) {
  if (mupNameToNotionPage.hasOwnProperty(mupName)) {
    return mupNameToNotionPage[mupName];
  }

  for (const mupNameFromNotion of Object.keys(mupNameToNotionPage).sort()) {
    if (mupNameFromNotion.startsWith(mupName)) {
      return mupNameToNotionPage[mupNameFromNotion];
    }
  }

  return null;
}

async function placeButtonsAndFrames(items, mupNameToNotionPage) {
  for (const mupName in items) {
    const item = items[mupName];
    if (item.descriptionElement) {
      const url = getUrlByMupName(item.mupName, mupNameToNotionPage);
      if (url) {
        const button = document.createElement("button");
        button.innerText = "Подробная информация";
        button.style = "margin: 0.5em";
        button.classList.add(
          "el-button",
          "el-button--primary",
          "el-button--small",
          "is-plain"
        );

        item.descriptionElement.appendChild(button);

        item.button = button;

        const iframe = document.createElement("iframe");
        iframe.name = item.mupName;

        iframe.src = url;
        iframe.src = SETTINGS[PROXY_URL_KEY] + url;
        iframe.style = "width: 100%; min-height: 400px";
        iframe.classList.add("its_ext_display_none");
        item.descriptionElement.appendChild(iframe);
        item.frame = iframe;

        button.addEventListener("click", () => {
          console.log("button click");
          if (item.frame) {
            item.frame.classList.toggle("its_ext_display_none");
          } else {
            console.log("frame not set");
          }
        });
      } else {
        console.warn(`Page not found for ${item.mupName}`);
      }
    }
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
  timeout(1)
    .then(() => {
      return Promise.allSettled([
        getSettingsPromise(PROXY_URL_KEY).then((resp) => {
          const url = resp.value;
          console.log(`${PROXY_URL_KEY}: ${url}`);
          if (url) {
            SETTINGS[PROXY_URL_KEY] = url;
          }
        }),
        getSettingsPromise(NOTION_MAIN_PAGE_KEY).then((resp) => {
          const url = resp.value;
          console.log(`${NOTION_MAIN_PAGE_KEY}: ${url}`);
          if (url) {
            SETTINGS[NOTION_MAIN_PAGE_KEY] = url;
          }
        }),
      ]);
    })
    .then(() => console.log(SETTINGS))
    .then(() => {
      return prepareMupNameToNotionPage(
        SETTINGS[NOTION_MAIN_PAGE_KEY],
        SETTINGS[PROXY_URL_KEY]
      );
    })
    .then((mupNameToNotionUrl) => {
      console.log("mupNameToNotionUrl");
      console.log(mupNameToNotionUrl);
      for (const mupName in mupNameToNotionUrl) {
        mupNameToNotionPage[mupName] = mupNameToNotionUrl[mupName];
      }
      // alert(mupNameToNotionPage);

      return waitForMups();
    })
    .catch((err) => {
      console.error("Error: ", err);
    });
}

window.addEventListener("load", () => onLoad(), false);
