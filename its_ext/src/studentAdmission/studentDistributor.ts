// CG -> AdmissionMeta[]  // mupName, admissionId
// admissionMeta -> StudentWithAdmision[] (=> students, => admissionInfo)

import {
  AdmissionInfo,
  CompetitionGroupIdToMupAdmissions,
  IMupData,
  IStudent,
  IStudentData,
} from "../common/types";

function compareByRating(lhs: IStudent, rhs: IStudent) {
  const r1 = lhs.rating ?? -1;
  const r2 = rhs.rating ?? -1;
  return r2 - r1;
}

export interface IStudentAdmissionDistributionItem {
  // admissions: IStudentAdmission[];
  currentZ: number;
  admissionIds: number[];
  selectedAdmissionIds: number[];
  competitionGroupId: number;
}

export interface IMupDistributionItem {
  limit: number;
  count: number;
  valid?: boolean;
  // testResultRequired: boolean;
}

export interface IDistributionResult {
  personalNumberToStudentItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  };
  mupIdToMupItem: { [key: string]: IMupDistributionItem };
}

function calcZE(
  admissionIds: number[],
  mupData: IMupData,
  admissionIdToMupId: { [key: number]: string }
): number {
  let res = 0;
  for (const admissionId of admissionIds) {
    const mupId = admissionIdToMupId[admissionId];
    const mup = mupData.data[mupId];
    res += mup.ze;
  }
  return res;
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
      const admissionId = mIdToAdmission[mId].admissionsId;

      const personalNumberToAdmission = admissionInfo[admissionId];
      for (const personalNumber in personalNumberToAdmission) {
        if (!personalNumberToStudentItem.hasOwnProperty(personalNumber)) {
          personalNumberToStudentItem[personalNumber] = {
            currentZ: 0,
            admissionIds: [],
            selectedAdmissionIds: [],
            competitionGroupId: competitionGroupId,
          };
        }
        const studentItem = personalNumberToStudentItem[personalNumber];
        const admission = personalNumberToAdmission[personalNumber];

        if (admission.priority || admission.status === 1) {
          studentItem.admissionIds.push(admissionId);
        }
        if (admission.status === 1) {
          // status === 1 то есть уже зачислен на курс
          // studentItem.currentZ += mupData.data[mId].ze;
          studentItem.selectedAdmissionIds.push(admissionId);
        }
      }
    }
  }

  for (const pn in personalNumberToStudentItem) {
    const studentItem = personalNumberToStudentItem[pn];
    studentItem.admissionIds = studentItem.admissionIds.sort((lhs, rhs) => {
      const lhsStudentAdmission = admissionInfo[lhs][pn]!;
      const rhsStudentAdmission = admissionInfo[rhs][pn]!;
      return lhsStudentAdmission.priority! - rhsStudentAdmission.priority!; //NOTE: should be filtered to not contain priority = null
    });
  }

  return personalNumberToStudentItem;
}

export function createMupIdToMupItemByStudentItems(
  pnToStudentItem: { [key: string]: IStudentAdmissionDistributionItem },
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionIdToMupId: { [key: number]: string }
): { [key: string]: IMupDistributionItem } {
  const mupIdToMupItem: { [key: string]: IMupDistributionItem } = {};
  for (const competitionId of competitionGroupIds) {
    const mupIdToAdmission = competitionGroupIdToMupAdmissions[competitionId];
    for (const mupId in mupIdToAdmission) {
      const admission = mupIdToAdmission[mupId];

      if (!mupIdToMupItem.hasOwnProperty(mupId)) {
        mupIdToMupItem[mupId] = {
          limit: admission.limit, // expect limits are checked in
          count: 0,
          valid: true,
        };
      } else {
        if (mupIdToMupItem[mupId].limit !== admission.limit) {
          mupIdToMupItem[mupId].valid = false;
          // throw new Error(`Mup limit not equal (${mupIdToMupItem[mupId].limit} ${admission.limit})`);
        }
      }
    }
  }

  for (const pn in pnToStudentItem) {
    const sItem = pnToStudentItem[pn];
    for (const aId of sItem.selectedAdmissionIds) {
      const mupId = admissionIdToMupId[aId];
      if (mupIdToMupItem.hasOwnProperty(mupId)) {
        mupIdToMupItem[mupId].count++;
      }
    }
  }

  return mupIdToMupItem;
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
      const personalNumberToAdmission = admissionInfo[admission.admissionsId];
      let studentsWithTestResultsCount = 0;
      let potentialStudents = 0;
      for (const personalNumber in personalNumberToAdmission) {
        const studentAdmission = personalNumberToAdmission[personalNumber];
        if (studentAdmission.testResult) {
          studentsWithTestResultsCount++;
          potentialStudents++;
        } else if (studentAdmission.priority || studentAdmission.status === 1) {
          potentialStudents++;
        }
      }

      if (studentsWithTestResultsCount > potentialStudents / 2) {
        result.add(admission.mupId);
        break;
      }
    }
  }
  return result;
}

