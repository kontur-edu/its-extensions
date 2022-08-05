import React from "react";
import { HashRouter } from "react-router-dom";
import { Main } from "../Main";

import { ITSContext } from "../../common/Context";

import { PROXY_URL, LOGIN_URL } from "../../utils/constants";
import { RequestService } from "../../utils/requestService";
import { ITSApiService } from "../../utils/ITSApiService";
import { ITSRepository } from "../../utils/repository";
import { ApiValidator, SAFE_API_VALIDATOR_CONFIG, ALLOW_ALL_API_VALIDATOR_CONFIG } from "../../utils/apiValidator";

const apiValidatorConfig = 
  SAFE_API_VALIDATOR_CONFIG;
  // ALLOW_ALL_API_VALIDATOR_CONFIG;

const apiValidator = new ApiValidator(apiValidatorConfig);
const requestService = new RequestService(PROXY_URL, LOGIN_URL, apiValidator);
const apiService = new ITSApiService(requestService, false);
const dataRepository = new ITSRepository(apiService);

function App() {
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
