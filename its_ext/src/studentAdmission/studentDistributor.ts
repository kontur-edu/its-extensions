// CG -> AdmissionMeta[]  // mupName, admissionId
// admissionMeta -> StudentWithAdmision[] (=> students, => admissionInfo)

import {
  AdmissionInfo,
  CompetitionGroupIdToMupAdmissions,
  IMup,
  IMupData,
  IStudent,
  IStudentData,
  MupIdToAdmission,
} from "../common/types";

function compareByRating(lhs: IStudent, rhs: IStudent) {
  const r1 = lhs.rating ?? -1;
  const r2 = rhs.rating ?? -1;
  return r2 - r1;
}

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
        const studentItem = personalNumberToStudentItem[personalNumber];
        const admission = personalNumberToAdmission[personalNumber];

        if (admission?.priority || admission?.status === 1) {
          studentItem.admissionIds.push(admissionId);
        }
        if (admission?.status === 1) {
          // status === 1 то есть уже зачислен на курс
          // studentItem.currentZE += mupData.data[mId].ze;
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

// export function createMupIdToMupItemByStudentItems(
//   pnToStudentItem: { [key: string]: IStudentAdmissionDistributionItem },
//   competitionGroupIds: number[],
//   competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
//   admissionIdToMupId: { [key: number]: string }
// ): { [key: string]: IMupDistributionItem } {
//   const mupIdToMupItem: { [key: string]: IMupDistributionItem } = {};
//   for (const competitionId of competitionGroupIds) {
//     const mupIdToAdmission = competitionGroupIdToMupAdmissions[competitionId];
//     for (const mupId in mupIdToAdmission) {
//       const admission = mupIdToAdmission[mupId];

//       if (!mupIdToMupItem.hasOwnProperty(mupId)) {
//         mupIdToMupItem[mupId] = {
//           limit: admission.limit, // expect limits are checked in
//           count: 0,
//           valid: true,
//         };
//       } else {
//         if (mupIdToMupItem[mupId].limit !== admission.limit) {
//           mupIdToMupItem[mupId].valid = false;
//         }
//       }
//     }
//   }

//   for (const pn in pnToStudentItem) {
//     const sItem = pnToStudentItem[pn];
//     for (const aId of sItem.selectedAdmissionIds) {
//       const mupId = admissionIdToMupId[aId];
//       if (mupIdToMupItem.hasOwnProperty(mupId)) {
//         mupIdToMupItem[mupId].count++;
//       }
//     }
//   }

//   return mupIdToMupItem;
// }

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
  // admissionId: number;
  mupId: string;
  testPassed: boolean;
  priority: number;
  admitted: boolean;
}

export interface IMupAlgoInfo {
  // admissionId: number;
  ze: number;
  // limit: number;
}

export interface IStudentDistributionAlgoInfo {
  personalNumber: string;
  rating: number;
  competitionGroupId: number;
  admissions: IStudentDistributionAdmissionAlgoInfo[];
  mupIdsAdmittedEarlier: Set<string>; // NOTE: mupIds
}

function createMupNameToMupId(mupData: IMupData) {
  const res: {[key: string]: string} = {};
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
  console.log("createStudentDistributionAlgoInfos");
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
    mupNamesAdmittedEarlier.forEach(mupName => {
      if (!mupNameToMupId.hasOwnProperty(mupName)) {
        console.warn(`mupName: ${mupName} not found in mupNameToMupId`);
        return;
      }
      const mupId = mupNameToMupId[mupName];
      mupIdsAdmittedEarlier.add(mupId);
    });
    // for (const )
    const studentDistributionAlgoInfo: IStudentDistributionAlgoInfo = {
      personalNumber: student.personalNumber,
      rating: student.rating,
      competitionGroupId: student.competitionGroupId,
      admissions: [],
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
      if (admission && admission.priority !== null) {
        const studentDistributionAdmissionAlgoInfo: IStudentDistributionAdmissionAlgoInfo =
          {
            // admissionId: Number(admissionId),
            mupId: mupId,
            testPassed:
              admission.testResult !== null && admission.testResult > 0,
            priority: admission.priority,
            admitted: admission.status === 1,
          };
        studentDistributionAlgoInfo.admissions.push(
          studentDistributionAdmissionAlgoInfo
        );
      }
    }
    result.push(studentDistributionAlgoInfo);
  }

  return result;
}

