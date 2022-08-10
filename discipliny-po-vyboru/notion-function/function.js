const NotionPageToHtml = require("notion-page-to-html");
const fetch = require("node-fetch");

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
  return {
    base,
    id,
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

async function handleNotionRaw(url) {
  const notionResp = await getNotionCachedDataFromPage(url);
  const result = {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: notionResp.data,
  };

  return result;
}

function prepareHtml(html, notionBase) {
  return html.replace(/href="\//g, `href="${notionBase}`);
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
  console.log(`handler: event.url: ${event.url}`);
  let requestingRawData = false;
  let pageUrl = event.url;
  if (pageUrl.startsWith("/notion/raw/")) {
    requestingRawData = true;
    pageUrl = pageUrl.replace("/notion/raw/", "");
  } else if (pageUrl.startsWith("/notion/")) {
    pageUrl = pageUrl.replace("/notion/", "");
  }
  const urlParts = getUrlParts(pageUrl);
  const pageUrlCleared = `${urlParts.base}/${urlParts.id}`;
  if (requestingRawData) {
    const response = await handleNotionRaw(pageUrlCleared);
    return response;
  }

  const response = await handleNotion(pageUrlCleared, urlParts.base);
  return response;
};
