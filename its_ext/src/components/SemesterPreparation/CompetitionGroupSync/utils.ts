import { ITSAction } from "../../../common/actions";
import {
  ICompetitionGroupToSubgroupMetas,
  ISubgroupData,
  ISubgroupInfo,
  ISubgroupMeta,
} from "../../../common/types";
import {
  UpdateSubgroupMetaLoadCountAction,
  UpdateTeacherForSubgroupAction,
  CreateSubgroupsAction,
} from "../../../subgroupUpdater/actions";
import {
  generateRefreshSubgroupsActions,
} from "../../../competitionGroupPreparation/actionCreator";

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

export function createSubgroupReferenceInfoFromCompetitionGroup(
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

export function checkMupsAndLoadsCompatible(
  subgroupReferenceInfo: ISubgroupReferenceInfo,
  currentSubgroupInfo: ISubgroupReferenceInfo
): boolean {
  for (const mupName in subgroupReferenceInfo) {
    if (!currentSubgroupInfo.hasOwnProperty(mupName)) {
      return false;
    }
    for (const load in subgroupReferenceInfo[mupName]) {
      if (!currentSubgroupInfo[mupName].hasOwnProperty(load)) {
        return false;
      }
    }
  }
  return true;
}

function generateUpdateSubgroupCountToActions(
  subgroupReferenceInfo: ISubgroupReferenceInfo,
  // currentSubgroupInfo: ISubgroupReferenceInfo,
  mupNameToMupId: { [key: string]: string },
  subgroupMetas: ISubgroupMeta[]
): ITSAction[] {
  const actions: ITSAction[] = [];
  console.log("-------------------------");
  console.log("subgroupReferenceInfo");
  console.log(subgroupReferenceInfo);
  console.log("mupNameToMupId");
  console.log(mupNameToMupId);
  console.log("subgroupMetas");
  console.log(subgroupMetas);
  console.log("-------------------------");

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
  currentSubgroupInfo: ISubgroupReferenceInfo,
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
    const referenceInfo = subgroupReferenceInfo[meta.discipline][meta.load];
    const currentInfo = currentSubgroupInfo[meta.discipline][meta.load];

    for (let i = 0; i < referenceInfo.subgroupInfo.length; i++) {
      if (
        i < currentInfo.subgroupInfo.length &&
        currentInfo.subgroupInfo[i].teacher ===
          referenceInfo.subgroupInfo[i].teacher &&
        currentInfo.subgroupInfo[i].limit ===
          referenceInfo.subgroupInfo[i].limit
      ) {
        continue;
      }

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

export function checkSubgroupsCreated(
  subgroupReferenceInfo: ISubgroupReferenceInfo,
  currentSubgroupInfo: ISubgroupReferenceInfo
) {
  console.log("subgroupReferenceInfo");
  console.log(subgroupReferenceInfo);
  console.log("currentSubgroupInfo");
  console.log(currentSubgroupInfo);
  for (const mupName in subgroupReferenceInfo) {
    for (const load in subgroupReferenceInfo[mupName]) {
      const refLoad = subgroupReferenceInfo[mupName][load];
      const curLoad = currentSubgroupInfo[mupName][load];
      if (refLoad.count > curLoad.subgroupInfo.length) {
        return false;
      }
      for (
        let i = 0;
        i < Math.min(refLoad.count, curLoad.subgroupInfo.length);
        i++
      ) {
        const subgroupInfo = curLoad.subgroupInfo[i];
        console.log("subgroupInfo");
        console.log(subgroupInfo);
        if (
          subgroupInfo.limit === undefined &&
          subgroupInfo.teacher === undefined
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

export function createSyncActions(
  referenceCompetitionGroupId: number,
  competitionGroupIds: number[],
  mupNameToMupId: { [key: string]: string },
  competitionGroupIdToInfo: { [key: number]: ISubgroupReferenceInfo },
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas,
  // competitionGroupToSubgroupIds: ICompetitionGroupToSubgroupIds,
  // subgroupData: ISubgroupData
): ITSAction[] {
  const allActions: ITSAction[] = [];

  console.log("competitionGroupIdToInfo");
  console.log(competitionGroupIdToInfo);
  console.log("competitionGroupIds");
  console.log(competitionGroupIds);

  // for (const competitionGroupId of competitionGroupIds) {
  //   if (!competitionGroupToSubgroupMetas.hasOwnProperty(competitionGroupId)) {
  //     console.warn(
  //       `competitionGroupId: ${competitionGroupId} not found in competitionGroupToSubgroupMetas`
  //     );
  //   }
  //   if (!competitionGroupToSubgroupIds.hasOwnProperty(competitionGroupId)) {
  //     console.warn(
  //       `competitionGroupId: ${competitionGroupId} not found in competitionGroupToSubgroupIds`
  //     );
  //   }
  // }

  const subgroupReferenceInfo =
    competitionGroupIdToInfo[referenceCompetitionGroupId];
  // createSubgroupReferenceInfoFromCompetitionGroup(
  //   mupNameToMupId,
  //   competitionGroupToSubgroupMetas[referenceCompetitionGroupId],
  //   competitionGroupToSubgroupIds[referenceCompetitionGroupId],
  //   subgroupData
  // );

  for (const competitionGroupId of competitionGroupIds) {
    if (competitionGroupId === referenceCompetitionGroupId) {
      continue;
    }

    const currentSubgroupInfo = competitionGroupIdToInfo[competitionGroupId];
    // createSubgroupReferenceInfoFromCompetitionGroup(
    //   mupNameToMupId,
    //   competitionGroupToSubgroupMetas[competitionGroupId],
    //   competitionGroupToSubgroupIds[competitionGroupId],
    //   subgroupData
    // );
    const actions: ITSAction[] = [];

    actions.push(
      ...generateUpdateSubgroupCountToActions(
        // meta is enough
        subgroupReferenceInfo,
        // currentSubgroupInfo,
        mupNameToMupId,
        competitionGroupToSubgroupMetas[competitionGroupId]
      )
    );

    const subgroupsCreated = checkSubgroupsCreated(
      subgroupReferenceInfo,
      currentSubgroupInfo
    );
    if (!subgroupsCreated) {
      actions.push(new CreateSubgroupsAction(competitionGroupId));
    }

    if (actions.length > 0) {
      actions.push(...generateRefreshSubgroupsActions(competitionGroupId));
    }

    actions.push(
      ...generateUpdateSubgroupActions(
        competitionGroupId,
        subgroupReferenceInfo,
        currentSubgroupInfo,
        mupNameToMupId,
        competitionGroupToSubgroupMetas[competitionGroupId]
      )
    );

    allActions.push(...actions);
  }

  return allActions;
}

export function getDiffMessagesBySubgroupReferenceInfo(
  newReferenceCompetitionGroupId: number,
  newCompetitionGroupIds: number[],
  competitionGroupIdToInfo: { [key: number]: ISubgroupReferenceInfo }
): { [key: string]: string[] } {
  const res: { [key: string]: string[] } = {};
  const referenceInfo =
    competitionGroupIdToInfo[newReferenceCompetitionGroupId];

  for (const competitionGroupId of newCompetitionGroupIds) {
    if (newReferenceCompetitionGroupId === competitionGroupId) {
      continue;
    }

    const currentInfo = competitionGroupIdToInfo[competitionGroupId];

    for (const mupName in referenceInfo) {
      res[mupName] = [];

      const differentSubgroupCountMessages: string[] = [];
      const differentSubgroupLimitMessages: string[] = [];
      const differentSubgroupTeachersMessages: string[] = [];
      const notEnoughCreatedSubgroups: string[] = [];

      for (const load in referenceInfo[mupName]) {
        const mupLoadPart = `"${load}"`;
        const refLoad = referenceInfo[mupName][load];
        const curLoad = currentInfo[mupName][load];
        if (refLoad.count !== curLoad.count) {
          differentSubgroupCountMessages.push(
            `${mupLoadPart} (${refLoad.count} <> ${curLoad.count})`
          );
        }
        let someSubgroupsMissing = false;
        for (let i = 0; i < refLoad.subgroupInfo.length; i++) {
          if (
            i >= curLoad.subgroupInfo.length ||
            curLoad.subgroupInfo[i].limit === undefined
          ) {
            // NOTE: limit === undefined if subgroup not exists
            someSubgroupsMissing = true;

            continue;
          }
          const rSub = refLoad.subgroupInfo[i];
          const cSub = curLoad.subgroupInfo[i];
          if (rSub.limit !== cSub.limit) {
            differentSubgroupLimitMessages.push(
              `${mupLoadPart} подгруппа ${i + 1} (${rSub.limit} <> ${
                cSub.limit
              })`
            );
          }
          if (rSub.teacher !== cSub.teacher && rSub.teacher && cSub.teacher) {
            differentSubgroupTeachersMessages.push(
              `${mupLoadPart} подгруппа ${i + 1} (${
                rSub.teacher ?? "не задан"
              } <> ${cSub.teacher ?? "не задан"})`
            );
          }
        }
        if (someSubgroupsMissing) {
          notEnoughCreatedSubgroups.push(`${mupLoadPart}`);
        }
      }

      if (notEnoughCreatedSubgroups.length > 0) {
        // const part = notEnoughCreatedSubgroups.join(", ");
        // res[mupName].push(`Не найдено созданных подгрупп для: ${part}`);
        res[mupName].push(`Нет некоторых подгрупп`);
      }

      if (differentSubgroupCountMessages.length > 0) {
        // const part = differentSubgroupCountMessages.join(", ");
        // res[mupName].push(
        //   `Количество подгрупп отличается для следующих нагрузок: ${part}`
        // );
        res[mupName].push(
          `Количество подгрупп отличается`
        );
      }
      if (differentSubgroupLimitMessages.length > 0) {
        // const part = differentSubgroupLimitMessages.join(", ");
        // res[mupName].push(`Лимит отличается для следующих подгрупп: ${part}`);
        res[mupName].push(`Лимиты отличается`);
      }
      if (differentSubgroupTeachersMessages.length > 0) {
        // const part = differentSubgroupTeachersMessages.join(", ");
        // res[mupName].push(
        //   `Преподаватели отличается для следующих подгрупп: ${part}`
        // );
        res[mupName].push(
          `Преподаватели отличается`
        );
      }
    }
  }

  return res;
}
