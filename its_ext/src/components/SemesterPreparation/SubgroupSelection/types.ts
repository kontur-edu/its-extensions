import { ISubgoupDiffInfo, ISubgroupData } from "../../../common/types";

export interface ISubgroupSelectionProps {
    selectionGroupIds: number[];
    dataIsPrepared: boolean;
    onApply: (
        competitionGroupIds: number[],
        subgroupInfo: ISubgoupDiffInfo,
    ) => void;
    onUnauthorized: () => void;
}
