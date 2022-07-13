import { FindCsrfTokens } from "./parser";
import { ICredentials } from '../common/types'
import {
    CSRF_TOKEN_INPUT_NAME,
    REQUEST_ERROR_UNAUTHORIZED,
    REQUEST_ERROR_REQUEST_FAILED,
    REQUEST_ERROR_REQUEST_HANDLING_ERROR,
} from './constants';


export type FormBodyObj = {[key: string] : string | number | string[]};


export class RequestService {
    constructor(public proxyUrl: string, public loginUrl: string) {
        
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
    
        const result = encodedPairs.join( '&' ).replace( /%20/g, '+' );
        return result;
    }

    async SendRequest(url: string, options: any) {
        const response = await fetch(url, options);
        if (response.status === 401) {
            throw Error(REQUEST_ERROR_UNAUTHORIZED);
        }
        if (response.status === 500) {
            throw Error(REQUEST_ERROR_REQUEST_FAILED);
        }
        if (response.status === 302 || response.status === 204) {
            return {success: true};
        }
        const jsonBody = await response.json();
        if (!jsonBody.hasOwnProperty('data') || !jsonBody.hasOwnProperty('status')) {
            throw Error(REQUEST_ERROR_REQUEST_FAILED);
        }
        return jsonBody;
    }

    async Authenticate(
        credentials: ICredentials
    ): Promise<boolean> {
        console.log(`Authenticate ${this.loginUrl}`);

        const loginUrl = `${this.proxyUrl}/text/${this.loginUrl}`;
        // Get token
        const optionsLoginPage: any = {
            method: 'GET',
            credentials: "include",
        };

        const jsonBody = await this.SendRequest(loginUrl, optionsLoginPage);

        const pageString = jsonBody["data"];
        const tokens: string[] = FindCsrfTokens(pageString);
    
        console.log(`tokens found: ${tokens.length}`);
        if (tokens.length !== 1) {
            alert(`ERROR::RequestService::Authenticate: Incorrect count of CSRF tokens found ${tokens.length}`);
            throw Error(`CSRF tokens found: ${tokens.length}`);
        }
        // Format credentials
        const credentialsData = {
            [CSRF_TOKEN_INPUT_NAME]: tokens[0],
            "UserName": credentials.username,
            "Password": credentials.password,
            "RememberMe": "false",
        }
        const formData = RequestService.formatFormData(credentialsData);

        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            // "x-origin": "https://its.urfu.ru/Account/Login",
            "x-redirect": "manual",
            "Accept": "*/*",
            "x-body": "form",
            // "Accept-Encoding": "gzip, deflate, br",
            // "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        };
        const options: any = {
            method: "POST",
            headers: headers,
            body: formData,
            'credentials': 'include',
            withCredentials: true
        };

        // submit form
        const responseAuth = await fetch(loginUrl, options);
        if (responseAuth.status === 302) {
            return true;
        }

        return false;
    }

    async GetJson(url: string): Promise<any> {
        console.log(`GetJson ${url}`);
        const urlWithProxy = `${this.proxyUrl}/json/${url}`;
        const headers = {
            "X-KL-Ajax-Reqyest" : "Ajax_Request",
            "X-Requested-With": "XMLHttpRequest",
            "x-redirect": "manual",
        };

        const options: any = {
            method: 'GET',
            credentials: "include",
            headers: headers
        };

        let result = await this.SendRequest(urlWithProxy, options);

        if (result.hasOwnProperty("data")) {
            result = result["data"];
        }
        if (result.hasOwnProperty("data")) {
            result = result["data"];
        }

        return result;
    }

    async PostFormData(url: string, data: FormBodyObj, bodyFormat: string = 'json') {
        console.log(`PostFormData: ${url}`);

        const urlWithProxy = `${this.proxyUrl}/${bodyFormat}/${url}`;
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "x-redirect": "manual",
            "Accept": "*/*",
            "x-body": "form",
        };
        const formData = RequestService.formatFormData(data);
        console.log(formData);

        const options: any = {
            method: "POST",
            headers: headers,
            body: formData,
            'credentials': 'include',
            withCredentials: true
        };

        let result = await this.SendRequest(urlWithProxy, options);
        if (result.hasOwnProperty("data")) {
            result = result["data"];
        }
        if (result.hasOwnProperty("data")) {
            result = result["data"];
        }
        console.log(`Result`);
        console.log(result);
        return result;
    }

    async SendJson(url: string, data: any, method: string = 'POST', bodyFormat: string = 'json') {
        console.log(`SendJson: ${url}`);

        const urlWithProxy = `${this.proxyUrl}/${bodyFormat}/${url}`;
        const headers = {
            "Content-Type": "application/json",
            "x-redirect": "manual",
            "Accept": "*/*",
            "x-body": "json",
        };
        const options: any = {
            method: method,
            headers: headers,
            body: data,
            'credentials': 'include',
            withCredentials: true,
        };

        let result = await this.SendRequest(urlWithProxy, options);

        if (result.hasOwnProperty("data")) {
            result = result["data"];
        }
        if (result.hasOwnProperty("data")) {
            result = result["data"];
        }
        console.log(`Result`);
        console.log(result);
        return result;
    }
}