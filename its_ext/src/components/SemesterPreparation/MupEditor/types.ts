import { IMupData, IMupDiff} from "../../../common/types";


export interface IMupEditorProps {
    selectionGroupIds: number[];
    dataIsPrepared: boolean;
    onApply: (
        selectedMupIds: string[],
        mupDiffs: {[key: string]: IMupDiff},
        newDates: [string, string],
        limits: {[key: string]: number}
    ) => void;
    onUnauthorized: () => void;
}
