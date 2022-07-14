

export const handleRequest = (httpMethod, handler) =>
        async (req, res) => {
    console.log(`${httpMethod} request ${req.originalUrl}`);
    // console.log(req);
    // get data from req
    const event = {
        httpMethod,
        headers: {},
        body: '',
        isBase64Encoded: false,
    };
    event.headers = req.headers;
    event.body = req.body;
    
    // console.log("event");
    // console.log(event);
    const result = await handler(event, {});
    // console.log("result");
    // console.log(result);
    
    // set data to res
    if (result.headers) {
        for (const headerName in result.headers) {
            if (headerName === "set-cookie" || headerName === "content-encoding") continue;
            res.set(headerName, result.headers[headerName]);
        }
    }
    if (result.multiValueHeaders) {
        for (const headerName in result.multiValueHeaders) {
            for (const headerValue of result.multiValueHeaders[headerName]) {
                res.set(headerName, headerValue);
            }
        }
    }

    // send res
    res.status(result.statusCode);
    if (result.body) {
        res.send(result.body);
    } else {
        res.end();
    }
}