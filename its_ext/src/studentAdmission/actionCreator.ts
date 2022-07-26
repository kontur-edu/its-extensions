import { ITSAction } from "../common/actions";

import { AdmissionInfo, IStudentData } from "../common/types";
import { UpdateStudentAdmissionAction } from "./actions";
import { IStudentAdmissionDistributionItem } from "./studentDistributor";

function generateUpdateStudentAdmissionActions(
  personalNumberToDistributionItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  },
  admissionInfo: AdmissionInfo,
  studentData: IStudentData
): ITSAction[] {
  // console.log("generateUpdateStudentAdmissionActions");
  // console.log(personalNumberToDistributionItem);
  const actions: ITSAction[] = [];

  for (const personalNumber in personalNumberToDistributionItem) {
    const sItem = personalNumberToDistributionItem[personalNumber];
    const student = studentData.data[personalNumber];
    const allAdmissionIds = new Set<number>([
      ...sItem.admissionIds,
      ...sItem.selectedAdmissionIds,
    ]);
    for (const admissionId of Array.from(allAdmissionIds)) {
      const isSelected = sItem.selectedAdmissionIds.includes(admissionId);
      if (admissionInfo[admissionId].hasOwnProperty(personalNumber)) {
        const admission = admissionInfo[admissionId][personalNumber];
        // status = 1 admitted, 2 - not
        if (isSelected && (!admission || admission.status !== 1)) {
          // add new
          actions.push(
            new UpdateStudentAdmissionAction(student.id, admissionId, 1)
          );
        } else if (!isSelected && admission?.status === 1) {
          // remove from selection
          actions.push(
            new UpdateStudentAdmissionAction(student.id, admissionId, 2)
          );
        }
      }
    }
  }
  return actions;
}

export function createStudentAdmissionActions(
  personalNumberToDistributionItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  },
  admissionInfo: AdmissionInfo,
  studentData: IStudentData
): ITSAction[] {
  const actions: ITSAction[] = [];

  actions.push(
    ...generateUpdateStudentAdmissionActions(
      personalNumberToDistributionItem,
      admissionInfo,
      studentData
    )
  );

  return actions;
}
