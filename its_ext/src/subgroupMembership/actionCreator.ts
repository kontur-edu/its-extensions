import { ITSAction } from "../common/actions";
import {
  IStudentData,
  ISubgoupDiffInfo,
  MupToLoadToSubgroupMembership,
} from "../common/types";
import { UpdateMembershipAction } from "./actions";

// createSubgroupDiffInfo
export function generateUpdateMembershipActions(
  mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
  subgoupDiffInfo: ISubgoupDiffInfo,
  subgroupIdToIncludedStudentIds: { [key: number]: string[] }, // subgroupId -> studentId[]
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

  for (const subgroupIdStr in subgroupIdToIncludedStudentIds) {
    const subgroupId = Number(subgroupIdStr);
    if (!newCompetitionGroupToIncludedStudentIds.hasOwnProperty(subgroupId)) {
      continue;
    }
    const initStudentIds = subgroupIdToIncludedStudentIds[subgroupId];
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

export function createTaskResultActions(
  mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
  subgoupDiffInfo: ISubgoupDiffInfo,
  subgroupIdToIncludedStudentIds: { [key: number]: string[] },
  studentData: IStudentData
): ITSAction[] {
  const actions: ITSAction[] = [];

  actions.push(
    ...generateUpdateMembershipActions(
      mupToLoadToSubgroupMembership,
      subgoupDiffInfo,
      subgroupIdToIncludedStudentIds,
      studentData
    )
  );

  return actions;
}
