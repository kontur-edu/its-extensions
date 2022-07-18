import {IITSContext} from "./Context";
import {IActionResponse} from "../utils/ITSApiService";

export enum ActionType {
    RefreshSelectionGroups,
    RefreshPeriods,
    RefreshSubgroups,
    DeleteSubgroupAction,
    UpdateSelectionGroup,
    UpdateLimit,
    CreatePeriod,
    UpdatePeriod,
    AddLoads,
    CreateSubgroups,
    UpdateSubgroupMetaLoadCount,
    UpdateTeacherForSubgroup,
    UpdateTaskResult,
};


export abstract class ITSAction {
    constructor(public actionType: ActionType) {

    }

    abstract getMessage(): string;
    abstract getMessageSimple(): string;
    abstract execute(context: IITSContext): Promise<IActionResponse>;
}


export async function ExecuteActions(actions: ITSAction[], itsContext: IITSContext): Promise<IActionResponse[]> {
    const results: IActionResponse[] = [];
    for (let action of actions) {
        const actionResult = await action.execute(itsContext);
        let resulMessage = `${action.getMessage()}`;
        if (actionResult.message) {
            resulMessage += ` ${actionResult.message}`;
        }
        results.push({
            success: actionResult.success,
            message: resulMessage,
        });
    }
    return results;
}