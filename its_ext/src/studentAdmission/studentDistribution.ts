import {
  AdmissionInfo,
  CompetitionGroupIdToMupAdmissions,
  IMupData,
  IStudent,
  IStudentData,
} from "../common/types";
import { StudentDistributor } from "./studentDistributor";

export interface IStudentAdmissionDistributionItem {
  currentZE: number;
  admissionIds: number[];
  selectedAdmissionIds: number[];
  competitionGroupId: number;
}

export interface IMupDistributionItem {
  limit: number;
  count: number;
  valid?: boolean;
}

export interface IDistributionResult {
  personalNumberToStudentItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  };
  mupIdToMupItem: { [key: string]: IMupDistributionItem };
}

export function createPersonalNumberToStudentItem(
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo
): { [key: string]: IStudentAdmissionDistributionItem } {
  const personalNumberToStudentItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  } = {};

  for (const competitionGroupId of competitionGroupIds) {
    const mIdToAdmission =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    for (const mId in mIdToAdmission) {
      const admissionId = mIdToAdmission[mId].admissionId;

      const personalNumberToAdmission = admissionInfo[admissionId];
      for (const personalNumber in personalNumberToAdmission) {
        if (!personalNumberToStudentItem.hasOwnProperty(personalNumber)) {
          personalNumberToStudentItem[personalNumber] = {
            currentZE: 0,
            admissionIds: [],
            selectedAdmissionIds: [],
            competitionGroupId: competitionGroupId,
          };
        }
        const studentState = personalNumberToStudentItem[personalNumber];
        const admission = personalNumberToAdmission[personalNumber];

        if (admission?.priority || admission?.status === 1) {
          studentState.admissionIds.push(admissionId);
        }
        if (admission?.status === 1) {
          // status === 1 то есть уже зачислен на курс
          // studentState.currentZE += mupData.data[mId].ze;
          studentState.selectedAdmissionIds.push(admissionId);
        }
      }
    }
  }

  for (const pn in personalNumberToStudentItem) {
    const studentState = personalNumberToStudentItem[pn];
    studentState.admissionIds = studentState.admissionIds.sort((lhs, rhs) => {
      const lhsStudentAdmission = admissionInfo[lhs][pn]!;
      const rhsStudentAdmission = admissionInfo[rhs][pn]!;
      return lhsStudentAdmission.priority! - rhsStudentAdmission.priority!; //NOTE: can contain null if have "test result"
    });
  }

  return personalNumberToStudentItem;
}

export function findMupIdsWithTestResultRequired(
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo
): Set<string> {
  const result = new Set<string>();
  for (const competitionGroupId of competitionGroupIds) {
    const mIdToAdmission =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    for (const mId in mIdToAdmission) {
      const admission = mIdToAdmission[mId];
      const personalNumberToAdmission = admissionInfo[admission.admissionId];
      for (const personalNumber in personalNumberToAdmission) {
        const studentAdmission = personalNumberToAdmission[personalNumber];
        if (!studentAdmission) continue;
        if (studentAdmission.testResult) {
          result.add(admission.mupId);
          break;
        }
      }
    }
  }
  return result;
}

export interface IStudentDistributionAdmissionAlgoInfo {
  mupId: string;
  testPassed: boolean;
  priority: number | null;
  admitted: boolean;
}

export interface IStudentDistributionAlgoInfo {
  personalNumber: string;
  rating: number;
  competitionGroupId: number;
  admissionsWithPriorityOrTestResult: IStudentDistributionAdmissionAlgoInfo[];
  mupIdsAdmittedEarlier: Set<string>; // NOTE: mupIds
}

function createMupNameToMupId(mupData: IMupData) {
  const res: { [key: string]: string } = {};
  for (const mupId in mupData.data) {
    const name = mupData.data[mupId].name;
    res[name] = mupId;
  }
  return res;
}

