import { CompetitionGroupIdToMupAdmissions } from "../common/types";
import {
  IMupAlgoInfo,
  IPersonalNumberToAdmissionIds,
  IStudentDistributionAdmissionAlgoInfo,
  IStudentDistributionAlgoInfo,
} from "./studentDistributor";

interface IMupAlgoState {
  count: number;
}

interface IStudentAlgoState {
  ze: number;
}

function compareAdmissionAlgoInfos(
  lhs: IStudentDistributionAdmissionAlgoInfo,
  rhs: IStudentDistributionAdmissionAlgoInfo
) {
  const lhsPriority = lhs.priority ?? 1000;
  const rhsPriority = rhs.priority ?? 1000;
  return lhsPriority - rhsPriority;
}

export class StudentDistributor {
  private result: IPersonalNumberToAdmissionIds = {};
  private mupIdToMupAlgoState: { [key: string]: IMupAlgoState } = {};
  private personalNumberToStudentAlgoState: {
    [key: string]: IStudentAlgoState;
  } = {};

  constructor(
    public studentDistributionAlgoInfos: IStudentDistributionAlgoInfo[],
    public mupIdToMupAlgoInfo: { [key: string]: IMupAlgoInfo },
    public competitionGroupIdToZELimit: { [key: number]: number },
    public competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
  ) {}

  createStudentDistribution() {
    this.setUpInitAlgoItemsAndResult();
    const studentDistributionAlgoInfosSortedByRating =
      this.studentDistributionAlgoInfos.sort((lhs, rhs) => {
        return rhs.rating - lhs.rating;
      });
    this.distributeStudentsByPriority(
      studentDistributionAlgoInfosSortedByRating
    );
    this.addRandomMupsIfNeeded(studentDistributionAlgoInfosSortedByRating);
    return this.result;
  }

  private setUpInitAlgoItemsAndResult() {
    this.result = {};
    this.mupIdToMupAlgoState = {};
    this.personalNumberToStudentAlgoState = {};

    for (const mupId in this.mupIdToMupAlgoInfo) {
      this.mupIdToMupAlgoState[mupId] = {
        count: 0,
      };
    }
    // FILL initial mup and student algo items
    for (const studentAlgInfo of this.studentDistributionAlgoInfos) {
      this.result[studentAlgInfo.personalNumber] = new Set<number>();
      this.personalNumberToStudentAlgoState[studentAlgInfo.personalNumber] = {
        ze: 0,
      };
      const mupIdToAdmissionMeta =
        this.competitionGroupIdToMupAdmissions[
          studentAlgInfo.competitionGroupId
        ];
      // const mup
      for (const admissionAlgInfo of studentAlgInfo.admissionsWithPriorityOrTestResult) {
        if (admissionAlgInfo.admitted) {
          const mupInfo = this.mupIdToMupAlgoInfo[admissionAlgInfo.mupId];
          this.personalNumberToStudentAlgoState[
            studentAlgInfo.personalNumber
          ].ze += mupInfo.ze;
          this.mupIdToMupAlgoState[admissionAlgInfo.mupId].count++;
          const admissionMeta = mupIdToAdmissionMeta[admissionAlgInfo.mupId];
          this.result[studentAlgInfo.personalNumber].add(
            admissionMeta.admissionId
          );
        }
      }
    }
  }

  private distributeStudentsByPriority(
    studentDistributionAlgoInfosSortedByRating: IStudentDistributionAlgoInfo[]
  ) {
    for (const studentAlgInfo of studentDistributionAlgoInfosSortedByRating) {
      const studentState =
        this.personalNumberToStudentAlgoState[studentAlgInfo.personalNumber];
      const mupIdToAdmissionMeta =
        this.competitionGroupIdToMupAdmissions[
          studentAlgInfo.competitionGroupId
        ];
      const admissionsSortedByPriority =
        studentAlgInfo.admissionsWithPriorityOrTestResult.sort(
          compareAdmissionAlgoInfos
        );
      for (const admissionAlgInfo of admissionsSortedByPriority) {
        const admissionMeta = mupIdToAdmissionMeta[admissionAlgInfo.mupId];
        const zeLimit =
          this.competitionGroupIdToZELimit[studentAlgInfo.competitionGroupId];
        if (studentState.ze >= zeLimit) {
          break;
        }
        if (admissionAlgInfo.admitted) {
          this.result[studentAlgInfo.personalNumber].add(
            admissionMeta.admissionId
          );
          continue;
        }
        const mupState = this.mupIdToMupAlgoState[admissionAlgInfo.mupId];
        const mupInfo = this.mupIdToMupAlgoInfo[admissionAlgInfo.mupId];
        if (mupState.count >= admissionMeta.limit) {
          continue;
        }
        if (mupInfo.testResultRequired && !admissionAlgInfo.testPassed) {
          continue;
        }

        if (studentState.ze + mupInfo.ze > zeLimit) {
          continue;
        }
        this.result[studentAlgInfo.personalNumber].add(
          admissionMeta.admissionId
        );
        studentState.ze += mupInfo.ze;
        this.mupIdToMupAlgoState[admissionAlgInfo.mupId].count++;
      }
    }
  }

  private addRandomMupsIfNeeded(
    studentDistributionAlgoInfosSortedByRating: IStudentDistributionAlgoInfo[]
  ) {
    for (const studentAlgInfo of studentDistributionAlgoInfosSortedByRating) {
      const studentState =
        this.personalNumberToStudentAlgoState[studentAlgInfo.personalNumber];
      const zeLimit =
        this.competitionGroupIdToZELimit[studentAlgInfo.competitionGroupId];
      const mupIdToAdmissionAlgoInfo: {
        [key: string]: IStudentDistributionAdmissionAlgoInfo;
      } = {};
      for (const admissionAlgoInfo of studentAlgInfo.admissionsWithPriorityOrTestResult) {
        mupIdToAdmissionAlgoInfo[admissionAlgoInfo.mupId] = admissionAlgoInfo;
      }
      for (const mupId in this.mupIdToMupAlgoInfo) {
        if (studentState.ze >= zeLimit) {
          break;
        }
        if (studentAlgInfo.mupIdsAdmittedEarlier.has(mupId)) {
          continue;
        }

        const mupIdToAdmission =
          this.competitionGroupIdToMupAdmissions[
            studentAlgInfo.competitionGroupId
          ];
        if (!mupIdToAdmission.hasOwnProperty(mupId)) {
          continue;
        }

        const admissionMeta = mupIdToAdmission[mupId];

        if (
          this.result[studentAlgInfo.personalNumber].has(
            admissionMeta.admissionId
          )
        ) {
          continue;
        }

        const mupInfo = this.mupIdToMupAlgoInfo[mupId];
        const mupState = this.mupIdToMupAlgoState[mupId];

        if (mupInfo.testResultRequired) {
          if (
            !mupIdToAdmissionAlgoInfo.hasOwnProperty(mupId) ||
            !mupIdToAdmissionAlgoInfo[mupId].testPassed
          ) {
            continue;
          }
        }

        if (mupState.count >= admissionMeta.limit) {
          continue;
        }

        if (studentState.ze + mupInfo.ze > zeLimit) {
          continue;
        }
        this.result[studentAlgInfo.personalNumber].add(
          admissionMeta.admissionId
        );
        studentState.ze += mupInfo.ze;
        mupState.count++;
      }
    }
  }
}
