// import {processRequest} from "./utils.js";
const utils = require("./utils");


module.exports.handler = async function (event, context) {
    const requestHeaders = event.headers;
    const method = event.httpMethod;
    if (!requestHeaders.hasOwnProperty("X-Url")) {
        return {
            statusCode: 400,
            body: {
                success: false,
                message: "X-Url not specified"
            }
        };
    }
    const xUrl = requestHeaders["X-Url"];
    const body = event.body;
    const isBase64Encoded = event.isBase64Encoded;
    const cookiesStr = event.headers.Cookie || '';
    const cookiesArr = cookiesStr.split(';').map(c => c.trim());
    const headersLower = {};
    for (const headerName in requestHeaders) {
        headersLower[headerName.toLowerCase()] = requestHeaders[headerName];
    }
    const response = await utils.processRequest(
        method,
        xUrl,
        headersLower,
        cookiesArr,
        body,
        isBase64Encoded
    );

    return response;
};

console.log("OK");