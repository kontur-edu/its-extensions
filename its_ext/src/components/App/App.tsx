import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Main } from "../Main";

import { ITSContext } from "../../common/Context";

import { PROXY_URL, LOGIN_URL } from "../../utils/constants";
import { RequestService } from "../../utils/requestService";
import { ITSApiService } from "../../utils/ITSApiService";
import { ITSRepository } from "../../utils/repository";

const requestService = new RequestService(PROXY_URL, LOGIN_URL);
const apiService = new ITSApiService(requestService);
const dataRepository = new ITSRepository(apiService);

function App() {
  return (
    <BrowserRouter>
      <ITSContext.Provider
        value={{ requestService, apiService, dataRepository }}
      >
        <Main />
      </ITSContext.Provider>
    </BrowserRouter>
  );
}

export default App;
