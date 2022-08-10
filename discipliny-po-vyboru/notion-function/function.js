const NotionPageToHtml = require("notion-page-to-html");
const fetch = require("node-fetch");

const REQUEST_TYPE_HTML = "html";
const REQUEST_TYPE_PAGE = "page";
const REQUEST_TYPE_COLLECTION = "collection";

async function postData(url, obj) {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(obj),
  };
  const resp = await fetch(url, options);
  const result = {
    status: resp.status,
    data: null,
  };
  if (resp.status === 200) {
    try {
      result.data = await resp.json();
    } catch (err) {
      console.warn(`Error while post: `, err);
    }
  }
  return result;
}

function formatId(idRaw) {
  const partCount = 5;
  const idParts = [];
  let currentIdx = 0;
  for (let i = 0; i < partCount; i++) {
    let length = 4;
    if (i == 0) length = 8;
    else if (i == partCount - 1) length = idRaw.length - i;
    idParts.push(idRaw.substring(currentIdx, currentIdx + length));
    currentIdx += length;
  }
  return idParts.join("-");
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

const LOAD_CACHED_PAGE_CHUNK_PART = "api/v3/loadCachedPageChunk";

async function getNotionCachedDataFromPage(url) {
  const parts = getUrlParts(url);
  const id = formatId(parts.id);
  const reqUrl = parts.base + "/" + LOAD_CACHED_PAGE_CHUNK_PART;
  const reqBody = {
    page: { id: id },
    limit: 100,
    cursor: { stack: [] },
    chunkNumber: 0,
    verticalColumns: false,
  };

  const res = await postData(reqUrl, reqBody);
  return res;
}

const QUERY_COLLECTION_PART = "api/v3/queryCollection?src=reset";
async function getNotionQueryCollection(url) {
  let urlParts = getUrlParts(url);
  let urlBase = urlParts.base;
  const queryParams = urlParts.queryParams;
  if (!urlBase.endsWith("/")) {
    urlBase += "/";
  }
  const reqUrl = urlBase + QUERY_COLLECTION_PART;
  const spaceId = queryParams.spaceId;
  const collectionId = queryParams.collectionId;
  const collectionViewId = queryParams.collectionViewId;
  const reqBody = {
    collection: {
      id: collectionId,
      spaceId: spaceId,
    },
    collectionView: {
      id: collectionViewId,
      spaceId: spaceId,
    },
    loader: {
      type: "reducer",
      reducers: {
        "results:multi_select:all": {
          type: "results",
          filter: {
            operator: "and",
            filters: [],
          },
          limit: 300,
        },
      },
      sort: [],
      searchQuery: "",
      userTimeZone: "Asia/Yekaterinburg",
    },
  };

  const res = await postData(reqUrl, reqBody);
  return res;
}

async function handleNotionRaw(url, type) {
  let notionResp = { data: {}, status: 404 };
  if (type === REQUEST_TYPE_PAGE) {
    notionResp = await getNotionCachedDataFromPage(url);
  } else if (type === REQUEST_TYPE_COLLECTION) {
    notionResp = await getNotionQueryCollection(url);
  }
  const result = {
    statusCode: notionResp.status,
    headers: { "Content-Type": "application/json" },
    body: notionResp.data,
  };

  return result;
}

function removeTitle(html) {
  return html.replace(`<header>`, `<header style="display: none">`);
}

function fixLinks(html, notionBase) {
  let absolutePathStart = notionBase;
  if (!absolutePathStart.endsWith("/")) {
    absolutePathStart += "/";
  }
  return html.replace(/href="\//g, `href="${absolutePathStart}`);
}

function prepareHtml(html, notionBase) {
  html = removeTitle(html);
  return fixLinks(html, notionBase);
}

async function handleNotion(url, notionBase) {
  const { title, icon, cover, html } = await NotionPageToHtml.convert(url);

  const htmlPrepared = prepareHtml(html, notionBase);
  const result = {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
    body: htmlPrepared,
  };

  return result;
}

module.exports.handler = async function (event, context) {
  let requestType = REQUEST_TYPE_HTML;
  let pageUrl = event.url;
  if (pageUrl.startsWith(`/notion/${REQUEST_TYPE_PAGE}/`)) {
    requestType = REQUEST_TYPE_PAGE;
    pageUrl = pageUrl.replace(`/notion/${REQUEST_TYPE_PAGE}/`, "");
  } else if (pageUrl.startsWith(`/notion/${REQUEST_TYPE_COLLECTION}/`)) {
    requestType = REQUEST_TYPE_COLLECTION;
    pageUrl = pageUrl.replace(`/notion/${REQUEST_TYPE_COLLECTION}/`, "");
  } else if (pageUrl.startsWith("/notion/")) {
    pageUrl = pageUrl.replace("/notion/", "");
  }
  const urlParts = getUrlParts(pageUrl);
  const pageUrlCleared = `${urlParts.base}/${urlParts.id}`;
  if (
    requestType === REQUEST_TYPE_PAGE ||
    requestType === REQUEST_TYPE_COLLECTION
  ) {
    const response = await handleNotionRaw(pageUrl, requestType);
    return response;
  }

  const response = await handleNotion(pageUrlCleared, urlParts.base);
  return response;
};