export function createStudentDistributionAlgoInfos(
  personalNumbers: string[],
  studentData: IStudentData,
  personalNumberToAdmittedMupNames: { [key: string]: Set<string> },
  mupData: IMupData,
  admissionInfo: AdmissionInfo,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
): IStudentDistributionAlgoInfo[] {
  // console.log("createStudentDistributionAlgoInfos");
  const result: IStudentDistributionAlgoInfo[] = [];

  const mupNameToMupId = createMupNameToMupId(mupData);

  for (const pn of personalNumbers) {
    const student = studentData.data[pn];
    if (!student.rating) {
      continue;
    }
    const mupNamesAdmittedEarlier =
      personalNumberToAdmittedMupNames.hasOwnProperty(pn)
        ? personalNumberToAdmittedMupNames[pn]
        : new Set<string>();
    const mupIdsAdmittedEarlier = new Set<string>();
    mupNamesAdmittedEarlier.forEach((mupName) => {
      if (!mupNameToMupId.hasOwnProperty(mupName)) {
        console.warn(`mupName: ${mupName} not found in mupNameToMupId`);
        return;
      }
      const mupId = mupNameToMupId[mupName];
      mupIdsAdmittedEarlier.add(mupId);
    });

    const studentDistributionAlgoInfo: IStudentDistributionAlgoInfo = {
      personalNumber: student.personalNumber,
      rating: student.rating,
      competitionGroupId: student.competitionGroupId,
      admissionsWithPriorityOrTestResult: [],
      mupIdsAdmittedEarlier: mupIdsAdmittedEarlier,
    };
    const mupToAdmissionMeta =
      competitionGroupIdToMupAdmissions[student.competitionGroupId];
    for (const mupId in mupToAdmissionMeta) {
      const admissionMeta = mupToAdmissionMeta[mupId];
      const admissionId = admissionMeta.admissionId;
      if (
        !admissionInfo.hasOwnProperty(admissionId) ||
        !admissionInfo[admissionId].hasOwnProperty(pn)
      ) {
        continue;
      }
      const admission = admissionInfo[admissionId][pn];
      if (admission && (admission.priority !== null || admission.testResult)) {
        const studentDistributionAdmissionAlgoInfo: IStudentDistributionAdmissionAlgoInfo =
          {
            // admissionId: Number(admissionId),
            mupId: mupId,
            testPassed:
              admission.testResult !== null && admission.testResult > 0,
            priority: admission.priority,
            admitted: admission.status === 1,
          };
        studentDistributionAlgoInfo.admissionsWithPriorityOrTestResult.push(
          studentDistributionAdmissionAlgoInfo
        );
      }
    }
    result.push(studentDistributionAlgoInfo);
  }

  return result;
}

export interface IMupAlgoInfo {
  ze: number;
  testResultRequired: boolean;
}

export function createMupIdToMupAlgoInfo(
  mupIds: string[] | Set<string>,
  mupData: IMupData,
  mupIdsWithTestResultRequired: Set<string>
): { [key: string]: IMupAlgoInfo } {
  const result: { [key: string]: IMupAlgoInfo } = {};
  mupIds.forEach((mupId) => {
    const mup = mupData.data[mupId];
    const testResultRequired = mupIdsWithTestResultRequired.has(mupId);
    const mupAlgoInfo: IMupAlgoInfo = {
      ze: mup.ze,
      testResultRequired: testResultRequired,
    };
    result[mupId] = mupAlgoInfo;
  });

  return result;
}

export interface IPersonalNumberToAdmissionIds {
  [key: string]: Set<number>;
}

export function createStudentDistribution(
  studentDistributionAlgoInfos: IStudentDistributionAlgoInfo[],
  mupIdToMupAlgoInfo: { [key: string]: IMupAlgoInfo },
  competitionGroupIdToZELimit: { [key: number]: number },
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
) {
  const studentDistributor = new StudentDistributor(
    studentDistributionAlgoInfos,
    mupIdToMupAlgoInfo,
    competitionGroupIdToZELimit,
    competitionGroupIdToMupAdmissions
  );

  const result = studentDistributor.createStudentDistribution();

  return result;
}

export function getAllPersonalNumbers(
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo
): Set<string> {
  const admissionIdFromDifferentCompetitionGroups: number[] = [];
  for (const competitionGroupId of competitionGroupIds) {
    const mIdToAdmission =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    for (const mupId in mIdToAdmission) {
      admissionIdFromDifferentCompetitionGroups.push(
        mIdToAdmission[mupId].admissionId
      );
      break;
    }
  }

  const allPersonalNumbers = new Set<string>();
  for (const admissionId of admissionIdFromDifferentCompetitionGroups) {
    Object.keys(admissionInfo[admissionId]).forEach((pn) =>
      allPersonalNumbers.add(pn)
    );
  }

  return allPersonalNumbers;
}

function compareByRating(lhs: IStudent, rhs: IStudent) {
  const r1 = lhs.rating ?? -1;
  const r2 = rhs.rating ?? -1;
  return r2 - r1;
}

export function filterActiveStudentsAndSortByRating(
  allPersonalNumbers: string[],
  studentData: IStudentData
) {
  return Array.from(allPersonalNumbers)
    .filter((pn) => {
      const student = studentData.data[pn];
      return student.status === "Активный" && student.rating !== null;
    })
    .sort((lhs, rhs) => {
      return compareByRating(studentData.data[lhs], studentData.data[rhs]);
    });
}

export interface IStudentDistributionInfo {
  personalNumber: string;
  fullname: string;
  group: string;
  mupIds: string[];
}
export interface IStudentsDistributionData {
  students: IStudentDistributionInfo[];
  mupIdToMupName: {
    [key: string]: string;
  }; // mupId -> mupName
}

