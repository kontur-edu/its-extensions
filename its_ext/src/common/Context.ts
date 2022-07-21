import { createContext } from "react";
import { RequestService } from "../utils/requestService";
import { ITSApiService } from "../utils/ITSApiService";
import { ITSRepository } from "../utils/repository";

export interface IITSContext {
  requestService: RequestService;
  apiService: ITSApiService;
  dataRepository: ITSRepository;
}

export const ITSContext = createContext<IITSContext | null>(null);
