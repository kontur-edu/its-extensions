import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { handleRequest } from './utils.js';
import {handler} from "../proxy-function/function.js";


const app = express();
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true
}));

// app.use(express.urlencoded({ extended: true })); 
// app.use(express.text());
// app.use(express.json());
let buffer = null;
app.use(function(req, res, next) {
    var data = [];
    req.addListener("data", function(chunk) {
        data.push(new Buffer(chunk));
    });
    req.addListener("end", function() {
        buffer = Buffer.concat(data);
        req.body = buffer.toString();
        next();
    });
});
app.use(cookieParser());


app.get(/proxy\/.+$/, handleRequest('GET', handler));
app.post(/proxy\/.+$/, handleRequest('POST', handler));
app.delete(/proxy\/.+$/, handleRequest('DELETE', handler));


const port = 3000;

app.listen(port, () => {
    console.log(`Proxy is up on 0.0.0.0:${port}`);
});