export function getAvailableMupIds(
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
) {
  const availableAdmissionIds = new Set<string>();
  for (const competitionGroupId of competitionGroupIds) {
    const mupToAdmissionMeta =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    for (const mupId in mupToAdmissionMeta) {
      availableAdmissionIds.add(mupId);
    }
  }
  return availableAdmissionIds;
}

export function getAvailableAdmissionIds(
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
) {
  const availableAdmissionIds = new Set<number>();
  for (const competitionGroupId of competitionGroupIds) {
    const mupToAdmissionMeta =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    for (const mupId in mupToAdmissionMeta) {
      availableAdmissionIds.add(mupToAdmissionMeta[mupId].admissionId);
    }
  }
  return availableAdmissionIds;
}

const compareStudentsByGroupAndName =
  (studentData: IStudentData) => (lhs: string, rhs: string) => {
    const lhsStudent = studentData.data[lhs];
    const rhsStudent = studentData.data[rhs];
    if (lhsStudent.groupName !== rhsStudent.groupName) {
      return lhsStudent.groupName.localeCompare(rhsStudent.groupName);
    }
    return lhsStudent.surname.localeCompare(rhsStudent.surname);
  };

export function createStudentsDistributionData(
  newPersonalNumberToStudentItems: {
    [key: string]: IStudentAdmissionDistributionItem;
  },
  studentData: IStudentData,
  mupData: IMupData,
  admissionIdToMupId: { [key: number]: string },
  availableAdmissionIds: number[]
): IStudentsDistributionData {
  const result: IStudentsDistributionData = {
    students: [],
    mupIdToMupName: {},
  };
  const personalNumbersSorted = Object.keys(
    newPersonalNumberToStudentItems
  ).sort(compareStudentsByGroupAndName(studentData));
  for (const personalNumber of personalNumbersSorted) {
    const student = studentData.data[personalNumber];
    const mupIds = newPersonalNumberToStudentItems[
      personalNumber
    ].selectedAdmissionIds.map((aId) => admissionIdToMupId[aId]);
    if (student.status === "Активный" && student.rating !== null) {
      const studentInfo: IStudentDistributionInfo = {
        personalNumber: student.personalNumber,
        fullname: `${student.surname} ${student.firstname} ${student.patronymic}`,
        group: student.groupName,
        mupIds: mupIds,
      };
      result.students.push(studentInfo);
    }
  }

  for (const admissionId of availableAdmissionIds) {
    const mupId = admissionIdToMupId[admissionId];
    result.mupIdToMupName[mupId] = mupData.data[mupId].shortName;
  }
  return result;
}

export function calcZE(
  admissionIds: number[] | Set<number>,
  mupData: IMupData,
  admissionIdToMupId: { [key: number]: string }
): number {
  let res = 0;
  admissionIds.forEach((admissionId) => {
    const mupId = admissionIdToMupId[admissionId];
    const mup = mupData.data[mupId];
    res += mup.ze;
  });
  return res;
}

export function prepareStudentItems(
  competitionGroupIds: number[],
  mupData: IMupData,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo,
  admissionIdToMupId: { [key: number]: string },
  studentData: IStudentData,
  studentPersonalNumberToMupIds?: { [key: string]: string[] }
): {
  [key: string]: IStudentAdmissionDistributionItem;
} {
  const personalNumberToStudentItems = createPersonalNumberToStudentItem(
    competitionGroupIds,
    competitionGroupIdToMupAdmissions,
    admissionInfo
  );
  if (studentPersonalNumberToMupIds) {
    for (const pn in personalNumberToStudentItems) {
      if (studentPersonalNumberToMupIds.hasOwnProperty(pn)) {
        const student = studentData.data[pn];
        const selectedMupIds = studentPersonalNumberToMupIds[pn];
        const newSelectedAdmissionIds: number[] = selectedMupIds.map(
          (mId) =>
            competitionGroupIdToMupAdmissions[student.competitionGroupId][mId]
              .admissionId
        );
        personalNumberToStudentItems[pn].selectedAdmissionIds =
          newSelectedAdmissionIds;
      }
    }
  }
  for (const pn in personalNumberToStudentItems) {
    personalNumberToStudentItems[pn].currentZE = calcZE(
      personalNumberToStudentItems[pn].selectedAdmissionIds,
      mupData,
      admissionIdToMupId
    );
  }
  // const mupIdToMupItems = createMupIdToMupItemByStudentItems(
  //   personalNumberToStudentItems,
  //   competitionGroupIds,
  //   competitionGroupIdToMupAdmissions,
  //   admissionIdToMupId
  // );

  return personalNumberToStudentItems;
}

