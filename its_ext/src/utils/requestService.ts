import { findCsrfTokens } from "./parser";
import { ICredentials } from "../common/types";
import {
  CSRF_TOKEN_INPUT_NAME,
  REQUEST_ERROR_UNAUTHORIZED,
  REQUEST_ERROR_REQUEST_FAILED,
  SAFE_MODE_ENABLED_MESSAGE,
} from "./constants";
import { ApiValidator } from "./apiValidator";
import { getNextDelay, waitPromise } from "./helpers";

export type FormBodyObj = { [key: string]: string | number | string[] };

export class RequestService {
  constructor(
    public proxyUrl: string,
    public loginUrl: string,
    public apiValidator: ApiValidator,
    private onConnectionRefused?: () => any,
    private onUnauthorized?: () => any
  ) {}

  setOnConnectionRefused(func: () => any) {
    this.onConnectionRefused = func;
  }
  setOnUnauthorized(func: () => any) {
    this.onUnauthorized = func;
  }

  static formatFormData(obj: FormBodyObj): string {
    const encodedPairs: string[] = [];
    for (let key in obj) {
      const keyEncoded = encodeURIComponent(key) as string;
      const value = obj[key];
      if (Array.isArray(value)) {
        for (let val of value) {
          const valueEncoded = encodeURIComponent(val);
          encodedPairs.push(`${keyEncoded}=${valueEncoded}`);
        }
        if (value.length === 0) {
          encodedPairs.push(`${keyEncoded}=`);
        }
      } else {
        const valueEncoded = encodeURIComponent(value);
        encodedPairs.push(`${keyEncoded}=${valueEncoded}`);
      }
    }

    const result = encodedPairs.join("&").replace(/%20/g, "+");
    return result;
  }

  async fetchWithRetry(
    url: string,
    options: any,
    delay: number = 0,
    maxRetries = 5
  ) {
    let currentTry = 0;
    let response;
    while (currentTry <= maxRetries) {
      currentTry++;
      if (delay > 0) {
        await waitPromise(delay);
      }
      delay = getNextDelay(delay);
      try {
        response = await fetch(url, options);
        if (response.status !== 502) {
          return response;
        }
      } catch (err) {
        this.onConnectionRefused?.();
        // throw new Error(REQUEST_ERROR_CONNECTION_REFUSED);
      }
    }
    return response;
  }

  async SendRequest(
    url: string,
    options: any,
    bodyObj?: FormBodyObj,
    maxRetries: number = 0
  ) {
    if (options.method === "GET" || bodyObj) {
      let clearedUrl = url;
      if (clearedUrl.startsWith(this.proxyUrl)) {
        clearedUrl = clearedUrl.replace(this.proxyUrl + "/", "");
      }
      if (!this.apiValidator.validate(options.method, clearedUrl, bodyObj)) {
        throw new Error(SAFE_MODE_ENABLED_MESSAGE);
      }
    }

    let response = await this.fetchWithRetry(url, options, maxRetries);
    if (!response) {
      console.warn("fetchWithRetry was not able to get any data");
      return { success: true, data: "502 Bad Gateway" };
    }
    if (response.status === 502) {
      // delay
      console.warn(`SendRequest with retries: result ${response.status}`);
      const message = await response.text();
      console.warn(`message: ${message}`);
    }

    if (response.status === 401) {
      this.onUnauthorized?.();
      throw new Error(REQUEST_ERROR_UNAUTHORIZED);
    }
    if (response.status === 500) {
      throw new Error(REQUEST_ERROR_REQUEST_FAILED);
    }
    if (response.status === 302 || response.status === 204) {
      return { success: true, data: "" };
    }
    const data = (await response.text()) as any;
    return { success: true, data };
  }

  async Authenticate(credentials: ICredentials): Promise<boolean> {
    console.log(`Authenticate ${this.loginUrl}`);

    const urlWithProxy = `${this.proxyUrl}/${this.loginUrl}`;
    // Get token
    const optionsLoginPage: any = {
      method: "GET",
      credentials: "include",
    };

    const jsonBody = await this.SendRequest(urlWithProxy, optionsLoginPage);

    const pageString = jsonBody["data"];
    const tokens: string[] = findCsrfTokens(pageString);
    if (tokens.length === 0) {
      alert(
        `ERROR::RequestService::Authenticate: Incorrect count of CSRF tokens found ${tokens.length}`
      );
      throw Error(`CSRF tokens found: ${tokens.length}`);
    }
    // Format credentials
    const credentialsData = {
      [CSRF_TOKEN_INPUT_NAME]: tokens[0],
      UserName: credentials.username,
      Password: credentials.password,
      RememberMe: "false",
    };
    const formData = RequestService.formatFormData(credentialsData);

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "*/*",
      "x-redirect": "manual",
    };

    const options: any = {
      method: "POST",
      headers: headers,
      body: formData,
      credentials: "include",
      withCredentials: true,
      redirect: "manual",
    };

    // submit form
    let responseAuth: any = null;
    try {
      responseAuth = await fetch(urlWithProxy, options);
    } catch (err) {
      this.onConnectionRefused?.();
      // throw new Error(REQUEST_ERROR_CONNECTION_REFUSED);
    }
    if (responseAuth.status === 200 || responseAuth.status === 204) {
      return true;
    }

    return false;
  }

  async GetJson(url: string): Promise<any> {
    // console.log(`GetJson ${url}`);

    const urlWithProxy = `${this.proxyUrl}/${url}`;
    const headers = {
      "X-KL-Ajax-Request": "Ajax_Request",
      "X-Requested-With": "XMLHttpRequest",
      "x-redirect": "manual",
      "x-url": url,
    };

    const options: any = {
      method: "GET",
      credentials: "include",
      headers: headers,
    };

    let result = await this.SendRequest(urlWithProxy, options);
    if (!result.data) return result;
    result = JSON.parse(result.data);
    if (result.hasOwnProperty("data")) {
      result = result["data"];
    }
    if (result.hasOwnProperty("data")) {
      result = result["data"];
    }

    return result;
  }

  async PostFormData(url: string, data: FormBodyObj) {
    // console.log(`PostFormData: ${url}`);

    const urlWithProxy = `${this.proxyUrl}/${url}`;
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-redirect": "manual",
      Accept: "*/*",
    };
    const formData = RequestService.formatFormData(data);

    const options: any = {
      method: "POST",
      headers: headers,
      body: formData,
      credentials: "include",
      withCredentials: true,
    };

    let result = await this.SendRequest(urlWithProxy, options, data);
    return result;
  }

  async SendJson(url: string, data: any, method: string = "POST") {
    // console.log(`SendJson: ${url}`);

    const urlWithProxy = `${this.proxyUrl}/${url}`;
    const headers = {
      "Content-Type": "application/json",
      "x-redirect": "manual",
      Accept: "*/*",
      "x-body": "json",
    };
    const options: any = {
      method: method,
      headers: headers,
      body: data,
      credentials: "include",
      withCredentials: true,
    };

    let resultRaw = await this.SendRequest(
      urlWithProxy,
      options,
      JSON.parse(data)
    );
    return resultRaw;
  }
}
