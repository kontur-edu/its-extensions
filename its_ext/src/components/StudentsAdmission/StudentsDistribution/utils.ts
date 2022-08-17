import {
  ActionType,
  IActionExecutionLogItem,
  ITSAction,
} from "../../../common/actions";
import { IMupData } from "../../../common/types";
import { UpdateStudentAdmissionAction } from "../../../studentAdmission/actions";

export function createStudentDistributionMupToErrorMessages(
  actionResults: IActionExecutionLogItem[],
  actions: ITSAction[],
  admissionIdToMupId: { [key: number]: string },
  mupData: IMupData
) {
  const mupToMessages: { [key: string]: string[] } = {};
  const length = Math.min(actionResults.length, actions.length);
  for (let i = 0; i < length; i++) {
    const action = actions[i];
    const result = actionResults[i];
    if (action.actionType === ActionType.UpdateStudentAdmission) {
      const updateStudentAdmission = action as UpdateStudentAdmissionAction;
      const admissionId = updateStudentAdmission.admissionId;
      if (!admissionIdToMupId.hasOwnProperty(admissionId)) continue;
      const mupId = admissionIdToMupId[admissionId];
      if (!mupData.data.hasOwnProperty(mupId)) continue;
      const mupName = mupData.data[mupId].name;
      if (!mupToMessages.hasOwnProperty(mupName)) {
        mupToMessages[mupName] = [];
      }
      const messages = mupToMessages[mupName];
      for (const resultItem of result.actionResults) {
        if (!resultItem.success) {
          const parts = resultItem.message
            ?.split("<br/></br>")
            .map((item) => item.trim())
            .filter((item) => item);
          if (parts) {
            messages.push(...parts);
          }
        }
      }
    }
  }
  return mupToMessages;
}
