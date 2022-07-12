import fetch from 'node-fetch';
// import { exec } from 'child_process';


export function GetCookiesFromHeadrs(headers) {
    if (!headers.has('set-cookie')) {
        console.log('No set-cookie header in headers');
        
        return [];
    }

    const cookies = [];
    const cookiesRaw = headers.get('set-cookie');
    // console.log("cookiesRaw");
    // console.log(cookiesRaw);

    const regexp = /([^=;,\s]+)=([^=;,\s]+)/g;
    const systemFields = [
        "path", "expires", "samesite"
    ];
    const matches = [...cookiesRaw.matchAll(regexp)];

    for (let cookiePart of matches) {
        console.log(`[--${cookiePart[1]}--]`);
        if (systemFields.includes(cookiePart[1])) {
            continue;
        }
        cookies.push([cookiePart[0]]);
    }
    console.log(cookies);
    
    // const cookieRawParts = cookiesRaw.split('; ');
    // let cookie = [];
    // for (let part of cookieRawParts) {
    //     if (part.split('=').length - 1 === 2) {
    //         const subParts = part.split(',');
    //         cookie.push(subParts[0]);
    //         cookies.push(cookie);
    //         cookie = [];
    //         cookie.push(subParts[1]);
    //     } else {
    //         cookie.push(part)
    //     }
    // }
    // if (cookie.length > 0) {
    //     cookies.push(cookie);
    // }
    
    return cookies;
}

export function FormatCookies(cookies) {
    const cookiesStrings = [];
    for (let name in cookies) {
        cookiesStrings.push(`${name}=${cookies[name]}`);
    }
    return cookiesStrings.join('; ');
}

export function formatFormBody(obj) {
    const encodedPairs = [];
    for (let key in obj) {
        const keyEncoded = encodeURIComponent(key); 
        const valueEncoded = encodeURIComponent(obj[key]);
        encodedPairs.push(`${keyEncoded}=${valueEncoded}`);
    }

    const result = encodedPairs.join( '&' ).replace( /%20/g, '+' );
    return result;
}

export function ForwardSetCookiesToResponse(response, cookies) {
    for (let cookie of cookies) {
        const cookieParts = cookie[0].split('=');
        if (cookieParts.length !== 2) {
            console.log(`Cookie has wrong format`);
        }
        response.cookie(cookieParts[0], cookieParts[1], {
            maxAge: 900000, httpOnly: true, secure: true, sameSite: 'lax'
        });
    }
}

export function PrepareRequestHeaders(request) {
    const cookiesFormatted = FormatCookies(request.cookies);
    const headers = {
        // ...request.headers,
        cookie: cookiesFormatted
    };
    delete headers["origin"];
    delete headers["referer"];
    delete headers["accept-language"];
    delete headers["host"];
    if ("content-length" in request.headers) headers["content-length"] = request.headers["content-length"];
    if ("content-type" in request.headers)  headers["content-type"] = request.headers["content-type"];
    if ("accept" in request.headers)  headers["accept"] = request.headers["accept"];
    if ("x-kl-ajax-reqyest" in request.headers)  headers["x-kl-ajax-reqyest"] = request.headers["x-kl-ajax-reqyest"];
    if ("x-requested-with" in request.headers)  headers["x-requested-with"] = request.headers["x-requested-with"];
    // if ("x-origin" in request.headers) {
    //     headers["origin"] = request.headers["x-origin"];
    // }
    console.log("prepared headers");
    console.log(headers);

    return headers;
}



export const HandleRequest = (
    method = "GET",
    responseBodyFormat="json", prefixLength=5
) => async (req, res) => {
    // console.log("HandleRequest");
    // console.log(req.headers);
    const requestedUrl = req.originalUrl.substring(prefixLength + 1);
    console.log(`${method} ${responseBodyFormat}: ${requestedUrl}`);
    // Add "host" : "its.urfu.ru" header and cookies
    const redirect = req.headers["x-redirect"] ? req.headers["x-redirect"] : 'manual';
    const headers = PrepareRequestHeaders(req);
    const options = {
        method: method,
        credentials: "inline",
        headers: headers,
        redirect: redirect,
    };
    const requestBodyFormat = req.headers["x-body"] ? req.headers["x-body"] : 'form';
    console.log("body");
    console.log(req.body);
    if (method === "POST" || method === "DELETE") {
        if (requestBodyFormat === "form") {
            const body = formatFormBody(req.body);
            options.body = body;
        } else {
            options.body = JSON.stringify(req.body);
        }
    }
    const resp = await fetch(requestedUrl, options);
    
    console.log(`Response: status: ${resp.status} ${resp.statusText}`);
    // Extract cookies from set-cookie header
    const cookies = GetCookiesFromHeadrs(resp.headers);
    // console.log("cookies");
    // console.log(cookies);
    if (cookies.length > 0) {
        // Add extracted cookie to response
        ForwardSetCookiesToResponse(res, cookies);
    }
    let value = null;
    if (resp.status != 200 && resp.status != 201) {
        res.status(resp.status).send({ data: '', status: resp.status });
        return;
    }
    try {
        if (responseBodyFormat === "text") {
            value = await resp.text();
        } else {
            value = await resp.json();
        }
    } catch (e) {
        res.status(500).send({data: '', status: resp.status, message: "Proxy exception"});
        return;
    }
    // console.log("value");
    // console.log(value);
    res.json({data: value, status: resp.status});
};