export function createMupIdToMupAlgoInfo(
  mupIds: string[] | Set<string>,
  // mupIdToAdmissionMeta: MupIdToAdmission,
  mupData: IMupData
): { [key: string]: IMupAlgoInfo } {
  const result: { [key: string]: IMupAlgoInfo } = {};
  mupIds.forEach((mupId) => {
    const mup = mupData.data[mupId];
    const mupAlgoInfo: IMupAlgoInfo = {
      ze: mup.ze,
      // limit: admissionMeta.limit, // FIXME: limit is the same for both groups
    };
    result[mupId] = mupAlgoInfo;
  });

  return result;
}

interface IMupAlgoItem {
  count: number;
}

interface IStudentAlgoItem {
  ze: number;
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
  console.log("createStudentDistribution");
  const mupIdToMupAlgoItem: {
    [key: string]: IMupAlgoItem;
  } = {};
  for (const mupId in mupIdToMupAlgoInfo) {
    mupIdToMupAlgoItem[mupId] = {
      count: 0,
    };
  }
  const personalNumberToStudentAlgoItem: { [key: string]: IStudentAlgoItem } =
    {};
  // FILL initial mup and student algo items
  for (const studentAlgInfo of studentDistributionAlgoInfos) {
    personalNumberToStudentAlgoItem[studentAlgInfo.personalNumber] = {
      ze: 0,
    };
    // const mupIdToAdmissionMeta = competitionGroupIdToMupAdmissions[studentAlgInfo.competitionGroupId];
    // const mup
    for (const admissionAlgInfo of studentAlgInfo.admissions) {
      if (admissionAlgInfo.admitted) {
        const mupInfo = mupIdToMupAlgoInfo[admissionAlgInfo.mupId];
        personalNumberToStudentAlgoItem[studentAlgInfo.personalNumber].ze +=
          mupInfo.ze;
        mupIdToMupAlgoItem[admissionAlgInfo.mupId].count++;
      }
    }
  }

  // distribute using priorities
  const result: IPersonalNumberToAdmissionIds = {};
  const studentDistributionAlgoInfosSortedByRating =
    studentDistributionAlgoInfos.sort((s) => s.rating);
  for (const studentAlgInfo of studentDistributionAlgoInfosSortedByRating) {
    result[studentAlgInfo.personalNumber] = new Set<number>();
    const studentItem =
      personalNumberToStudentAlgoItem[studentAlgInfo.personalNumber];
    const mupIdToAdmissionMeta =
      competitionGroupIdToMupAdmissions[studentAlgInfo.competitionGroupId];
    for (const admissionAlgInfo of studentAlgInfo.admissions) {
      const admissionMeta = mupIdToAdmissionMeta[admissionAlgInfo.mupId];
      // admissionMeta.admissionId;
      const zeLimit =
        competitionGroupIdToZELimit[studentAlgInfo.competitionGroupId];
      if (studentItem.ze >= zeLimit) {
        break;
      }
      if (admissionAlgInfo.admitted) {
        result[studentAlgInfo.personalNumber].add(admissionMeta.admissionId);
        continue;
      }
      const mupItem = mupIdToMupAlgoItem[admissionAlgInfo.mupId];
      const mupInfo = mupIdToMupAlgoInfo[admissionAlgInfo.mupId];
      if (mupItem.count > admissionMeta.limit) {
        continue;
      }

      personalNumberToStudentAlgoItem[studentAlgInfo.personalNumber].ze +=
        mupInfo.ze;
      mupIdToMupAlgoItem[admissionAlgInfo.mupId].count++;
    }
  }

  // add random mups if needed
  for (const studentAlgInfo of studentDistributionAlgoInfosSortedByRating) {
    const studentItem =
      personalNumberToStudentAlgoItem[studentAlgInfo.personalNumber];
    const zeLimit =
      competitionGroupIdToZELimit[studentAlgInfo.competitionGroupId];
    for (const mupId in mupIdToMupAlgoInfo) {
      if (studentItem.ze >= zeLimit) {
        break;
      }
      if (studentAlgInfo.mupIdsAdmittedEarlier.has(mupId)) {
        continue;
      }

      const mupIdToAdmission =
        competitionGroupIdToMupAdmissions[studentAlgInfo.competitionGroupId];
      if (!mupIdToAdmission.hasOwnProperty(mupId)) {
        // console.log("no admission");
        continue;
      }

      const admissionMeta = mupIdToAdmission[mupId];
      // const admissionId = mupIdToAdmission[mupId].admissionId;

      if (
        result[studentAlgInfo.personalNumber].has(admissionMeta.admissionId)
      ) {
        continue;
      }

      const mupInfo = mupIdToMupAlgoInfo[mupId];
      const mupItem = mupIdToMupAlgoItem[mupId];

      if (mupItem.count < admissionMeta.limit) {
        result[studentAlgInfo.personalNumber].add(admissionMeta.admissionId);
        personalNumberToStudentAlgoItem[studentAlgInfo.personalNumber].ze +=
          mupInfo.ze;
        mupItem.count++;
      }
    }
  }

