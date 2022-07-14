
const fetch = require("node-fetch");



function getCookiesFromHeadrs(headers) {
    if (!headers.has('set-cookie')) {
        return [];
    }

    const rawSetCookie = headers.raw()['set-cookie'];
    const preparedCookies = rawSetCookie.map((entry) => {
        const preparedCookie = entry.replace(/domain\s*=\s*[^;]+;\s?/gmi, "");
        return preparedCookie;
    });

    return preparedCookies;
}


function decodeBase64(base64Data, encoding="utf-8") {
    const decoded = Buffer.from(base64Data, "base64").toString(encoding);
    return decoded;
}


function prepareRequestHeaders(url, requestHeaders, cookieString) {
    // console.log(`prepareRequestHeaders ${url}`);
    // console.log(requestHeaders);
    // console.log(cookieString);

    const headers = {...requestHeaders};
    delete headers["host"];
    delete headers["content-encoding"];
    const host = url.match(/^(?:(http[s]?|ftp):\/)?\/?([^:\/\s]+)((?:\/\w+)*\/?)([\w\-\.]+[^#?\s]+)?(.*)?(#[\w\-]+)?$/mi)[2];
    if (host) {
        headers.host = host
    }
    if (cookieString) {
        headers.cookie = cookieString;
    }
    
    return headers;
}


async function processRequest(method, url, headers, requestCookieString, body, isBodyBase64 = true) {
    const redirect = headers["x-redirect"] ? headers["x-redirect"] : 'manual';
    const preparedRequestHeaders = prepareRequestHeaders(url, headers, requestCookieString);
    const options = {
        method: method,
        headers: preparedRequestHeaders,
        redirect: redirect,
    };

    if (body && isBodyBase64) {
        body = decodeBase64(body);
    }

    if (body && !(body.constructor === Object && Object.keys(body).length === 0)) {
        options.body = body;
    }
    // console.log("options");
    // console.log(options);
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
    for (var headerKeyValue of resp.headers.entries()) {
        resultHeaders[headerKeyValue[0]] = headerKeyValue[1];
    }

    let status = resp.status;
    if (redirect === "manual" && status === 301 || status === 302) {
        delete resultHeaders["location"];
        status = 200;
    } 

    const result = {
        statusCode: status,
        headers: resultHeaders,
        multiValueHeaders: multiValueHeaders,
    };

    try {
        result.body = await resp.text();
    } catch (e) {
        console.log("Proxy: failed to get body.text()");
    }
    return result;
}




module.exports.handler = async function (event, context) {
    const requestHeaders = event.headers;
    const method = event.httpMethod;
    const headersLower = {};
    for (const headerName in requestHeaders) {
        headersLower[headerName.toLowerCase()] = requestHeaders[headerName];
    }

    // if (!headersLower.hasOwnProperty("x-url")) {
    //     const body = JSON.stringify({
    //         success: false,
    //         message: "x-url not specified"
    //     });
    //     return {
    //         statusCode: 400,
    //         headers: {
    //             "content-type": "application/json"
    //         },
    //         body: body,
    //     };
    // }
    const xUrl = event.params.requestUrl;
    const body = event.body;
    const isBase64Encoded = event.isBase64Encoded;
    const cookiesString = event.headers.Cookie || '';
    
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