function findTitle(html) {
  const element = document.createElement("html");
  element.innerHTML = html;
  const titles = element.getElementsByClassName("page-title");
  if (titles.length > 0) {
    return titles[0].innerText();
  }
  return null;
}

async function getNotionRaw(url, proxyUrl) {
  let reqUrl = proxyUrl;
  if (!proxyUrl.endsWith("/")) {
    reqUrl += "/";
  }
  reqUrl += "raw/";
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

function extractPageTitle(notionData) {
  if (!notionData.hasOwnProperty("recordMap")) {
    return [];
  }
  const recordMap = notionData["recordMap"];
  if (!recordMap.hasOwnProperty("block")) {
    return [];
  }
  const block = recordMap["block"];
  for (const viewId in block) {
    const view = block[viewId];
    if (!view.hasOwnProperty("value")) {
      continue;
    }
    const viewValue = view["value"];
    if (viewValue["type"] !== "page") {
      continue;
    }
    if (!viewValue.hasOwnProperty("properties")) {
      continue;
    }
    const properties = viewValue["properties"];
    if (properties.hasOwnProperty("title")) {
      let title = properties["title"];
      if (Array.isArray(title) && title.length > 0) {
        title = title[0];
      }
      if (Array.isArray(title) && title.length > 0) {
        title = title[0];
      }
      return title;
    }
  }
}

function paginate(arr, size) {
  return arr.reduce((acc, val, i) => {
    let idx = Math.floor(i / size);
    let page = acc[idx] || (acc[idx] = []);
    page.push(val);

    return acc;
  }, []);
}

async function fillMupNameToNotionPageId(
  urls,
  proxyUrl,
  mupNameToNotionPageId
) {
  const promises = urls.map((url) => {
    return getNotionRaw(url, proxyUrl);
  });

  const results = await Promise.allSettled(promises);

  for (let i = 0; i < promises.length; i++) {
    const res = results[i];
    if (res.status === "fulfilled") {
      const response = res.value;
      if (
        response.status === 200 &&
        response.data &&
        response.data.recordMap &&
        Object.keys(response.data.recordMap).length > 0
      ) {
        const mupName = extractPageTitle(response.data);
        if (mupName) {
          mupNameToNotionPageId[mupName] = urls[i];
        }
      }
    }
  }
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

async function prepareMupNameToNotionPageId(mainPage, proxyUrl) {
  const parts = getUrlParts(mainPage);
  let notionBase = parts.base;
  if (!notionBase.endsWith("/")) {
    notionBase += "/";
  }

  console.log(
    `prepareMupNameToNotionPageId: ${notionBase}, ${mainPage}, ${proxyUrl}`
  );
  const mainPageResp = await getNotionRaw(mainPage, proxyUrl);
  if (mainPageResp.status !== 200 || !mainPageResp.data) {
    return null;
  }
  const pageIds = extractTablePageIds(mainPageResp.data);
  console.log(`pageIds: `, pageIds);
  const urls = pageIds.map((pId) => {
    return notionBase + pId.replace(/\-/g, "");
  });

  const mupNameToNotionPageId = {};

  for (const urlsPage of paginate(urls, 10)) {
    await fillMupNameToNotionPageId(urlsPage, proxyUrl, mupNameToNotionPageId);
  }
  // const mupNameToNotionPageId = {};
  // for (const url of urls) {
  //   const response = await getNotionRaw(url, proxyUrl);
  //   if (response.status === 200 && response.data && response.data.recordMap && Object.keys(response.data.recordMap).length > 0) {
  //     const mupName = extractPageTitle(response.data);
  //     if (mupName) {
  //       mupNameToNotionPageId[mupName] = url;
  //     }
  //   }
  // }

  return mupNameToNotionPageId;
}