export function tryDistributeMupsByStudentRatingAndAdmissionPriority(
  personalNumberToStudentItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  },
  mupIdToMupItem: { [key: string]: IMupDistributionItem },
  mupIdsWithTestResultRequired: Set<string>,
  competitionGroupIdToZELimit: { [key: number]: number },
  personalNumbersSortedByRating: string[],
  mupData: IMupData,
  admissionIdToMupId: { [key: number]: string },
  admissionInfo: AdmissionInfo
) {
  console.log(`tryDistributeMupsByStudentRatingAndAdmissionPriority: personalNumberToStudentItem`);
  console.log(personalNumberToStudentItem);
  for (const personalNumber of personalNumbersSortedByRating) {
    const sItem = personalNumberToStudentItem[personalNumber];
    const zeLimit = competitionGroupIdToZELimit[sItem.competitionGroupId];
    if (sItem.currentZ >= zeLimit) continue;
    for (const admissionId of sItem.admissionIds) {
      if (sItem.selectedAdmissionIds.includes(admissionId)) {
        continue; // already admitted
      }
      const admission = admissionInfo[admissionId][personalNumber];
      // if (!admission) {
      //   throw new Error(`tryDistributeMupsByStudentRatingAndAdmissionPriority:
      //     admission is null for admissionId: ${admissionId} personalNumber: ${personalNumber}`);
      // }
      if (sItem.currentZ >= zeLimit) {
        // Заканчиваем если набрали лимит и кончились курсы с первым приоритетом
        // personalNumber == '56904331' && console.log(`sItem.currentZ ${sItem.currentZ} >= zeLimit ${zeLimit}`);
        break;
      }
      const mupId = admissionIdToMupId[admission.admissionId];
      const mupItem = mupIdToMupItem[mupId];
      const mupZe = mupData.data[mupId].ze;
      if (mupItem.count < mupItem.limit) {
        if (mupIdsWithTestResultRequired.has(mupId) && !admission.testResult) {
          continue; // testResult required but not present, skip mup
        }
        if (sItem.currentZ + mupZe > zeLimit) {
          continue; // Если приоритет > 1 не превышать лимит
        }

        sItem.selectedAdmissionIds.push(admissionId);
        sItem.currentZ += mupZe;
        mupItem.count++;
      } else {
      }
    }
  }
}

export function addRandomMupsForStudentIfNeeded(
  personalNumbersOfActiveStudentsSortedByRating: string[],
  personalNumberToStudentItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  },
  mupIdToMupItem: { [key: string]: IMupDistributionItem },
  competitionGroupIdToZELimit: { [key: number]: number },
  admissionIdToMupId: { [key: number]: string },
  mupData: IMupData,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
) {
  console.log("addRandomMupsForStudentIfNeeded");
  console.log("mupIdToMupItem");
  console.log(mupIdToMupItem);
  for (const personalNumber of personalNumbersOfActiveStudentsSortedByRating) {
    const sItem = personalNumberToStudentItem[personalNumber];
    const zeLimit = competitionGroupIdToZELimit[sItem.competitionGroupId];

    if (sItem.currentZ >= zeLimit) {
      continue;
    }

    // Добавить любой МУП чтобы не превысить ZE
    for (const mupId in mupIdToMupItem) {
      const mupZe = mupData.data[mupId].ze;
      const mupItem = mupIdToMupItem[mupId];
      if (mupItem.count < mupItem.limit && sItem.currentZ + mupZe <= zeLimit) {
        // find admission
        let mupIsSelected = false;
        for (const aId of sItem.selectedAdmissionIds) {
          if (admissionIdToMupId[aId] === mupId) {
            mupIsSelected = true;
          }
        }
        if (mupIsSelected) {
          console.log(`MupID is selected: ${mupId}`);
          continue;
        }

        const mupIdToAdmission =
          competitionGroupIdToMupAdmissions[sItem.competitionGroupId];
        if (!mupIdToAdmission.hasOwnProperty(mupId)) {
          continue;
        }

        const admissionId = mupIdToAdmission[mupId].admissionsId;

        mupItem.count++;
        sItem.currentZ += mupZe;
        sItem.selectedAdmissionIds.push(admissionId);
      }
    }
  }
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
        mIdToAdmission[mupId].admissionsId
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

export interface IStudentMupsData {
  studentPersonalNumberToSelectedAdmissionIds: { [key: string]: number[] }; // personalNumber -> admissionIds
  admissionIdToMupName: { [key: number]: string }; // admissionId -> mupName
}

export function createIStudentMupsData(
  newPersonalNumberToStudentItems: {
    [key: string]: IStudentAdmissionDistributionItem;
  },
  studentData: IStudentData,
  mupData: IMupData,
  admissionIdToMupId: { [key: number]: string }
): IStudentMupsData {
  const result: IStudentMupsData = {
    studentPersonalNumberToSelectedAdmissionIds: {},
    admissionIdToMupName: {},
  };
  const admissionIds = new Set<number>();
  for (const personalNumber in newPersonalNumberToStudentItems) {
    const student = studentData.data[personalNumber];
    if (student.status === "Активный" && student.rating !== null) {
      result.studentPersonalNumberToSelectedAdmissionIds[personalNumber] =
        newPersonalNumberToStudentItems[personalNumber].selectedAdmissionIds;
    }
  }

  for (const admissionId of Array.from(admissionIds)) {
    const mupId = admissionIdToMupId[admissionId];
    result.admissionIdToMupName[admissionId] = mupData.data[mupId].name;
  }
  return result;
}

//
export function prepareStudentAndMupItems(
  competitionGroupIds: number[],
  mupData: IMupData,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo,
  admissionIdToMupId: { [key: number]: string },
  studentPersonalNumberToAdmissionIds?: { [key: string]: number[] }
): {
  personalNumberToStudentItems: {
    [key: string]: IStudentAdmissionDistributionItem;
  };
  mupIdToMupItems: {
    [key: string]: IMupDistributionItem;
  };
} {
  console.log("prepareStudentAndMupItems");
  console.log(studentPersonalNumberToAdmissionIds);
  const personalNumberToStudentItems = createPersonalNumberToStudentItem(
    competitionGroupIds,
    competitionGroupIdToMupAdmissions,
    admissionInfo
  );
  if (studentPersonalNumberToAdmissionIds) {
    for (const pn in personalNumberToStudentItems) {
      if (studentPersonalNumberToAdmissionIds.hasOwnProperty(pn)) {
        personalNumberToStudentItems[pn].selectedAdmissionIds =
          studentPersonalNumberToAdmissionIds[pn];
      }
    }
  }
  for (const pn in personalNumberToStudentItems) {
    personalNumberToStudentItems[pn].currentZ = calcZE(
      personalNumberToStudentItems[pn].selectedAdmissionIds,
      mupData,
      admissionIdToMupId
    );
  }
  const mupIdToMupItems = createMupIdToMupItemByStudentItems(
    personalNumberToStudentItems,
    competitionGroupIds,
    competitionGroupIdToMupAdmissions,
    admissionIdToMupId
  );

  return {
    personalNumberToStudentItems,
    mupIdToMupItems,
  };
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
    res.initStatus = admission.status;
    res.priority = admission.priority;
  }

  const mupId = admissionIdToMupId[admissionId];
  res.name = mupData.data[mupId].name;

  return res;
}

