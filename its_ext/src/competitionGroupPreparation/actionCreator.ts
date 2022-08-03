import { ITSAction } from "../common/actions";
import {
  AdmissionInfo,
  ICompetitionGroupToSubgroupMetas,
  IMupData,
  IStudentData,
} from "../common/types";
import {
  UpdateSubgroupMetaLoadCountAction,
  UpdateTeacherForSubgroupAction,
} from "../subgroupUpdater/actions";

const DEFAULT_SUBGROUP_META_COUNT = 1;

function generateUpdateSubgroupCountActions(
  competitionGroupId: number,
  selectedMupNamesSet: Set<string>,
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas
): ITSAction[] {
  const actions: ITSAction[] = [];
  // console.log("competitionGroupToSubgroupMetas");
  // console.log(competitionGroupToSubgroupMetas);
  console.log("selectedMupNamesSet");
  console.log(Array.from(selectedMupNamesSet));
  if (!competitionGroupToSubgroupMetas.hasOwnProperty(competitionGroupId)) {
    console.warn(
      `Competition group ${competitionGroupId} not found in competitionGroupToSubgroupMetas`
    );
  }
  const subgroupMetas = competitionGroupToSubgroupMetas[competitionGroupId];

  for (const meta of subgroupMetas) {
    if (
      selectedMupNamesSet.has(meta.discipline) &&
      meta.count !== DEFAULT_SUBGROUP_META_COUNT
    ) {
      actions.push(
        new UpdateSubgroupMetaLoadCountAction(
          meta.id,
          DEFAULT_SUBGROUP_META_COUNT,
          meta.discipline
        )
      );
    }
  }

  return actions;
}

export function createUpdateSubgroupCountActions(
  competitionGroupId: number,
  selectedMupNamesSet: Set<string>,
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas
): ITSAction[] {
  const actions: ITSAction[] = [];

  actions.push(
    ...generateUpdateSubgroupCountActions(
      competitionGroupId,
      selectedMupNamesSet,
      competitionGroupToSubgroupMetas
    )
  );

  return actions;
}

export function createDeleteCreatedSubgroupCountActions(): ITSAction[] {
  const actions: ITSAction[] = [];

  // actions.push(
  //   ...generateUpdateSubgroupCountActions(
  //   )
  // );

  return actions;
}
