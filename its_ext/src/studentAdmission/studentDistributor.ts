// CG -> AdmissionMeta[]  // mupName, admissionId
// admissionMeta -> StudentWithAdmision[] (=> students, => admissionInfo)

import {
  AdmissionInfo,
  CompetitionGroupIdToMupAdmissions,
  IAdmissionMeta,
  IMupData,
  IStudent,
  IStudentAdmission,
  IStudentData,
} from "../common/types";

// admissionId -> personalNumber[]
// make set of personalNumbers ()

// sort by Rating

// find Zneeded
// create sToStudentAdmissions = student -> studentAdmission[]
// create studentToZ = student -> Znumber = 0;
// create mupToAdmissionInfo =  mupId => (limit, studentIds);
// for student in sorted:
// 	studentAdmission = sToStudentAdmissions[student]
// 	studentAdmissionSorted = sortByPriority(studentAdmission) // 1 1 1 1 2 3 4...
// 	for sa in studentAdmissionSorted:
// 		mupAdmissionInfo = mupToAdmissionInfo[sa.mupId]
// 		if (mupAdmissionInfo.studentsIds.count < mupAdmissionInfo.limit)
// 			mupToAdmissionInfo.studentIds.push(student.personalNumber)
// 			studentToZ[student] += mup.z
// 		if (studentToZ >= Zneeded && sa.priority > 1)
// 			break

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
}

export interface IMupDistributionItem {
  limit: number;
  count: number;
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
  admissionIdToMupId: {[key: number]: string}
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
  admissionInfo: AdmissionInfo,
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
      const lhsStudentAdmission = admissionInfo[lhs][pn];
      const rhsStudentAdmission = admissionInfo[rhs][pn];
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
    const mupIdToAdmission =
      competitionGroupIdToMupAdmissions[competitionId];
    for (const mupId in mupIdToAdmission) {
      const admission = mupIdToAdmission[mupId];
  
      if (!mupIdToMupItem.hasOwnProperty(mupId)) {
        mupIdToMupItem[mupId] = {
          limit: admission.limit, // expect limits are checked in
          count: 0,
        };
      } else {
        if (mupIdToMupItem[mupId].limit !== admission.limit) {
          throw new Error(`Mup limit not equal (${mupIdToMupItem[mupId].limit} ${admission.limit})`);
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


function getMupIdsWithRequiredTaskResult(
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
      for (const personalNumber in personalNumberToAdmission) {
        const studentAdmission = personalNumberToAdmission[personalNumber];
        if (studentAdmission.testResult) {
          result.add(admission.mupId);
          break;
        }
      }
    }
  }
  return result;
}

export function fillDistributionByStudentRatingAndAdmissionPriority(
  personalNumberToStudentItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  },
  mupIdToMupItem: { [key: string]: IMupDistributionItem },
  mupIdsWithTestResultRequired: Set<string>,
  zeLimit: number,
  mupData: IMupData,
  personalNumbersSortedByRating: string[],
  admissionIdToMupId: { [key: number]: string },
  admissionInfo: AdmissionInfo
) {
  for (const personalNumber of personalNumbersSortedByRating) {
    const sItem = personalNumberToStudentItem[personalNumber];

    for (let i = 0; i < sItem.admissionIds.length; i++) {
      const admissionId = sItem.admissionIds[i];
      const admission = admissionInfo[admissionId][personalNumber];
      if (admission.status === 1) continue; // already admitted
      if (sItem.currentZ > zeLimit) {
        // Заканчиваем если набрали лимит и кончились курсы с первым приоритетом
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
  admissionIdToMupId: { [key: number]: string },
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
    result.admissionIdToMupName[admissionId] =
      mupData.data[mupId].name;
  }
  return result;
};

// 
export function prepareStudentAndMupItems(
  competitionGroupIds: number[],
  mupData: IMupData,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo,
  admissionIdToMupId: { [key: number]: string },
  studentPersonalNumberToAdmissionIds?: { [key: string]: number[] },
): {
  personalNumberToStudentItems: {
      [key: string]: IStudentAdmissionDistributionItem;
    },
  mupIdToMupItems: {
    [key: string]: IMupDistributionItem;
  }
} {
  console.log("prepareStudentAndMupItems");
  console.log(studentPersonalNumberToAdmissionIds);
  const personalNumberToStudentItems = createPersonalNumberToStudentItem(
    competitionGroupIds,
    competitionGroupIdToMupAdmissions,
    admissionInfo,
  );
  if (studentPersonalNumberToAdmissionIds) {
    for (const pn in personalNumberToStudentItems) {
      if (studentPersonalNumberToAdmissionIds.hasOwnProperty(pn)) {
        personalNumberToStudentItems[pn].selectedAdmissionIds = studentPersonalNumberToAdmissionIds[pn];
      }
    }
  }
  for (const pn in personalNumberToStudentItems) {
    personalNumberToStudentItems[pn].currentZ = calcZE(
      personalNumberToStudentItems[pn].selectedAdmissionIds,
      mupData,
      admissionIdToMupId,
    );
  }
  const mupIdToMupItems = createMupIdToMupItemByStudentItems(
    personalNumberToStudentItems,
    competitionGroupIds,
    competitionGroupIdToMupAdmissions,
    admissionIdToMupId
  )

  return {
    personalNumberToStudentItems,
    mupIdToMupItems
  };
}


export interface IAdmissionRecord {
  initStatus: number,
  priority: number | null;
  name: string;
}

export function createAdmissionRecord(
  admissionId: number,
  personalNumber: string,
  admissionInfo: AdmissionInfo,
  mupData: IMupData,
  admissionIdToMupId: {[key: number]: string}
) {
  const res: IAdmissionRecord = {
    initStatus: 0,
    priority: null,
    name: '',
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
  for (const pn in studentMupsData.studentPersonalNumberToSelectedAdmissionIds) {
    if (!studentData.data.hasOwnProperty(pn)) {
      notDeterminedPersonalNumbers.push(pn);
    }
    const admissionIds =
      studentMupsData.studentPersonalNumberToSelectedAdmissionIds[pn];
    for (const admissionId of admissionIds) {
      if (!admissionIdToMupId.hasOwnProperty(admissionId)) {
        notDeterminedAdmissionIds.add(admissionId);
      }
    }
  }
  const messages: string[] = [];
  if (notDeterminedPersonalNumbers.length > 0) {
    const pnStr = notDeterminedPersonalNumbers.join(", ");
    messages.push(`Personal Numbers not determined: ${pnStr}`);
  }
  if (notDeterminedAdmissionIds.size > 0) {
    const aStr = Array.from(notDeterminedAdmissionIds).join(", ");
    messages.push(`Admission Ids not determined: ${aStr}`);
  }

  return { success: messages.length === 0, messages: messages };
}
