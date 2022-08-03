import { ITSAction } from "../../../common/actions";
import {
  ICompetitionGroupToSubgroupIds,
  ICompetitionGroupToSubgroupMetas,
  IMupData,
  ISubgroupData,
  ISubgroupInfo,
  ISubgroupMeta,
} from "../../../common/types";
import {
  UpdateSubgroupMetaLoadCountAction,
  UpdateTeacherForSubgroupAction,
  CreateSubgroupsAction,
  RefreshSubgroupsAction,
} from "../../../subgroupUpdater/actions";
import {
  findTeacherIds,
  generateUpdateTeacherActions,
  generateCreateSubgroupsActions,
  generateRefreshSubgroupsActions,
} from "../../../competitionGroupPreparation/actionCreator";
import { AddReactionSharp } from "@mui/icons-material";

export interface ISubgroupReferenceInfoItem {
  teacher?: string;
  limit?: number;
}

export interface ISubgroupReferenceInfo {
  [key: string]: {
    // mupName
    [key: string]: {
      // load
      subgroupInfo: ISubgroupReferenceInfoItem[];
      count: number;
    };
  };
}

function createSubgroupReferenceInfoFromCompetitionGroup(
  mupNameToMupId: { [key: string]: string },
  subgroupMetas: ISubgroupMeta[],
  subgroupIds: number[],
  subgroupData: ISubgroupData
): ISubgroupReferenceInfo {
  const subgroupReferenceInfo: ISubgroupReferenceInfo = {};
  for (const meta of subgroupMetas) {
    if (!mupNameToMupId.hasOwnProperty(meta.discipline)) {
      continue;
    }
    if (!subgroupReferenceInfo.hasOwnProperty(meta.discipline)) {
      subgroupReferenceInfo[meta.discipline] = {};
    }

    subgroupReferenceInfo[meta.discipline][meta.load] = {
      subgroupInfo: [],
      count: meta.count,
    };
    for (let i = 0; i < meta.count; i++) {
      subgroupReferenceInfo[meta.discipline][meta.load].subgroupInfo.push({});
    }
  }

  for (const subgroupId of subgroupIds) {
    if (subgroupData.data.hasOwnProperty(subgroupId)) {
      const subgroup = subgroupData.data[subgroupId];
      if (!subgroupReferenceInfo.hasOwnProperty(subgroup.mupName)) continue;
      const loadToInfo = subgroupReferenceInfo[subgroup.mupName];
      if (!loadToInfo.hasOwnProperty(subgroup.load)) continue;
      if (
        subgroup.number > 0 &&
        subgroup.number <= loadToInfo[subgroup.load].subgroupInfo.length
      ) {
        const num = subgroup.number - 1;
        const info = loadToInfo[subgroup.load].subgroupInfo[num];
        if (subgroup.teacherId) {
          info.teacher = subgroup.teacherId;
        }
        info.limit = subgroup.limit;
      }
    }
  }

  return subgroupReferenceInfo;
}

function generateUpdateSubgroupCountToActions(
  subgroupReferenceInfo: ISubgroupReferenceInfo,
  mupNameToMupId: { [key: string]: string },
  subgroupMetas: ISubgroupMeta[]
): ITSAction[] {
  const actions: ITSAction[] = [];

  for (const meta of subgroupMetas) {
    if (
      mupNameToMupId.hasOwnProperty(meta.discipline) &&
      subgroupReferenceInfo.hasOwnProperty(meta.discipline) &&
      subgroupReferenceInfo[meta.discipline].hasOwnProperty(meta.load)
    ) {
      const referenceCount =
        subgroupReferenceInfo[meta.discipline][meta.load].count;
      if (meta.count !== referenceCount) {
        actions.push(
          new UpdateSubgroupMetaLoadCountAction(
            meta.id,
            referenceCount,
            meta.discipline
          )
        );
      }
    }
  }

  return actions;
}

function generateUpdateSubgroupActions(
  competitionGroupId: number,
  subgroupReferenceInfo: ISubgroupReferenceInfo,
  mupNameToMupId: { [key: string]: string },
  subgroupMetas: ISubgroupMeta[]
): ITSAction[] {
  const actions: ITSAction[] = [];

  for (const meta of subgroupMetas) {
    if (!mupNameToMupId.hasOwnProperty(meta.discipline)) {
      // console.warn(
      //   `Mup name ${meta.discipline} not found in mupNameToMupId`
      // );
      continue;
    }
    const referenceInfo =
      subgroupReferenceInfo[meta.discipline][meta.load];

    for (let i = 0; i < meta.count; i++) {
      const subgroupInfo: ISubgroupInfo = {
        mupName: meta.discipline,
        load: meta.load,
        number: i + 1,
      };

      const teacher = referenceInfo.subgroupInfo[i].teacher;
      const limit = referenceInfo.subgroupInfo[i].limit;

      actions.push(
        new UpdateTeacherForSubgroupAction(
          competitionGroupId,
          subgroupInfo,
          teacher,
          limit
        )
      );
    }
  }
  
  return actions;
}

export function createSyncActions(
  referenceCompetitionGroupId: number,
  competitionGroupIds: number[],
  mupNameToMupId: { [key: string]: string },
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas,
  competitionGroupToSubgroupIds: ICompetitionGroupToSubgroupIds,
  subgroupData: ISubgroupData
): ITSAction[] {
  const allActions: ITSAction[] = [];

  for (const competitionGroupId of competitionGroupIds) {
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
  }

  const subgroupReferenceInfo = createSubgroupReferenceInfoFromCompetitionGroup(
    mupNameToMupId,
    competitionGroupToSubgroupMetas[referenceCompetitionGroupId],
    competitionGroupToSubgroupIds[referenceCompetitionGroupId],
    subgroupData
  );

  for (const competitionGroupId of competitionGroupIds) {
    if (competitionGroupId === referenceCompetitionGroupId) {
      continue;
    }
    const actions: ITSAction[] = [];

    actions.push(
      ...generateUpdateSubgroupCountToActions(
        subgroupReferenceInfo,
        mupNameToMupId,
        competitionGroupToSubgroupMetas[competitionGroupId]
      )
    );

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
      ...generateUpdateSubgroupActions(
        competitionGroupId,
        subgroupReferenceInfo,
        mupNameToMupId,
        competitionGroupToSubgroupMetas[competitionGroupId],
      )
    );

    allActions.push(...actions);
  }


  return allActions;
}
