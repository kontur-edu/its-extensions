import { ITSAction } from "../common/actions";
import {
  AdmissionInfo,
  ICompetitionGroupToSubgroupIds,
  ICompetitionGroupToSubgroupMetas,
  IMupData,
  IStudentData,
  ISubgroupData,
  ISubgroupInfo,
} from "../common/types";
import {
  UpdateSubgroupMetaLoadCountAction,
  UpdateTeacherForSubgroupAction,
  CreateSubgroupsAction,
  RefreshSubgroupsAction,
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

function checkSubgroupsCreated(
  competitionGroupId: number,
  mupNameToMupId: { [key: string]: string },
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas,
  competitionGroupToSubgroupIds: ICompetitionGroupToSubgroupIds,
  subgroupData: ISubgroupData
) {
  console.log("competitionGroupToSubgroupMetas");
  console.log(competitionGroupToSubgroupMetas);
  console.log("competitionGroupToSubgroupIds");
  console.log(competitionGroupToSubgroupIds);
  if (!competitionGroupToSubgroupMetas.hasOwnProperty(competitionGroupId)) {
    console.warn(
      `competitionGroupId: ${competitionGroupId} not found in competitionGroupToSubgroupMetas`
    );
  }
  if (!competitionGroupToSubgroupIds.hasOwnProperty(competitionGroupId)) {
    console.warn(
      `competitionGroupId: ${competitionGroupId} not found in competitionGroupToSubgroupIds`
    );
  }

  const mupNameToLoadToPresent: {
    [key: string]: {
      [key: string]: boolean[];
    };
  } = {};
  for (const meta of competitionGroupToSubgroupMetas[competitionGroupId]) {
    if (!mupNameToMupId.hasOwnProperty(meta.discipline)) {
      continue;
    }

    mupNameToLoadToPresent[meta.discipline] = {};
    mupNameToLoadToPresent[meta.discipline][meta.load] = [];
    for (let i = 0; i < meta.count; i++) {
      mupNameToLoadToPresent[meta.discipline][meta.load].push(false);
    }
  }

  console.log("mupNameToLoadToPresent: before");
  console.log(mupNameToLoadToPresent);

  for (const subgroupId of competitionGroupToSubgroupIds[competitionGroupId]) {
    if (!subgroupData.data.hasOwnProperty(subgroupId)) continue;
    const subgroup = subgroupData.data[subgroupId];
    if (!mupNameToLoadToPresent.hasOwnProperty(subgroup.mupName)) continue;
    const loadToPresent = mupNameToLoadToPresent[subgroup.mupName];
    if (!loadToPresent.hasOwnProperty(subgroup.load)) continue;
    if (
      subgroup.number > 0 &&
      subgroup.number < loadToPresent[subgroup.load].length
    ) {
      loadToPresent[subgroup.load][subgroup.number] = true;
    }
  }

  console.log("mupNameToLoadToPresent: after");
  console.log(mupNameToLoadToPresent);

  for (const mupName in mupNameToLoadToPresent) {
    for (const load in mupNameToLoadToPresent[mupName]) {
      if (mupNameToLoadToPresent[mupName][load].some((p) => !p)) {
        return false;
      }
    }
  }

  return true;
}

function generateCreateSubgroupsActions(
  competitionGroupId: number,
  mupNameToMupId: { [key: string]: string },
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas,
  competitionGroupToSubgroupIds: ICompetitionGroupToSubgroupIds,
  subgroupData: ISubgroupData
): ITSAction[] {
  const actions: ITSAction[] = [];

  const subgroupsCreated = checkSubgroupsCreated(
    competitionGroupId,
    mupNameToMupId,
    competitionGroupToSubgroupMetas,
    competitionGroupToSubgroupIds,
    subgroupData
  );

  if (subgroupsCreated) return [];

  actions.push(new CreateSubgroupsAction(competitionGroupId));

  return actions;
}

function generateRefreshSubgroupsActions(competitionGroupId: number) {
  return [new RefreshSubgroupsAction([competitionGroupId])];
}

function generateUpdateTeacherActions(
  competitionGroupId: number,
  mupNameToMupId: { [key: string]: string },
  mupData: IMupData,
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas
): ITSAction[] {
  // console.log("mupNameToMupId");
  // console.log(mupNameToMupId);
  const actions: ITSAction[] = [];

  if (!competitionGroupToSubgroupMetas.hasOwnProperty(competitionGroupId)) {
    console.warn(
      `Competition group ${competitionGroupId} not found in competitionGroupToSubgroupMetas`
    );
  }

  const subgroupMetas = competitionGroupToSubgroupMetas[competitionGroupId];

  for (const meta of subgroupMetas) {
    if (!mupNameToMupId.hasOwnProperty(meta.discipline)) {
      // console.warn(
      //   `Mup name ${meta.discipline} not found in mupNameToMupId`
      // );
      continue;
    }

    const mupId = mupNameToMupId[meta.discipline];

    if (!mupData.data.hasOwnProperty(mupId)) {
      console.warn(`mupId: ${mupId} not found in mupData`);
      continue;
    }

    const mup = mupData.data[mupId];
    if (mup.teacherIds.length !== 1) {
      continue;
    }

    for (let i = 0; i < meta.count; i++) {
      const subgroupInfo: ISubgroupInfo = {
        mupName: meta.discipline,
        load: meta.load,
        number: i + 1,
      };

      actions.push(
        new UpdateTeacherForSubgroupAction(
          competitionGroupId,
          subgroupInfo,
          mup.teacherIds[0]
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

export function createPrepareSubgroupsActions(
  competitionGroupId: number,
  mupNameToMupId: { [key: string]: string },
  mupData: IMupData,
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas,
  competitionGroupToSubgroupIds: ICompetitionGroupToSubgroupIds,
  subgroupData: ISubgroupData
): ITSAction[] {
  const actions: ITSAction[] = [];

  actions.push(
    ...generateCreateSubgroupsActions(
      competitionGroupId,
      mupNameToMupId,
      competitionGroupToSubgroupMetas,
      competitionGroupToSubgroupIds,
      subgroupData
    )
  );

  if (actions.length > 0) {
    actions.push(...generateRefreshSubgroupsActions(competitionGroupId));
  }

  actions.push(
    ...generateUpdateTeacherActions(
      competitionGroupId,
      mupNameToMupId,
      mupData,
      competitionGroupToSubgroupMetas
    )
  );

  return actions;
}
