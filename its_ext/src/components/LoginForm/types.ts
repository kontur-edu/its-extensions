import { ICredentials } from "../../common/types";

export interface ILoginFormProps {
    onSubmit: (creds: ICredentials) => void;
}