export interface IAdmissionRecord {
  initStatus: number;
  priority: number | null;
  name: string;
}

export function createAdmissionRecord(
  admissionId: number,
  personalNumber: string,
  admissionInfo: AdmissionInfo,
  mupData: IMupData,
  admissionIdToMupId: { [key: number]: string }
) {
  const res: IAdmissionRecord = {
    initStatus: 0,
    priority: null,
    name: "",
  };

  if (admissionInfo[admissionId].hasOwnProperty(personalNumber)) {
    const admission = admissionInfo[admissionId][personalNumber];
    res.initStatus = admission?.status || 0;
    res.priority = admission?.priority ?? null;
  }

  const mupId = admissionIdToMupId[admissionId];
  res.name = mupData.data[mupId].shortName;

  return res;
}

export function parseStudentAdmissionsFromText(
  text: string
): IStudentsDistributionData | null {
  let obj = null;
  try {
    obj = JSON.parse(text);
  } catch (err) {
    return null;
  }

  if (
    !obj.hasOwnProperty("students") ||
    !obj.hasOwnProperty("mupIdToMupName") ||
    !Array.isArray(obj.students)
  ) {
    return null;
  }
  obj = obj as IStudentsDistributionData;
  for (const studentInfo of obj.students) {
    if (
      !studentInfo.hasOwnProperty("personalNumber") ||
      !studentInfo.hasOwnProperty("mupIds")
    ) {
      return null;
    }

    const mupIds = studentInfo.mupIds;
    if (!Array.isArray(mupIds)) {
      return null;
    }
    for (const mupId of mupIds) {
      if (!mupId) {
        return null;
      }
    }
  }

  for (const aId in obj.mupIdToMupName) {
    const mupName = obj.mupIdToMupName[aId];
    if (!mupName) return null;
  }
  return obj;
}

export function validateStudentAdmissions(
  studentsDistributionData: IStudentsDistributionData,
  studentData: IStudentData,
  mupData: IMupData,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
): { success: boolean; messages: string[] } {
  const notDeterminedPersonalNumbers: string[] = [];
  const notDeterminedMupIds = new Set<string>();
  const admissionNotExistForMupIds = new Set<string>();
  const personalNumbersWithDuplicateMupIds: string[] = [];
  for (const studentInfo of studentsDistributionData.students) {
    let studentFound = true;
    if (!studentData.data.hasOwnProperty(studentInfo.personalNumber)) {
      notDeterminedPersonalNumbers.push(studentInfo.personalNumber);
      studentFound = false;
    }

    for (const mupId of studentInfo.mupIds) {
      if (!mupData.data.hasOwnProperty(mupId)) {
        notDeterminedMupIds.add(mupId);
      }
    }
    if (studentFound) {
      const student = studentData.data[studentInfo.personalNumber];
      const mupIdToAdmissionId =
        competitionGroupIdToMupAdmissions[student.competitionGroupId];
      for (const mupId of studentInfo.mupIds) {
        if (
          !notDeterminedMupIds.has(mupId) &&
          !mupIdToAdmissionId.hasOwnProperty(mupId)
        ) {
          admissionNotExistForMupIds.add(mupId);
        }
      }
    }
    const mupIdsSet = new Set<string>(studentInfo.mupIds);
    if (mupIdsSet.size !== studentInfo.mupIds.length) {
      personalNumbersWithDuplicateMupIds.push(studentInfo.personalNumber);
    }
  }
  const messages: string[] = [];
  if (notDeterminedPersonalNumbers.length > 0) {
    const pnStr = notDeterminedPersonalNumbers.map((x) => `"${x}"`).join(", ");
    messages.push(`Следующие личные номера студентов не распознаны: ${pnStr}`);
  }
  if (notDeterminedMupIds.size > 0) {
    const mStr = Array.from(notDeterminedMupIds)
      .map((x) => `"${x}"`)
      .join(", ");
    messages.push(`Следующие идентификаторы МУПов не распознаны: ${mStr}`);
  }
  if (admissionNotExistForMupIds.size > 0) {
    const mStr = Array.from(admissionNotExistForMupIds)
      .map((x) => `"${x}"`)
      .join(", ");
    messages.push(
      `Следующие идентификаторы МУПов присутствуют у студентов, но им не доступны: ${mStr}`
    );
  }
  if (personalNumbersWithDuplicateMupIds.length > 0) {
    const pnStr = personalNumbersWithDuplicateMupIds
      .map((x) => `"${x}"`)
      .join(", ");
    messages.push(
      `Следующие личные номера студентов имеют повторяющиеся идентификаторы МУПов: ${pnStr}`
    );
  }

  return { success: messages.length === 0, messages: messages };
}
