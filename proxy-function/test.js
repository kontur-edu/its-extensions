const func = require("./function");

const data = {
  event: {
    httpMethod: "POST",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "max-age=0",
      Host: "functions.yandexcloud.net",
      "Sec-Ch-Ua":
        '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
      "X-Forwarded-For": "46.17.202.12",
      "X-Real-Remote-Address": "[46.17.202.12]:54740",
      "X-Request-Id": "97602003-223f-468f-8a58-eb52cc5310fb",
      "X-Trace-Id": "9e14d2eb-48ac-4342-b949-f15c08368d42",

      "X-Url": "https://example.com",
      Cookie: "key1=value; key2=value2",
      "Content-Type": "application/json",
      "Content-Length": 3,
      // "X-Body": "json",
      // "X-Response-Body": "text",
    },
    url: "",
    params: {},
    multiValueParams: {},
    pathParams: {},
    multiValueHeaders: {
      Accept: [
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      ],
      "Accept-Encoding": ["gzip, deflate, br"],
      "Accept-Language": ["ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"],
      "Cache-Control": ["max-age=0"],
      Host: ["functions.yandexcloud.net"],
      "Sec-Ch-Ua": [
        '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
      ],
      "Sec-Ch-Ua-Mobile": ["?0"],
      "Sec-Ch-Ua-Platform": ['"Windows"'],
      "Sec-Fetch-Dest": ["document"],
      "Sec-Fetch-Mode": ["navigate"],
      "Sec-Fetch-Site": ["none"],
      "Sec-Fetch-User": ["?1"],
      "Upgrade-Insecure-Requests": ["1"],
      "User-Agent": [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
      ],
      "X-Forwarded-For": ["46.17.202.12"],
      "X-Real-Remote-Address": ["[46.17.202.12]:54740"],
      "X-Request-Id": ["97602003-223f-468f-8a58-eb52cc5310fb"],
      "X-Trace-Id": ["9e14d2eb-48ac-4342-b949-f15c08368d42"],
    },
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    requestContext: {},
    body: "[123]",
    isBase64Encoded: true,
  },
  context: {},
};

func.handler(data.event, data.context).then((res) => {
  console.log(res);
});
