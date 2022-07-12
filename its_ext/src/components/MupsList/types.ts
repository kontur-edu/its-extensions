import { IMupData, IMupEdit } from "../../common/types";

export interface IMupsListProps {
    mupData: IMupData;
    mupEdits: {[key: string]: IMupEdit};
    onMupToggle: (mupId: string) => void;
    onMupLimitChange: (mupId: string, newLimit: number) => void;
}