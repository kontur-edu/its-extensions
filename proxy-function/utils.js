// import fetch from 'node-fetch';
const fetch = require("node-fetch");



function getCookiesFromHeadrs(headers) {
    if (!headers.has('set-cookie')) {
        return [];
    }

    const cookies = [];
    const cookiesRaw = headers.get('set-cookie');

    const regexp = /([^=;,\s]+)=([^=;,\s]+)/g;
    const systemFields = [
        "path", "expires", "samesite"
    ];
    const matches = [...cookiesRaw.matchAll(regexp)];

    for (let cookiePart of matches) {
        if (systemFields.includes(cookiePart[1])) {
            continue;
        }
        cookies.push([cookiePart[0]]);
    }

    return cookies;
}


function decodeBase64(base64Data) {
    let buff = new Buffer(base64Data, "base64");
    const formData = buff.toString("utf-8");
    return formData;
}


function prepareRequestHeaders(requestHeaders, cookieString) {
    const headers = {};
    if (cookieString) {
        headers.cookie = cookieString;
    }
    if ("content-length" in requestHeaders) headers["content-length"] = requestHeaders["content-length"];
    if ("content-type" in requestHeaders)  headers["content-type"] = requestHeaders["content-type"];
    if ("accept" in requestHeaders)  headers["accept"] = requestHeaders["accept"];
    if ("x-kl-ajax-reqyest" in requestHeaders)  headers["x-kl-ajax-reqyest"] = requestHeaders["x-kl-ajax-reqyest"];
    if ("x-requested-with" in requestHeaders)  headers["x-requested-with"] = requestHeaders["x-requested-with"];
    
    return headers;
}


async function processRequest(method, url, headers, requestCookies, body, isBodyBase64 = true) {
    const redirect = headers["x-redirect"] ? headers["x-redirect"] : 'manual';
    const responseBodyFormat = headers["x-response-body"] ? headers["x-response-body"] : 'text';
    // const requestCookies = cookies ? cookies : [];
    const requestCookiesString = requestCookies.join('; ');
    const preparedRequestHeaders = prepareRequestHeaders(headers, requestCookiesString);
    const options = {
        method: method,
        credentials: "inline",
        headers: preparedRequestHeaders,
        redirect: redirect,
    };
    console.log("body");
    console.log(body);
    const requestBodyFormat = headers["x-body"] ? headers["x-body"] : 'form';
    if (body && isBodyBase64) {
        body = decodeBase64(body);
    }
    if (body) {
        if (requestBodyFormat === "form") {
            const reqBody = formatFormBody(body);
            options.body = reqBody;
        } else {
            options.body = body;
        }
    }
    console.log("options");
    console.log(options);
    const resp = await fetch(url, options);

    const newCookies = getCookiesFromHeadrs(resp.headers);
    
    const multiValueHeaders = {};
    if (newCookies.length > 0) {
        multiValueHeaders["set-cookie"] = [];
        for (let cookie of newCookies) {
            const cookieParts = cookie[0].split('=');
            multiValueHeaders["set-cookie"].push(cookieParts);
        }
    }

    const result = {
        statusCode: resp.status,
        multiValueHeaders: multiValueHeaders,
    };

    if (resp.status !== 200 && resp.status != 201) {
        return result;
    }

    // let value = null;
    let resultBody = {
        data: '',
        status: resp.status,
        message: "",
    };
    try {
        if (responseBodyFormat === "text") {
            resultBody.data = await resp.text();
        } else {
            resultBody.data = await resp.json();
        }
    } catch (e) {
        resultBody.message = "Proxy: body parse error";
        result.statusCode = 500;
    }

    result.body = JSON.stringify(resultBody);
    return result;
}


module.exports.processRequest = processRequest;