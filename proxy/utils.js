export const handleRequest = (httpMethod, handler) => async (req, res) => {
  const requestUrl = req.originalUrl.substring("proxy/".length + 1);
  console.log(`${httpMethod} request ${req.originalUrl} (${requestUrl})`);
  // get data from req
  const event = {
    httpMethod,
    headers: {},
    body: "",
    isBase64Encoded: false,
    url: req.originalUrl,
  };
  event.headers = req.headers;

  event.body = req.body;
  event.isBase64Encoded = true;

  const result = await handler(event, {});

  // set data to res
  if (result.headers) {
    for (const headerName in result.headers) {
      if (headerName === "set-cookie" || headerName === "content-encoding")
        continue;
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
    let data = result.body;
    if (result.isBase64Encoded) {
      data = Buffer.from(data, "base64");
    }
    res.send(data);
  } else {
    res.end();
  }
};
