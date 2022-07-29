const fetch = require("node-fetch");

function getCookiesFromHeadrs(headers) {
  if (!headers.has("set-cookie")) {
    return [];
  }

  const rawSetCookie = headers.raw()["set-cookie"];
  const preparedCookies = rawSetCookie.map((entry) => {
    const preparedCookie = entry.replace(/domain\s*=\s*[^;]+;\s?/gim, "").replace(/path\s*=\s*[^;]+;\s?/gim, "");
    return preparedCookie;
  });

  return preparedCookies;
}

function prepareRequestHeaders(url, requestHeaders, cookieString) {
  const headers = { ...requestHeaders };
  delete headers["host"];
  delete headers["content-encoding"];
  const host = url.match(
    /^(?:(http[s]?|ftp):\/)?\/?([^:\/\s]+)((?:\/\w+)*\/?)([\w\-\.]+[^#?\s]+)?(.*)?(#[\w\-]+)?$/im
  )[2];
  if (host) {
    headers.host = host;
  }
  if (cookieString) {
    headers.cookie = cookieString;
  }

  return headers;
}

function convertArrayBufferToBase64(buffer) {
  let binary = "";
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, "ascii").toString("base64");
}

function convertBase64ToArrayBuffer(base64) {
  let binary_string = Buffer.from(base64, "base64").toString("ascii");
  let len = binary_string.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

async function processRequest(
  method,
  url,
  headers,
  requestCookieString,
  body,
  isBodyBase64 = true
) {
  console.log(url);
  if (typeof body === "object" && body !== null) {
    body = JSON.stringify(body);
  }

  const redirect = headers["x-redirect"] ? headers["x-redirect"] : "manual";
  const handleLocation = headers["x-handle-location"] ? headers["x-handle-location"] : false;
  const preparedRequestHeaders = prepareRequestHeaders(
    url,
    headers,
    requestCookieString
  );
  const options = {
    method: method,
    headers: preparedRequestHeaders,
    redirect: redirect,
  };

  if (body && isBodyBase64) {
    body = convertBase64ToArrayBuffer(body);
  }

  if (
    body &&
    !(body.constructor === Object && Object.keys(body).length === 0)
  ) {
    options.body = body;
  }

  const resp = await fetch(url, options);

  const newCookies = getCookiesFromHeadrs(resp.headers);

  const multiValueHeaders = {};
  if (newCookies.length > 0) {
    multiValueHeaders["set-cookie"] = [];
    for (let cookie of newCookies) {
      multiValueHeaders["set-cookie"].push(cookie);
    }
  }

  const resultHeaders = {};
  for (let headerKeyValue of resp.headers.entries()) {
    if (
      headerKeyValue[0] === "set-cookie" ||
      headerKeyValue[0] === "content-encoding"
    )
      continue;
    resultHeaders[headerKeyValue[0]] = headerKeyValue[1];
  }

  let status = resp.status;
  let rbody64 = null;
  if ((redirect === "manual" && status === 301) || status === 302) {
    resultHeaders["x-location"] = resultHeaders["location"];
    delete resultHeaders["location"];
    status = 204;

    if (handleLocation) {
      status = 200;
      let rbody = {location: resultHeaders["x-location"]};
      rbody64 = Buffer.from(JSON.stringify(rbody)).toString('base64');;
    }
  }

  const result = {
    statusCode: status,
    headers: resultHeaders,
    multiValueHeaders: multiValueHeaders,
  };

  try {
    if (status !== 204 && status !== 301 && status !== 302) {
      if (rbody64) {
        result.body = rbody64;
        result.isBase64Encoded = true;
        return result;
      }
      const bodyBlob = await resp.blob();
      const arrayBuffer = await bodyBlob.arrayBuffer();
      const base64 = convertArrayBufferToBase64(arrayBuffer);
      result.body = base64;
      result.isBase64Encoded = true;
    }
  } catch (e) {
    console.log(e);
    console.log("Proxy: failed to get body.text()");
  }
  return result;
}

module.exports.convertArrayBufferToBase64 = convertArrayBufferToBase64;
module.exports.handler = async function (event, context) {
  const requestHeaders = event.headers;
  const method = event.httpMethod;
  const headersLower = {};
  for (const headerName in requestHeaders) {
    headersLower[headerName.toLowerCase()] = requestHeaders[headerName];
  }

  // url is relative https://<...>/proxy/https://...
  // replace will remove first match
  const xUrl = event.url.replace("/proxy/", "");
  const body = event.body;
  const isBase64Encoded = event.isBase64Encoded;
  const cookiesString = event.headers.Cookie || "";

  const response = await processRequest(
    method,
    xUrl,
    headersLower,
    cookiesString,
    body,
    isBase64Encoded
  );

  return response;
};