  return result;
}

// NOTE: Приоритет задается порядком списка admissions у student item
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
  for (const personalNumber of personalNumbersSortedByRating) {
    const sItem = personalNumberToStudentItem[personalNumber];
    const zeLimit = competitionGroupIdToZELimit[sItem.competitionGroupId];
    for (const admissionId of sItem.admissionIds) {
      if (sItem.currentZE >= zeLimit) {
        // Заканчиваем если набрали лимит и кончились курсы с первым приоритетом
        // personalNumber == '56904331' && console.log(`sItem.currentZE ${sItem.currentZE} >= zeLimit ${zeLimit}`);
        break;
      }
      if (sItem.selectedAdmissionIds.includes(admissionId)) {
        continue; // already admitted
      }

      const admission = admissionInfo[admissionId][personalNumber];
      const mupId = admissionIdToMupId[admissionId];
      const mupItem = mupIdToMupItem[mupId];
      const mupZe = mupData.data[mupId].ze;
      if (mupItem.count < mupItem.limit) {
        if (mupIdsWithTestResultRequired.has(mupId) && !admission?.testResult) {
          // NOTE: admission can be null
          continue; // testResult required but not present, skip mup
        }
        if (sItem.currentZE + mupZe > zeLimit) {
          continue; // Если приоритет > 1 не превышать лимит
        }

        sItem.selectedAdmissionIds.push(admissionId);
        sItem.currentZE += mupZe;
        mupItem.count++;
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
  mupIdsWithTestResultRequired: Set<string>,
  competitionGroupIdToZELimit: { [key: number]: number },
  personalNumberToAdmittedMupNames: { [key: string]: Set<string> },
  admissionIdToMupId: { [key: number]: string },
  mupData: IMupData,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo
) {
  // console.log("personalNumbersOfActiveStudentsSortedByRating");
  // console.log(personalNumbersOfActiveStudentsSortedByRating);
  for (const personalNumber of personalNumbersOfActiveStudentsSortedByRating) {
    const sItem = personalNumberToStudentItem[personalNumber];
    const zeLimit = competitionGroupIdToZELimit[sItem.competitionGroupId];

    if (sItem.currentZE >= zeLimit) {
      // console.log("ze overflow");
      continue;
    }
    // Добавить любой МУП чтобы не превысить ZE
    for (const mupId in mupIdToMupItem) {
      const mup = mupData.data[mupId];
      const mupZe = mup.ze;
      const mupItem = mupIdToMupItem[mupId];
      if (mupItem.count < mupItem.limit && sItem.currentZE + mupZe <= zeLimit) {
        // find admission
        let alreadySelected = false;
        for (const aId of sItem.selectedAdmissionIds) {
          if (admissionIdToMupId[aId] === mupId) {
            alreadySelected = true;
            break;
          }
        }
        if (alreadySelected) {
          // console.log("alreadySelected");
          continue;
        }

        if (personalNumberToAdmittedMupNames.hasOwnProperty(personalNumber)) {
          if (personalNumberToAdmittedMupNames[personalNumber].has(mup.name)) {
            // console.log("already admitted");
            continue;
          }
        }

        const mupIdToAdmission =
          competitionGroupIdToMupAdmissions[sItem.competitionGroupId];
        if (!mupIdToAdmission.hasOwnProperty(mupId)) {
          // console.log("no admission");
          continue;
        }

        const admissionId = mupIdToAdmission[mupId].admissionId;

        if (mupIdsWithTestResultRequired.has(mupId)) {
          const admission = admissionInfo[admissionId][personalNumber];
          if (!admission || !admission.testResult) {
            // console.log("no test result");
            continue;
          }
        }

        mupItem.count++;
        sItem.currentZE += mupZe;
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
