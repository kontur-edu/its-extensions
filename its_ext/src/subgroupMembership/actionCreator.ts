import { ITSAction } from "../common/actions";
import {
  IStudentData,
  ISubgoupDiffInfo,
  MupToLoadToSubgroupMembership,
  IStudentSubgroupMembership,
  ICompetitionGroupToSubgroupMetas,
} from "../common/types";
import { UpdateMembershipAction } from "./actions";

// createSubgroupDiffInfo
function generateUpdateMembershipActions(
  subgoupDiffInfo: ISubgoupDiffInfo,
  mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
  subgroupIdToStudentSubgroupMembership: {
    [key: number]: IStudentSubgroupMembership[];
  },
  studentData: IStudentData
): ITSAction[] {
  const actions: ITSAction[] = [];

  const newCompetitionGroupToIncludedStudentIds: { [key: number]: string[] } =
    {};
  for (const mupName in mupToLoadToSubgroupMembership) {
    const loadToMemberships = mupToLoadToSubgroupMembership[mupName];
    for (const load in loadToMemberships) {
      const membershipPerSubgroup = loadToMemberships[load];
      for (let i = 0; i < membershipPerSubgroup.length; i++) {
        const personalNumbers = membershipPerSubgroup[i];
        const load_number = `${load}_${i}`;

        for (const pn of personalNumbers) {
          const student = studentData.data[pn];

          const cgId = student.competitionGroupId;
          const subgroupId =
            subgoupDiffInfo.subgroupDiffs[mupName][cgId][load_number];
          if (
            !newCompetitionGroupToIncludedStudentIds.hasOwnProperty(subgroupId)
          ) {
            newCompetitionGroupToIncludedStudentIds[subgroupId] = [];
          }
          newCompetitionGroupToIncludedStudentIds[subgroupId].push(student.id);
        }
      }
    }
  }

  for (const subgroupIdStr in subgroupIdToStudentSubgroupMembership) {
    const subgroupId = Number(subgroupIdStr);
    if (!newCompetitionGroupToIncludedStudentIds.hasOwnProperty(subgroupId)) {
      continue;
    }
    const membership = subgroupIdToStudentSubgroupMembership[subgroupId];
    const initStudentIds: string[] = membership
      .filter((m) => m.included)
      .map((m) => m.studentId);

    const newStudentIds = newCompetitionGroupToIncludedStudentIds[subgroupId];
    const initStudentIdSet = new Set<string>(initStudentIds);
    const newStudentIdSet = new Set<string>(newStudentIds);
    let toExclude = new Set(
      initStudentIds.filter((sId) => !newStudentIdSet.has(sId))
    );
    let toInclude = new Set(
      newStudentIds.filter((sId) => !initStudentIdSet.has(sId))
    );

    for (const sId of Array.from(toExclude)) {
      actions.push(new UpdateMembershipAction(sId, subgroupId, false));
    }
    for (const sId of Array.from(toInclude)) {
      actions.push(new UpdateMembershipAction(sId, subgroupId, true));
    }
  }

  return actions;
}

export function createSubgroupMembershipActions(
  subgoupDiffInfo: ISubgoupDiffInfo,
  mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
  subgroupIdToStudentSubgroupMembership: {
    [key: number]: IStudentSubgroupMembership[];
  },
  studentData: IStudentData
): ITSAction[] {
  const actions: ITSAction[] = [];

  actions.push(
    ...generateUpdateMembershipActions(
      subgoupDiffInfo,
      mupToLoadToSubgroupMembership,
      subgroupIdToStudentSubgroupMembership,
      studentData
    )
  );

  return actions;
}

function generateUpdateMembershipActionsForOneGroupPerLoadDistribution(
  competitionGroupIds: number[],
  subgroupDiffInfo: ISubgoupDiffInfo,
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas,
  subgroupIdToStudentSubgroupMembership: {
    [key: number]: IStudentSubgroupMembership[];
  }
): ITSAction[] {
  const actions: ITSAction[] = [];
  const subgroupIdsToAutoAddAllStudents: number[] = [];
  for (const competitionGroupId of competitionGroupIds) {
    for (const meta of competitionGroupToSubgroupMetas[competitionGroupId]) {
      if (meta.count === 1) {
        for (const load_number in subgroupDiffInfo.subgroupDiffs[
          meta.discipline
        ][competitionGroupId]) {
          const parts = load_number.split("_");
          if (parts[0] === meta.load) {
            const subgroupId =
              subgroupDiffInfo.subgroupDiffs[meta.discipline][
                competitionGroupId
              ][load_number];
            subgroupIdsToAutoAddAllStudents.push(subgroupId);
            break;
          }
        }
      }
    }
  }

  for (const subgroupId of subgroupIdsToAutoAddAllStudents) {
    for (const membership of subgroupIdToStudentSubgroupMembership[
      subgroupId
    ]) {
      if (!membership.included) {
        actions.push(
          new UpdateMembershipAction(membership.studentId, subgroupId, true)
        );
      }
    }
  }

  return actions;
}

export function createSubgroupMembershipActionsForOneGroupPerLoadDistribution(
  competitionGroupIds: number[],
  subgroupDiffInfo: ISubgoupDiffInfo,
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas,
  subgroupIdToStudentSubgroupMembership: {
    [key: number]: IStudentSubgroupMembership[];
  }
): ITSAction[] {
  const actions: ITSAction[] = [];

  actions.push(
    ...generateUpdateMembershipActionsForOneGroupPerLoadDistribution(
      competitionGroupIds,
      subgroupDiffInfo,
      competitionGroupToSubgroupMetas,
      subgroupIdToStudentSubgroupMembership
    )
  );

  return actions;
}
