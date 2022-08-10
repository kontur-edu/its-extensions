import { CSRF_TOKEN_INPUT_NAME } from "./constants";

export function findCsrfTokens(page: string) {
  const tokens: string[] = [];
  const html = document.createElement("html");
  html.innerHTML = page;
  const inputElements = html.getElementsByTagName("input");
  for (let i = 0; i < inputElements.length; i++) {
    const inputElement = inputElements[i];
    if (inputElement.getAttribute("name") === CSRF_TOKEN_INPUT_NAME) {
      const token = inputElement.getAttribute("value");
      if (token) {
        tokens.push(token);
      }
    }
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

export function getCookies(headers: any) {
  if (!("set-cookie" in headers)) {
    return [];
  }
  const cookies = [];
  for (let cookieEntry of headers["set-cookie"]) {
    const parts = cookieEntry.split("; ");
    const cookieParts = parts[0].split("=");
    if (cookieParts.length !== 2) {
      console.log(`cookieEntry has wrong format: ${cookieEntry}`);
      continue;
    }
    const cookie: ICookie = {
      name: cookieParts[0],
      value: cookieParts[1],
    };
    cookies.push(cookie);
  }
  return cookies;
}
