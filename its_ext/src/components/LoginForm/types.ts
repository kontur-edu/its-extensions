import { ICredentials } from "../../common/types";

export interface ILoginFormProps {
  title: string;
  onSubmit: (creds: ICredentials) => void;
}
