
import {CSRF_TOKEN_INPUT_NAME} from "./constants";


export function FindCsrfTokens(page: string) {
    const tokens: string[] = [];
    let lastStringIndexOfTokenInput = 0;
    while(true) {
        const currentStringIndexOfTokenInput = page.indexOf(CSRF_TOKEN_INPUT_NAME, lastStringIndexOfTokenInput);
        if (currentStringIndexOfTokenInput === -1) {
            break;
        }
        const valueArg = `value="`;
        const tokenStart = page.indexOf(valueArg, lastStringIndexOfTokenInput) + valueArg.length;
        const tokenEnd = page.indexOf(`"`, tokenStart);
        lastStringIndexOfTokenInput = tokenEnd;
        
        const token = page.substring(tokenStart, tokenEnd);
        tokens.push(token);
    }
    return tokens;
}


export interface ICookie {
    name: string;
    value: string;
    path?: string;
    samesite?: string;
    httponly?: boolean;
}


export function GetCookies(headers: any) {
    if (!("set-cookie" in headers)) {
        return [];
    }
    const cookies = [];
    for (let cookieEntry of headers["set-cookie"]) {
        const parts = cookieEntry.split('; ');
        const cookieParts = parts[0].split("=");
        if (cookieParts.length !== 2) {
            console.log(`cookieEntry has wrong format: ${cookieEntry}`);
            continue;
        }
        const cookie: ICookie = {
            name: cookieParts[0],
            value: cookieParts[1]
        };
        cookies.push(cookie);
    }
    return cookies;
}