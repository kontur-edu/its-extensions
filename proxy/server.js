import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { handleRequest } from "./utils.js";
import {
  handler,
  convertArrayBufferToBase64,
} from "../proxy-function/function.js";

const app = express();
app.use(
  cors({
    origin: "http://localhost:3001",
    credentials: true,
  })
);

app.use(function (req, res, next) {
  let data = [];
  req.addListener("data", function (chunk) {
    data.push(Buffer.from(chunk));
  });
  req.addListener("end", function () {
    const bodyBuffer = Buffer.concat(data);
    req.body = convertArrayBufferToBase64(bodyBuffer);
    next();
  });
});
app.use(cookieParser());

app.set('etag', false);

app.get(/proxy\/.+$/, handleRequest("GET", handler));
app.post(/proxy\/.+$/, handleRequest("POST", handler));
app.delete(/proxy\/.+$/, handleRequest("DELETE", handler));

const port = 3000;

app.listen(port, () => {
  console.log(`Proxy is up on 0.0.0.0:${port}`);
});
