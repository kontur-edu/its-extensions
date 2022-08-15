import React from "react";
import { HashRouter } from "react-router-dom";
import { Main } from "../Main";

import { ITSContext } from "../../common/Context";

import {
  PROXY_URL,
  PROXY_URL_LOCAL,
  LOGIN_URL,
  SAFE_MODE,
} from "../../utils/constants";
import { RequestService } from "../../utils/requestService";
import { ITSApiService } from "../../utils/ITSApiService";
import { ITSRepository } from "../../utils/repository";

import {
  ApiValidator,
  SAFE_API_VALIDATOR_CONFIG,
  ALLOW_ALL_API_VALIDATOR_CONFIG,
} from "../../utils/apiValidator";
import { isLocalAddress } from "../../utils/helpers";

const apiValidatorConfig = SAFE_MODE
  ? SAFE_API_VALIDATOR_CONFIG
  : ALLOW_ALL_API_VALIDATOR_CONFIG;
const proxyUrl =
  isLocalAddress(window.location.hostname) || !PROXY_URL
    ? PROXY_URL_LOCAL
    : PROXY_URL;
const apiValidator = new ApiValidator(apiValidatorConfig);
const requestService = new RequestService(proxyUrl, LOGIN_URL, apiValidator);
const apiService = new ITSApiService(requestService, false);
const dataRepository = new ITSRepository(apiService);

function App() {
  // console.log(apiValidatorConfig);
  return (
    <HashRouter>
      <ITSContext.Provider
        value={{ requestService, apiService, dataRepository }}
      >
        <Main />
      </ITSContext.Provider>
    </HashRouter>
  );
}

export default App;
