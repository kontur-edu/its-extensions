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

async function prepareMupNameToNotionInfo(mainPage, proxyUrl) {
  const parts = getUrlParts(mainPage);
  let notionBase = parts.base;
  if (!notionBase.endsWith("/")) {
    notionBase += "/";
  }

  const mainPageResp = await getNotionRaw(mainPage, proxyUrl, "page");
  if (mainPageResp.status !== 200 || !mainPageResp.data) {
    return null;
  }
  const collectionIds = extractCollectionIds(mainPageResp.data);
  const queryParams = formatQueryParams(collectionIds);
  let mainPageWithParams = mainPage;
  mainPageWithParams += mainPage.includes("?") ? "&" : "?";
  mainPageWithParams += queryParams;

  const collectionResp = await getNotionRaw(
    mainPageWithParams,
    proxyUrl,
    "collection"
  );
  if (collectionResp.status !== 200 || !collectionResp.data) {
    return null;
  }
  const collectionData = parseCollectionData(collectionResp.data);

  const mupNameToInfo = createMupNameToInfo(collectionData, notionBase);

  return mupNameToInfo;
}

function parseCollectionData(notionData) {
  /*const block = {
    id: "",
    name: "",
    parent_id: "",
    properties: {
      "": "",
    },
  };
  
  const collection = {
    id: "",
    name: "",
    schema: { id: "name" },
  };*/
  const res = {
    blocks: [],
    collections: [],
  };

  if (
    !notionData.hasOwnProperty("recordMap") ||
    !notionData["recordMap"].hasOwnProperty("block") ||
    !notionData["recordMap"].hasOwnProperty("collection")
  ) {
    return res;
  }

  const recordMap = notionData["recordMap"];
  const blocks = recordMap["block"];
  for (const blockId in blocks) {
    const block = blocks[blockId];
    if (!block.hasOwnProperty("value")) {
      continue;
    }

    const blockValue = block.value;
    const blockInfo = {
      id: blockValue.id,
      name: null,
      parent_id: blockValue.parent_id,
      properties: {},
    };
    if (blockValue.hasOwnProperty("properties")) {
      for (const propName in blockValue.properties) {
        const propValues = blockValue.properties[propName].flat(Infinity);
        const propValue = propValues.length > 0 ? propValues[0] : "";
        blockInfo.properties[propName] = propValue;
      }
      if (blockInfo.properties.hasOwnProperty("title")) {
        blockInfo.name = blockInfo.properties.title;
      }
    }
    res.blocks.push(blockInfo);
  }

  const collections = recordMap["collection"];
  for (const collectionId in collections) {
    const collection = collections[collectionId];
    if (!collection.hasOwnProperty("value")) {
      continue;
    }
    const schema = {};
    const collectionValue = collection.value;
    if (collectionValue.hasOwnProperty("schema")) {
      for (const schemaId in collectionValue.schema) {
        schema[schemaId] = collectionValue.schema[schemaId].name;
      }
    }
    res.collections.push({
      id: collectionValue.id,
      name: collectionValue.name,
      schema: schema,
    });
  }

  return res;
}

function createMupNameToInfo(collectionData, pageBase) {
  const res = {};

  const blocks = collectionData.blocks;
  const idToCollection = {};
  for (const collection of collectionData.collections) {
    idToCollection[collection.id] = collection;
  }
  for (const block of blocks) {
    const url = createNotionPageUrl(pageBase, block.id);

    const properties = {};
    if (idToCollection.hasOwnProperty(block.parent_id)) {
      const schema = idToCollection[block.parent_id].schema;
      for (const propId in block.properties) {
        if (schema.hasOwnProperty(propId)) {
          const propName = schema[propId];
          properties[propName] = block.properties[propId];
        }
      }
    }
    res[block.name] = {
      url,
      properties,
    };
  }
  return res;
}
