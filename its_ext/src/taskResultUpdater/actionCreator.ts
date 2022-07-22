import { ITSAction } from "../common/actions";
import { AdmissionInfo, IStudentData } from "../common/types";
import { UpdateTaskResultAction } from "./actions";

function generateUpdateTaskResultActions(
  admissionIds: number[],
  admissionInfo: AdmissionInfo,
  personalNumberToTaskResult: { [key: string]: number | null },
  studentData: IStudentData
): ITSAction[] {
  const actions: ITSAction[] = [];

  for (const personalNumber in personalNumberToTaskResult) {
    const newTaskResult = personalNumberToTaskResult[personalNumber] ?? 0;
    let studentAdmissionId = admissionIds[0];
    for (const admissionId of admissionIds) {
      if (!admissionInfo.hasOwnProperty(admissionId)) {
        throw Error(`admissionId: ${admissionId} not found in admissionInfo`);
      }
      if (admissionInfo[admissionId].hasOwnProperty(personalNumber)) {
        studentAdmissionId = admissionId;
        break;
      }
    }

    if (!admissionInfo[studentAdmissionId].hasOwnProperty(personalNumber)) {
      const admissionIdsStr = JSON.stringify(admissionIds);
      throw Error(
        `personalNumber: ${personalNumber} not found in admissionInfos ${admissionIdsStr}`
      );
    }

    const studentAdmission = admissionInfo[studentAdmissionId][personalNumber];

    if (!studentAdmission.testResult && !newTaskResult) {
      continue; // null <-> 0
    }

    if (studentAdmission.testResult === newTaskResult) {
      continue;
    }

    const student = studentData.data[personalNumber];
    actions.push(
      new UpdateTaskResultAction(student.id, studentAdmissionId, newTaskResult)
    );
  }
  return actions;
}

export function createTaskResultActions(
  admissionIds: number[],
  personalNumberToTaskResult: { [key: string]: number | null },
  admissionInfo: AdmissionInfo,
  studentData: IStudentData
): ITSAction[] {
  const actions: ITSAction[] = [];

  if (admissionIds.length === 0 || admissionIds.length > 2) {
    throw Error(
      `admissionIds must have length 1 or 2, but got ${admissionIds.length}`
    );
  }

  actions.push(
    ...generateUpdateTaskResultActions(
      admissionIds,
      admissionInfo,
      personalNumberToTaskResult,
      studentData
    )
  );

  return actions;
}
