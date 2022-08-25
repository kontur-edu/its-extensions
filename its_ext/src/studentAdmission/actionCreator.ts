import { ITSAction } from "../common/actions";

import { AdmissionInfo, IStudentData } from "../common/types";
import { UpdateStudentAdmissionAction } from "./actions";
import { IStudentAdmissionDistributionItem } from "./studentDistribution";

function createAdmissionToStatusToStudentsUpdates(
  personalNumberToDistributionItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  },
  admissionInfo: AdmissionInfo,
  studentData: IStudentData
) {
  // admissionId => status => studentIds
  const admissionToStudents: { [key: number]: { [key: number]: string[] } } =
    {};

  for (const personalNumber in personalNumberToDistributionItem) {
    const sItem = personalNumberToDistributionItem[personalNumber];
    const student = studentData.data[personalNumber];
    const allAdmissionIds = new Set<number>([
      ...sItem.admissionIds,
      ...sItem.selectedAdmissionIds,
    ]);
    allAdmissionIds.forEach((admissionId) => {
      if (!admissionToStudents.hasOwnProperty(admissionId)) {
        admissionToStudents[admissionId] = { 0: [], 1: [] };
      }
      const statusToStudentIds = admissionToStudents[admissionId];
      const isSelected = sItem.selectedAdmissionIds.includes(admissionId);
      if (admissionInfo[admissionId].hasOwnProperty(personalNumber)) {
        const admission = admissionInfo[admissionId][personalNumber];
        // status = 1 admitted, 2 - not
        if (isSelected && (!admission || admission.status !== 1)) {
          statusToStudentIds[1].push(student.id);
        } else if (!isSelected && admission?.status === 1) {
          statusToStudentIds[0].push(student.id);
        }
      }
    });
  }

  return admissionToStudents;
}

function generateUpdateStudentAdmissionActions(
  personalNumberToDistributionItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  },
  admissionInfo: AdmissionInfo,
  studentData: IStudentData
): ITSAction[] {
  const actions: ITSAction[] = [];

  const admissionToStudents = createAdmissionToStatusToStudentsUpdates(
    personalNumberToDistributionItem,
    admissionInfo,
    studentData
  );

  for (const admissionIdStr in admissionToStudents) {
    const admissionId = Number(admissionIdStr);
    const statusToStudentIds = admissionToStudents[admissionId];
    for (const statusStr in statusToStudentIds) {
      const status = Number(statusStr);
      const studentIds = statusToStudentIds[status];
      if (studentIds.length === 0) {
        continue;
      }
      actions.push(
        new UpdateStudentAdmissionAction(admissionId, studentIds, status)
      );
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
