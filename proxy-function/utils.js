import fetch from 'node-fetch';



export function GetCookiesFromHeadrs(headers) {
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


export function formatCookies(cookies) {
    const cookiesStrings = [];
    for (let name in cookies) {
        cookiesStrings.push(`${name}=${cookies[name]}`);
    }
    return cookiesStrings.join('; ');
}


export function decodeBase64(base64Data) {
    let buff = new Buffer(base64Data, "base64");
    const formData = buff.toString("utf-8");
    return formData;
}


export function prepareRequestHeaders(request) {
    const cookiesFormatted = FormatCookies(request.cookies);
    // const resultHeaders =  
    const headers = {
        "x-cookie": cookiesFormatted
    };
    if ("content-length" in request.headers) headers["content-length"] = request.headers["content-length"];
    if ("content-type" in request.headers)  headers["content-type"] = request.headers["content-type"];
    if ("accept" in request.headers)  headers["accept"] = request.headers["accept"];
    if ("x-kl-ajax-reqyest" in request.headers)  headers["x-kl-ajax-reqyest"] = request.headers["x-kl-ajax-reqyest"];
    if ("x-requested-with" in request.headers)  headers["x-requested-with"] = request.headers["x-requested-with"];
    
    return headers;
}


export function processRequest(method, url, headers, body, isBodyBase64 = true) {
    const redirect = req.headers["x-redirect"] ? req.headers["x-redirect"] : 'manual';
    const preparedRequestHeaders = prepareRequestHeaders(headers);
    const options = {
        method: method,
        credentials: "inline",
        headers: preparedRequestHeaders,
        redirect: redirect,
    };
    const requestBodyFormat = req.headers["x-body"] ? req.headers["x-body"] : 'form';
    if (body && isBodyBase64) {
        body = decodeBase64(body);
    }
    if (body) {
        if (requestBodyFormat === "form") {
            const reqBody = formatFormBody(body);
            options.body = reqBody;
        } else {
            options.body = JSON.stringify(body);
        }
    }
    etch(requestedUrl, options).then(response => {
        
    });

    const data = {
        
    };
}