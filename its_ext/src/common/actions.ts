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
  UpdateSubgroup,
  UpdateTaskResult,
  UpdateStudentAdmission,
  UpdateMembership,
}

export function isRefreshAction(action: ITSAction) {
  return (
    action.actionType === ActionType.RefreshSelectionGroups ||
    action.actionType === ActionType.RefreshPeriods ||
    action.actionType === ActionType.RefreshSubgroups
  );
}

export function checkAllRefreshAction(actions: ITSAction[]) {
  return actions.every((a) => isRefreshAction(a));
}

export interface IActionResultInfo {}

export abstract class ITSAction {
  constructor(public actionType: ActionType) {}

  abstract getMessage(): string;
  abstract getMessageSimple(): string;
  abstract execute(context: IITSContext): Promise<IActionResponse[]>;
}

export interface IActionExecutionLogItemActionResult {
  success: boolean;
  message?: string;
  summary?: string;
}

export interface IActionExecutionLogItem {
  actionMessage: string;
  actionResults: IActionExecutionLogItemActionResult[];
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
    } catch (err) {
      actionResults.push({ success: false, message: err as string });
    }
    const actionExecutionLogItem: IActionExecutionLogItem = {
      actionMessage: action.getMessage(),
      actionResults: [],
    };
    actionResults.forEach((ar) => {
      actionExecutionLogItem.actionResults.push({
        success: ar.success,
        message: ar.message || "выполнено",
        summary: ar.summary,
      });
    });
    results.push(actionExecutionLogItem);
  }
  return results;
}
