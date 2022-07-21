// CG -> AdmissionMeta[]  // mupName, admissionId
// admissionMeta -> StudentWithAdmision[] (=> students, => admissionInfo)

import {
  AdmissionInfo,
  CompetitionGroupIdToMupAdmissions,
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

interface IStudentAdmissionDistributionItem {
  admissions: IStudentAdmission[];
  currentZ: number;
  admittedMupIds: string[];
}

interface IMupDistributionItem {
  limit: number;
  count: number;
}

export interface IDistributionResult {
  personalNumberToStudentItem: { [key: string]: IStudentAdmissionDistributionItem };
  mupIdToMupItem: { [key: string]: IMupDistributionItem };
}


function createPersonalNumberToStudentItem(
  competitionGroupIds: number[],
  mupData: IMupData,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo,
): { [key: string]: IStudentAdmissionDistributionItem } {
  const personalNumberToStudentItem: { [key: string]: IStudentAdmissionDistributionItem } = {};

  for (const competitionGroupId of competitionGroupIds) {
    const mIdToAdmission =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    for (const mId in mIdToAdmission) {
      const admissionId = mIdToAdmission[mId].admissionsId;

      const personalNumberToAdmission = admissionInfo[admissionId];
      for (const personalNumber in personalNumberToAdmission) {
        if (!personalNumberToStudentItem.hasOwnProperty(personalNumber)) {
            personalNumberToStudentItem[personalNumber] = {
                admissions: [],
                currentZ: 0,
                admittedMupIds: []
            };
        }
        const studentItem = personalNumberToStudentItem[personalNumber];

        const admission = personalNumberToAdmission[personalNumber];
        if (admission.status === 1) { // status === 1 то есть уже зачислен на курс
          studentItem.currentZ += mupData.data[admission.mupId].ze;
        } else if (admission.priority) {
          studentItem.admissions.push(
            personalNumberToAdmission[personalNumber]
          );
        }
      }
    }
  }

  return personalNumberToStudentItem;
}

function createMupIdToMupItem(
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
): { [key: string]: IMupDistributionItem } {
  const mupIdToMupItem: { [key: string]: IMupDistributionItem } = {};
  const firstMupIdToAdmission =
      competitionGroupIdToMupAdmissions[competitionGroupIds[0]];
  for (const mupId in firstMupIdToAdmission) {
    const admission = firstMupIdToAdmission[mupId];
    mupIdToMupItem[mupId] = {
      limit: admission.limit,
      count: admission.count
    };
  }
  return mupIdToMupItem;
}


function fillDistributionByStudentRatingAndAdmissionPriority(
  personalNumberToStudentItem: { [key: string]: IStudentAdmissionDistributionItem },
  mupIdToMupItem: { [key: string]: IMupDistributionItem },
  zeLimit: number,
  mupData: IMupData,
  personalNumbersSortedByRating: string[],
 ) {
  for (const personalNumber of personalNumbersSortedByRating) {
    const sItem = personalNumberToStudentItem[personalNumber];
    const admissionsSortedByPriority = sItem.admissions.sort((lhs, rhs) => {
      return lhs.priority! - rhs.priority!;
    });

    for (const admission of admissionsSortedByPriority) {
      if (admission.priority! > 1 && sItem.currentZ > zeLimit) {
        // Заканчиваем если набрали лимит и кончились курсы с первым приоритетом
        break;
      }

      const mupItem = mupIdToMupItem[admission.mupId];
      const mupZe = mupData.data[admission.mupId].ze;
      if (mupItem.count < mupItem.limit) {
        if (admission.priority! > 1 && sItem.currentZ + mupZe > zeLimit) {
          continue; // Если приоритет > 1 не превышать лимит
        }

        sItem.admittedMupIds.push(admission.mupId);
        sItem.currentZ += mupZe;
        mupItem.count++;
      }
    }
  }
}


export function distributeStudents(
  zeLimit: number,
  competitionGroupIds: number[],
  mupData: IMupData,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions,
  admissionInfo: AdmissionInfo,
  studentData: IStudentData
): IDistributionResult {
  const admissionIdFromDifferentCompetitionGroups: number[] = [];
  for (const competitionGroupId of competitionGroupIds) {
    const mIdToAdmission =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    for (const mupId in mIdToAdmission) {
      admissionIdFromDifferentCompetitionGroups.push(mIdToAdmission[mupId].admissionsId);
      break;
    }
  }

  const allPersonalNumbers = new Set<string>();
  for (const admissionId of admissionIdFromDifferentCompetitionGroups) {
    Object.keys(admissionInfo[admissionId]).forEach((pn) =>
      allPersonalNumbers.add(pn)
    );
  }

  const personalNumbersSortedByRating = Array.from(allPersonalNumbers)
    .filter((pn) => {
      const student = studentData.data[pn];
      return student.status === "Активен" && student.rating !== null;
    })
    .sort((lhs, rhs) => {
      return compareByRating(studentData.data[lhs], studentData.data[rhs]);
    });


  const personalNumberToStudentItem = createPersonalNumberToStudentItem(
    competitionGroupIds,
    mupData,
    competitionGroupIdToMupAdmissions,
    admissionInfo,
  );

  const mupIdToMupItem = createMupIdToMupItem(
    competitionGroupIds,
    competitionGroupIdToMupAdmissions,
  );

  
  for (const personalNumber of personalNumbersSortedByRating) {
    const sItem = personalNumberToStudentItem[personalNumber];
    const admissionsSortedByPriority = sItem.admissions.sort((lhs, rhs) => {
      return lhs.priority! - rhs.priority!;
    });

    for (const admission of admissionsSortedByPriority) {
      if (admission.priority! > 1 && sItem.currentZ > zeLimit) {
        // Заканчиваем если набрали лимит и кончились курсы с первым приоритетом
        break;
      }

      const mupItem = mupIdToMupItem[admission.mupId];
      const mupZe = mupData.data[admission.mupId].ze;
      if (mupItem.count < mupItem.limit) {
        if (admission.priority! > 1 && sItem.currentZ + mupZe > zeLimit) {
          continue; // Если приоритет > 1 не превышать лимит
        }

        sItem.admittedMupIds.push(admission.mupId);
        sItem.currentZ += mupZe;
        mupItem.count++;
      }
    }
  }

  fillDistributionByStudentRatingAndAdmissionPriority(
    personalNumberToStudentItem,
    mupIdToMupItem,
    zeLimit,
    mupData,
    personalNumbersSortedByRating,
  )
  return {
    personalNumberToStudentItem,
    mupIdToMupItem
  };
}
