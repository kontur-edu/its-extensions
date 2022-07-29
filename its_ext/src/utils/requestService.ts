import { findCsrfTokens } from "./parser";
import { ICredentials } from "../common/types";
import {
  CSRF_TOKEN_INPUT_NAME,
  REQUEST_ERROR_UNAUTHORIZED,
  REQUEST_ERROR_REQUEST_FAILED,
} from "./constants";

export type FormBodyObj = { [key: string]: string | number | string[] };

export class RequestService {
  constructor(
    public proxyUrl: string,
    public loginUrl: string,
    private onConnectionRefused?: () => any
  ) {}

  setOnConnectionRefused(func: () => any) {
    this.onConnectionRefused = func;
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

  async SendRequest(url: string, options: any) {
    let response: any = null;
    try {
      response = await fetch(url, options);
    } catch (err) {
      this.onConnectionRefused?.();
      // throw new Error(REQUEST_ERROR_CONNECTION_REFUSED);
    }

    if (response.status === 401) {
      throw Error(REQUEST_ERROR_UNAUTHORIZED);
    }
    if (response.status === 500) {
      throw Error(REQUEST_ERROR_REQUEST_FAILED);
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

    console.log(`tokens found: ${tokens.length}`);
    if (tokens.length !== 1) {
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
      // "x-origin": "https://its.urfu.ru/Account/Login",
      Accept: "*/*",
      "x-redirect": "manual",
    };

    const options: any = {
      method: "POST",
      headers: headers,
      body: formData,
      credentials: "include",
      withCredentials: true,
      redirect: "manual", // not worked
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

  private async authenticateStudentPart(
    url: string
  ): Promise<{ success: boolean; data?: any }> {
    const headers = {
      Accept: "*/*",
      "x-redirect": "manual",
      "x-handle-location": "true",
    };
    const options: any = {
      method: "GET",
      headers: headers,
      credentials: "include",
      withCredentials: true,
      redirect: "manual",
    };
    let resp = null;
    try {
      resp = await fetch(`${this.proxyUrl}/${url}`, options);
    } catch (err) {
      this.onConnectionRefused?.();
      return { success: false };
    }
    console.log("resp");
    console.log(resp);
    let body = null;
    try {
      body = await resp.json();
    } catch (err) {
      return { success: false };
    }
    console.log("body");
    console.log(body);
    if (body && body.hasOwnProperty("location")) {
      return { success: true, data: body };
    }

    return { success: false, data: body };
  }

  async AuthenticateStudent(credentials: ICredentials): Promise<boolean> {
    // STEP 1
    const urlWithProxy = `${this.proxyUrl}/https://sts.urfu.ru/adfs/OAuth2/authorize?resource=https%3A%2F%2Fistudent.urfu.ru&type=web_server&client_id=https%3A%2F%2Fistudent.urfu.ru&redirect_uri=https%3A%2F%2Fistudent.urfu.ru%3Fauth%26rp%3DL3MvaHR0cC11cmZ1LXJ1LXJ1LXN0dWRlbnRzLXN0dWR5LWJycy8%253D85d9e950dfd8804a8f231fbc88a9c610&response_type=code&scope=`;
    const credentialsData = {
      UserName: credentials.username,
      Password: credentials.password,
      AuthMethod: "FormsAuthentication",
    };
    const formData = RequestService.formatFormData(credentialsData);

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "*/*",
      "x-redirect": "manual",
      "x-handle-location": "true",
    };
    const options: any = {
      method: "POST",
      headers: headers,
      body: formData,
      credentials: "include",
      withCredentials: true,
      redirect: "manual", // not worked
    };
    let responseAuth1 = null;
    try {
      responseAuth1 = await fetch(urlWithProxy, options);
    } catch (err) {
      this.onConnectionRefused?.();
      return false;
    }

    let bodyPost = null;

    try {
      bodyPost = await responseAuth1.json();
    } catch (err) {
      return false;
    }
    console.log("bodyPost");
    console.log(bodyPost);
    if (!bodyPost.hasOwnProperty("location")) {
      return false;
    }
    const body2 = await this.authenticateStudentPart(bodyPost.location);
    if (!body2.success || !body2.data || !body2.data.location) return false;

    const body3 = await this.authenticateStudentPart(body2.data.location);
    if (!body3.success || !body3.data || !body3.data.location) return false;

    return true;

    // // STEP 2
    // const headersGET = {
    //   Accept: "*/*",
    //   "x-redirect": "manual",
    //   "x-handle-location": "true",
    // };
    // const options2: any = {
    //   method: "GET",
    //   headers: headersGET,
    //   credentials: "include",
    //   withCredentials: true,
    //   redirect: "manual", // not worked
    // };
    // let responseAuth2 = await fetch(`${this.proxyUrl}/${url2}`, options2);
    // console.log("responseAuth2");
    // console.log(responseAuth2);

    // let body2 = await responseAuth2.json();
    // console.log("body2");
    // console.log(body2);
    // const url3 = body2.location;

    // // STEP 3
    // const options3: any = {
    //   method: "GET",
    //   headers: headersGET,
    //   credentials: "include",
    //   withCredentials: true,
    //   redirect: "manual", // not worked
    // };
    // let responseAuth3 = await fetch(`${this.proxyUrl}/${url3}`, options3);
    // console.log("responseAuth3");
    // console.log(responseAuth3);

    // if (responseAuth3.status === 200 || responseAuth3.status === 204) {
    //   return true;
    // }
    // return false;
  }

  async GetJson(url: string): Promise<any> {
    console.log(`GetJson ${url}`);

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
    console.log(`PostFormData: ${url}`);

    const urlWithProxy = `${this.proxyUrl}/${url}`;
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-redirect": "manual",
      // "X-KL-Ajax-Request": "Ajax_Request",
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

    let result = await this.SendRequest(urlWithProxy, options);
    console.log(`Result`);
    console.log(result);
    return result;
  }

  async SendJson(url: string, data: any, method: string = "POST") {
    console.log(`SendJson: ${url}`);

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

    let resultRaw = await this.SendRequest(urlWithProxy, options);
    return resultRaw;
  }
}