export function parseStudentAdmissionsFromText(
  text: string
): IStudentMupsData | null {
  let obj = null;
  try {
    obj = JSON.parse(text);
  } catch (err) {
    return null;
  }

  if (
    !obj.hasOwnProperty("studentPersonalNumberToSelectedAdmissionIds") ||
    !obj.hasOwnProperty("admissionIdToMupName")
  ) {
    return null;
  }
  obj = obj as IStudentMupsData;
  for (const pn in obj.studentPersonalNumberToSelectedAdmissionIds) {
    const admissionIds = obj.studentPersonalNumberToSelectedAdmissionIds[pn];
    if (!Array.isArray(admissionIds)) {
      return null;
    }
    for (const aId of admissionIds) {
      if (!Number.isFinite(aId)) {
        return null;
      }
    }
  }

  for (const aId in obj.admissionIdToMupName) {
    const mupName = obj.admissionIdToMupName[aId];
    if (!mupName) return null;
  }
  return obj;
}

export function validateStudentAdmissions(
  studentMupsData: IStudentMupsData,
  studentData: IStudentData,
  admissionIdToMupId: { [key: number]: string }
): { success: boolean; messages: string[] } {
  const notDeterminedPersonalNumbers: string[] = [];
  const notDeterminedAdmissionIds = new Set<number>();
  const personalNumbersWithDuplicateAdmissionIds: string[] = [];
  for (const pn in studentMupsData.studentPersonalNumberToSelectedAdmissionIds) {
    if (!studentData.data.hasOwnProperty(pn)) {
      notDeterminedPersonalNumbers.push(pn);
    }
    const admissionIds =
      studentMupsData.studentPersonalNumberToSelectedAdmissionIds[pn];
    const admissionIdsSet = new Set<number>(admissionIds);
    if (admissionIdsSet.size !== admissionIds.length) {
      personalNumbersWithDuplicateAdmissionIds.push(pn);
    }
    for (const admissionId of admissionIds) {
      if (!admissionIdToMupId.hasOwnProperty(admissionId)) {
        notDeterminedAdmissionIds.add(admissionId);
      }
    }
  }
  const messages: string[] = [];
  if (notDeterminedPersonalNumbers.length > 0) {
    const pnStr = notDeterminedPersonalNumbers.join(", ");
    messages.push(`Следующие личные номера студентов не распознаны: ${pnStr}`);
  }
  if (notDeterminedAdmissionIds.size > 0) {
    const aStr = Array.from(notDeterminedAdmissionIds).join(", ");
    messages.push(`Следующие идентификаторы зачислений не распознаны: ${aStr}`);
  }
  if (personalNumbersWithDuplicateAdmissionIds.length > 0) {
    const pnStr = personalNumbersWithDuplicateAdmissionIds.join(", ");
    messages.push(
      `Следующие личные номера студентов имеют повторяющиеся идентификаторы зачислений: ${pnStr}`
    );
  }

  return { success: messages.length === 0, messages: messages };
}
