import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { HandleRequest } from './utils.js';

const app = express();
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); 



app.get(/json\/.*$/, HandleRequest("GET", "json", 5));

app.get(/text\/.*$/, HandleRequest("GET", "text", 5));

app.post(/text\/.*$/, HandleRequest("POST", "text", 5));
app.post(/json\/.*$/, HandleRequest("POST", "json", 5));

app.delete(/text\/.*$/, HandleRequest("DELETE", "text", 5));
// app.delete(/json\/.*$/, HandleRequest("POST", "json", 5));

const port = 3000;

app.listen(port, () => {
    console.log(`Proxy is up on 0.0.0.0:${port}`);
});


// set NODE_DEBUG=http,net,stream&&node server.js
