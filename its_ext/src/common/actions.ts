import { IITSContext } from "./Context";
import { IActionResponse } from "../utils/ITSApiService";

export enum ActionType {
  RefreshSelectionGroups,
  RefreshPeriods,
  RefreshSubgroups,
  DeleteSubgroupAction,
  UpdateSelectionGroup,
  UpdateLimit,
  UpdateModules,
  CreatePeriod,
  UpdatePeriod,
  AddLoads,
  CreateSubgroups,
  UpdateSubgroupMetaLoadCount,
  UpdateTeacherForSubgroup,
  UpdateTaskResult,
  UpdateStudentAdmission,
}

export function checkAllRefreshAction(actions: ITSAction[]) {
  return actions.every(a =>
    a.actionType === ActionType.RefreshSelectionGroups ||
    a.actionType === ActionType.RefreshPeriods ||
    a.actionType === ActionType.RefreshSubgroups
  );
}

export interface IActionResultInfo {}

export abstract class ITSAction {
  constructor(public actionType: ActionType) {}

  abstract getMessage(): string;
  abstract getMessageSimple(): string;
  abstract execute(context: IITSContext): Promise<IActionResponse[]>;
}

export interface IActionExecutionLogItem {
  actionMessage: string;
  actionResults: { success: boolean; message?: string }[];
}

export async function executeActions(
  actions: ITSAction[],
  itsContext: IITSContext
): Promise<IActionExecutionLogItem[]> {
  const results: IActionExecutionLogItem[] = [];
  for (let action of actions) {
    let actionResults: IActionResponse[] = [];
    try {
      actionResults = await action.execute(itsContext);
    } catch(err) {
      actionResults.push({success: false, message: err as string})
    }
    // console.log("actionResults");
    // console.log(actionResults);
    const actionExecutionLogItem: IActionExecutionLogItem = {
      actionMessage: action.getMessage(),
      actionResults: [],
    };
    actionResults.forEach((ar) => {
      let message = "выполнено";
      if (ar.summary || ar.message) {
        message = `${ar.summary || ""} ${ar.message || ""}`;
      }
      actionExecutionLogItem.actionResults.push({
        success: ar.success,
        message: message,
      });
    });
    results.push(actionExecutionLogItem);
  }
  return results;
}
