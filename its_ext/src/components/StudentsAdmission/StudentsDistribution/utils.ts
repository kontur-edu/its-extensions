import {
  ActionType,
  IActionExecutionLogItem,
  ITSAction,
} from "../../../common/actions";
import {
  AdmissionInfo,
  CompetitionGroupIdToMupAdmissions,
  IMupData,
  IStudentData,
} from "../../../common/types";
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

export interface IMupPriorityData {
  mupId: string;
  priority: number;
}

export interface IStudentNumberToMupPrioritiesData {
  [key: string]: IMupPriorityData[];
}

export interface IStudentPriority {
  name: string;
  personalNumber: string;
  groupName: string;
  mupPriorities: IMupPriorityData[];
}

export interface IStudentMupPriorityData {
  studentPriorities: IStudentPriority[];
  mupIdToMupName: {
    [key: string]: string;
  };
}

export function createStudentNumberToMupPrioritiesData(
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo
): IStudentNumberToMupPrioritiesData {
  const result: IStudentNumberToMupPrioritiesData = {};

  for (const competitionGroupId of competitionGroupIds) {
    if (!competitionGroupIdToMupAdmissions.hasOwnProperty(competitionGroupId)) {
      continue;
    }
    const mupIdToAdmissionMeta =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    for (const mupId in mupIdToAdmissionMeta) {
      const admissionMeta = mupIdToAdmissionMeta[mupId];
      const admissionId = admissionMeta.admissionsId;

      if (!admissionInfo.hasOwnProperty(admissionId)) {
        continue;
      }

      const personalNumberToStudentAdmissions = admissionInfo[admissionId];
      for (const personalNumber in personalNumberToStudentAdmissions) {
        const studentAdmission =
          personalNumberToStudentAdmissions[personalNumber];
        if (studentAdmission && studentAdmission.priority !== null) {
          const priority = studentAdmission.priority;
          if (!result.hasOwnProperty(personalNumber)) {
            result[personalNumber] = [];
          }
          const mupPriorityData: IMupPriorityData = {
            mupId,
            priority,
          };
          result[personalNumber].push(mupPriorityData);
        }
      }
    }
  }

  return result;
}


export function createStudentMupPriorityData(
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo,
  mupData: IMupData,
  studentData: IStudentData,
): IStudentMupPriorityData {
  const result: IStudentMupPriorityData = {
    studentPriorities: [],
    mupIdToMupName: {}
  };

  const personalNumberToMupPriorities: {[key: string]: IMupPriorityData[]}= {};

  const mupIds = new Set<string>();
  for (const competitionGroupId of competitionGroupIds) {
    if (!competitionGroupIdToMupAdmissions.hasOwnProperty(competitionGroupId)) {
      continue;
    }
    const mupIdToAdmissionMeta =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    for (const mupId in mupIdToAdmissionMeta) {
      mupIds.add(mupId);
      const admissionMeta = mupIdToAdmissionMeta[mupId];
      const admissionId = admissionMeta.admissionsId;

      if (!admissionInfo.hasOwnProperty(admissionId)) {
        continue;
      }

      const personalNumberToStudentAdmissions = admissionInfo[admissionId];
      for (const personalNumber in personalNumberToStudentAdmissions) {
        const studentAdmission =
          personalNumberToStudentAdmissions[personalNumber];
        if (studentAdmission && studentAdmission.priority !== null) {
          const priority = studentAdmission.priority;
          if (!personalNumberToMupPriorities.hasOwnProperty(personalNumber)) {
            personalNumberToMupPriorities[personalNumber] = [];
          }
          const mupPriorityData: IMupPriorityData = {
            mupId,
            priority,
          };
          personalNumberToMupPriorities[personalNumber].push(mupPriorityData);
        }
      }
    }
  }

  for (const personalNumber in personalNumberToMupPriorities) {
    if (!studentData.data.hasOwnProperty(personalNumber)) {
      console.warn(`personalNumber: ${personalNumber} not found in studentData`);
      continue;
    }
    const student = studentData.data[personalNumber];
    const nameParst = [student.surname, student.firstname, student.patronymic].filter(np => np);

    const name = nameParst.join(' ');
    const groupName = student.groupName;
    
    const mupPriorities = personalNumberToMupPriorities[personalNumber];
    
    const studentPriority: IStudentPriority = {
      name,
      personalNumber,
      groupName,
      mupPriorities,
    }
    result.studentPriorities.push(studentPriority);
  }

  mupIds.forEach(mupId => {
    if (!mupData.data.hasOwnProperty(mupId)) {
      console.warn(`mupId: ${mupId} not found in mupData`);
      return;
    }

    result.mupIdToMupName[mupId] = mupData.data[mupId].name;
  })

  return result;
}
