function findTitle(html) {
  const element = document.createElement("html");
  element.innerHTML = html;
  const titles = element.getElementsByClassName("page-title");
  if (titles.length > 0) {
    return titles[0].innerText();
  }
  return null;
}

async function getNotionRaw(url, proxyUrl, type = "page") {
  let reqUrl = proxyUrl;
  if (!proxyUrl.endsWith("/")) {
    reqUrl += "/";
  }
  reqUrl += `${type}/`;
  reqUrl = reqUrl + url;
  const resp = await fetch(reqUrl);
  const result = {
    status: resp.status,
    data: null,
  };
  if (resp.status === 200) {
    try {
      result.data = await resp.json();
    } catch (err) {
      console.warn(`Error while getNotionRaw ${url} ${proxyUrl}: `, err);
    }
  }
  return result;
}

function extractTablePageIds(notionData) {
  const pageIds = [];
  if (!notionData.hasOwnProperty("recordMap")) {
    return [];
  }
  const recordMap = notionData["recordMap"];
  if (!recordMap.hasOwnProperty("collection_view")) {
    return [];
  }
  const collectionView = recordMap["collection_view"];
  for (const viewId in collectionView) {
    const view = collectionView[viewId];
    if (!view.hasOwnProperty("value")) {
      continue;
    }
    const viewValue = view["value"];
    if (viewValue["type"] !== "table") {
      continue;
    }
    if (viewValue.hasOwnProperty("page_sort")) {
      pageIds.push(...viewValue["page_sort"]);
    }
  }

  return pageIds;
}

function paginate(arr, size) {
  return arr.reduce((acc, val, i) => {
    let idx = Math.floor(i / size);
    let page = acc[idx] || (acc[idx] = []);
    page.push(val);

    return acc;
  }, []);
}

function getUrlParts(url) {
  // console.log(`getUrlParts: ${url}`);
  const matches = url.match(
    /^(?:(http[s]?|ftp):\/)?\/?([^:\/\s]+)((?:\/[\-\w]+)*\/?)([\w\-\.]+[^#?\s]+)?(.*)?(#[\w\-]+)?$/i
  );
  if (matches.length < 3) {
    return null;
  }

  const base = `${matches[1]}://${matches[2]}`;
  const id = matches[3].replace(/\//g, "");

  const queryParams = {};
  if (matches[5]) {
    const queryStr = matches[5].replace("?", "");
    const queryParts = queryStr.split("&");
    for (const part of queryParts) {
      const kvParts = part.split("=");
      if (kvParts.length === 2);
      queryParams[kvParts[0]] = kvParts[1];
    }
  }
  return {
    base,
    id,
    queryParams,
  };
}

function extractCollectionIds(notionData) {
  const pageIds = {
    spaceId: null,
    collectionId: null,
    collectionViewId: null,
  };
  if (!notionData.hasOwnProperty("recordMap")) {
    return [];
  }
  const recordMap = notionData["recordMap"];
  if (
    !recordMap.hasOwnProperty("collection_view") ||
    !recordMap.hasOwnProperty("collection")
  ) {
    return [];
  }
  const collectionView = recordMap["collection_view"];
  for (const viewId in collectionView) {
    const view = collectionView[viewId];
    if (!view.hasOwnProperty("value")) {
      continue;
    }
    const viewValue = view["value"];
    console.log("viewValue");
    console.log(viewValue);
    if (viewValue["type"] !== "table") {
      continue;
    }
    pageIds.spaceId = viewValue["space_id"];
    pageIds.collectionViewId = viewId;
  }

  const collection = recordMap["collection"];
  const collectionIds = Object.keys(collection);
  if (collectionIds.length > 0) {
    pageIds.collectionId = collectionIds[0];
  }
  return pageIds;
}

function extractCollectionBlockData(notionData) {
  const res = [];
  if (!notionData.hasOwnProperty("recordMap")) {
    return [];
  }
  const recordMap = notionData["recordMap"];
  if (
    !recordMap.hasOwnProperty("block") ||
    !recordMap.hasOwnProperty("block")
  ) {
    return [];
  }
  const blocks = recordMap["block"];
  for (const blockId in blocks) {
    const item = {
      name: null,
      id: null,
    };
    const block = blocks[blockId];
    if (block.hasOwnProperty("value") && block.value.type === "page") {
      const blockValue = block["value"];
      item.id = blockValue.id;
      if (
        blockValue.hasOwnProperty("properties") &&
        blockValue.properties.hasOwnProperty("title")
      ) {
        item.name = blockValue.properties.title[0][0];
      }

      res.push(item);
    }
  }
  return res;
}

function formatQueryParams(params) {
  const parts = [];
  Object.keys(params).forEach((pk) => parts.push(`${pk}=${params[pk]}`));
  return parts.join("&");
}

function createNotionPageUrl(pageBase, id) {
  if (!pageBase.endsWith("/")) {
    pageBase += "/";
  }
  return pageBase + id.replace(/\-/g, "");
}

async function prepareMupNameToNotionPage(mainPage, proxyUrl) {
  const parts = getUrlParts(mainPage);
  let notionBase = parts.base;
  if (!notionBase.endsWith("/")) {
    notionBase += "/";
  }

  console.log(
    `prepareMupNameToNotionPage: ${notionBase}, ${mainPage}, ${proxyUrl}`
  );
  const mainPageResp = await getNotionRaw(mainPage, proxyUrl, "page");
  if (mainPageResp.status !== 200 || !mainPageResp.data) {
    return null;
  }
  const collectionIds = extractCollectionIds(mainPageResp.data);
  console.log(`collectionIds: `, collectionIds);
  const queryParams = formatQueryParams(collectionIds);
  console.log(`queryParams: `, queryParams);
  let mainPageWithParams = mainPage;
  mainPageWithParams += mainPage.includes("?") ? "&" : "?";
  mainPage += queryParams;

  const collectionResp = await getNotionRaw(mainPage, proxyUrl, "collection");
  if (collectionResp.status !== 200 || !collectionResp.data) {
    return null;
  }
  const pageItems = extractCollectionBlockData(collectionResp.data);

  const mupNameToNotionPage = {};

  for (const item of pageItems) {
    const url = createNotionPageUrl(notionBase, item.id);
    mupNameToNotionPage[item.name] = url;
  }
  return mupNameToNotionPage;
}
