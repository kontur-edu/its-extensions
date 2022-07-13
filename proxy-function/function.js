


module.exports.handler = function (event, context) {
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

    const response = processRequest(
        method, url, requestHeaders
    );

    // X-Cookie: ""
    

    return response;
};