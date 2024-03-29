import {
  ICompetitionGroupToSubgroupMetas,
  ICompetitionGroupToSubgroupIds,
  ISubgroupData,
  MetaDiffs,
  SubgroupDiffs,
  ISubgoupDiffInfo,
  IMupSubgroupDiff,
  ISubgroupMeta,
  SubgroupAndMetaAreSameDiffs,
} from "../common/types";

import { ITSAction } from "../common/actions";
import { checkSetsEqual } from "../mupUpdater/actionCreater";
import { checkObjectKeysAreSame } from "../utils/helpers";

function checkIfMetasAndSubgroupsAreSameForMupAndSubgroup(
  mupName: string,
  competitionGroupId: number,
  metaDiffs: MetaDiffs,
  subgroupDiffs: SubgroupDiffs,
  subgroupData: ISubgroupData
) {
  // Find If meta have loads with count > 0 for mupName and competitionGroups
  // if have check subgroups have mupName and competition group
  // Check counts of subgroups for each load
  if (!metaDiffs.hasOwnProperty(mupName)) return true;
  const metaDiff = metaDiffs[mupName];
  if (!metaDiff.hasOwnProperty(competitionGroupId)) return true;
  const loadsToMeta = metaDiff[competitionGroupId];
  const loadsToCounts: { [key: string]: number } = {};
  for (let load in loadsToMeta) {
    if (loadsToMeta[load].count > 0) {
      loadsToCounts[load] = loadsToMeta[load].count;
    }
  }
  const expectCreatedSubgroups = Object.keys(loadsToCounts).length !== 0;

  if (
    !subgroupDiffs.hasOwnProperty(mupName) ||
    !subgroupDiffs[mupName].hasOwnProperty(competitionGroupId)
  ) {
    return !expectCreatedSubgroups;
  }
  const load_numberToSubgroupId = subgroupDiffs[mupName][competitionGroupId];

  const haveCreatedSubgroups =
    Object.keys(load_numberToSubgroupId).length !== 0;
  if (haveCreatedSubgroups !== expectCreatedSubgroups) return false;

  const actualLoadsToCounts: { [key: string]: number } = {};
  for (const load_number in load_numberToSubgroupId) {
    const subgroup = subgroupData.data[load_numberToSubgroupId[load_number]];
    if (!actualLoadsToCounts.hasOwnProperty(subgroup.load)) {
      actualLoadsToCounts[subgroup.load] = 0;
    }
    actualLoadsToCounts[subgroup.load]++;
  }

  for (let load in loadsToCounts) {
    if (!actualLoadsToCounts.hasOwnProperty(load)) {
      return false;
    }
    if (loadsToCounts[load] !== actualLoadsToCounts[load]) {
      return false;
    }
  }
  return true;
}

function compareLoadToSubgroupMetas(
  lhs: { [key: string]: ISubgroupMeta },
  rhs: { [key: string]: ISubgroupMeta }
) {
  if (!checkObjectKeysAreSame(lhs, rhs)) {
    return false;
  }
  for (const load in lhs) {
    const lhsMeta = lhs[load];
    const rhsMeta = rhs[load];
    if (lhsMeta.count !== rhsMeta.count) {
      return false;
    }
  }
  return true;
}

function compareLoadNumberToSubgroupIds(
  lhs: { [key: string]: number }, // <load>_<number> -> subgroupId
  rhs: { [key: string]: number } // <load>_<number> -> subgroupId
) {
  return checkObjectKeysAreSame(lhs, rhs);
}


export function checkSubgroupsAreSync(
  mupNames: string[],
  competitionGroupIds: number[],
  metaDiffs: MetaDiffs,
  subgroupDiffs: SubgroupDiffs,
) {
  // const result: {differentMetas: {[key: string]: string[]}, differentSubgroups: string[]} = {
  //   differentMetas: {},
  //   differentSubgroups: [],
  // };
  // const mupNames = Object.keys(metaDiffs);
  for (const mupName of mupNames) {
    // result.differentMetas[mupName] = [];
    const competitionGroupIdToLoadToSubgroupMeta = metaDiffs[mupName];
    const competitionGroupIdToLoadNumberToSubgroupId =
      subgroupDiffs.hasOwnProperty(mupName) ? subgroupDiffs[mupName] : null;

    let referenceMetas: { [key: string]: ISubgroupMeta } | null = null;
    let referenceSubgroups: { [key: string]: number } | null = null;
    for (const competitionGroupId of competitionGroupIds) {
      if (
        competitionGroupIdToLoadToSubgroupMeta.hasOwnProperty(
          competitionGroupId
        )
      ) {
        const currentMetas =
          competitionGroupIdToLoadToSubgroupMeta[competitionGroupId];
        if (!referenceMetas) {
          referenceMetas = currentMetas;
        } else {
          const loadsSynced = compareLoadToSubgroupMetas(
            currentMetas,
            referenceMetas
          );
          if (!loadsSynced) {
            // result.differentMetas[mupName].push(); // FIXME:
            return false;
          }
        }
      } else {
        // console.warn(
        //   `metaDiffs does not have competitionGroupIds: ${competitionGroupIds}`
        // );
        if (referenceMetas) return false;
      }
    
      if (
        competitionGroupIdToLoadNumberToSubgroupId &&
        competitionGroupIdToLoadNumberToSubgroupId.hasOwnProperty(
          competitionGroupId
        )
      ) {
        const currentSubgroups =
          competitionGroupIdToLoadNumberToSubgroupId[competitionGroupId];
        if (!referenceSubgroups) {
          referenceSubgroups = currentSubgroups;
        }
        const subgroupsSynced = compareLoadNumberToSubgroupIds(
          currentSubgroups, referenceSubgroups 
        );
        if (!subgroupsSynced) return false;
      } else {
        // console.warn(
        //   `subgroupDiffs does not have competitionGroupIds: ${competitionGroupIds}`
        // );
        if (referenceSubgroups) return false;
      }
    }
  }
  return true;
}

function createSubgroupAndMetaAreSameDiffs(
  metaDiffs: MetaDiffs,
  subgroupDiffs: SubgroupDiffs,
  competitionGroupIds: number[],
  subgroupData: ISubgroupData
): SubgroupAndMetaAreSameDiffs {
  const res: SubgroupAndMetaAreSameDiffs = {};
  const mupNamesUnionSet = new Set<string>([
    ...Object.keys(metaDiffs),
    ...Object.keys(subgroupDiffs),
  ]);
  const mupNamesUnion = Array.from(mupNamesUnionSet);
  for (let mupName of mupNamesUnion) {
    res[mupName] = [];
    for (const competitionGroupId of competitionGroupIds) {
      const same = checkIfMetasAndSubgroupsAreSameForMupAndSubgroup(
        mupName,
        competitionGroupId,
        metaDiffs,
        subgroupDiffs,
        subgroupData
      );
      res[mupName].push(same);
    }
  }

  return res;
}

export function createSubgroupDiffInfo(
  competitionGroupIds: number[],
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas,
  competitionGroupToSubgroupIds: ICompetitionGroupToSubgroupIds,
  subgroupData: ISubgroupData
): ISubgoupDiffInfo {
  const metaDiffs: MetaDiffs = {};
  for (let competitionGroupId of competitionGroupIds) {
    const subgroupMetas = competitionGroupToSubgroupMetas[competitionGroupId];
    for (let subgroupMeta of subgroupMetas) {
      if (!metaDiffs.hasOwnProperty(subgroupMeta.discipline)) {
        metaDiffs[subgroupMeta.discipline] = {};
      }
      const cgToMeta = metaDiffs[subgroupMeta.discipline];
      if (!cgToMeta.hasOwnProperty(competitionGroupId)) {
        cgToMeta[competitionGroupId] = {};
      }
      const loadToMetas = cgToMeta[competitionGroupId];
      loadToMetas[subgroupMeta.load] = subgroupMeta;
    }
  }

  const subgroupDiffs: SubgroupDiffs = {};
  for (let competitionGroupId of competitionGroupIds) {
    const subgroupIds = competitionGroupToSubgroupIds[competitionGroupId];
    for (let subgroupId of subgroupIds) {
      const subgroup = subgroupData.data[subgroupId];
      if (!subgroupDiffs.hasOwnProperty(subgroup.mupName)) {
        subgroupDiffs[subgroup.mupName] = {};
      }
      const cgToSubgroupInfo = subgroupDiffs[subgroup.mupName];
      if (!cgToSubgroupInfo.hasOwnProperty(competitionGroupId)) {
        cgToSubgroupInfo[competitionGroupId] = {};
      }
      const subgroupNameToId = cgToSubgroupInfo[competitionGroupId];
      const load_number = `${subgroup.load}_${subgroup.number}`;
      subgroupNameToId[load_number] = subgroup.id;
    }
  }

  const subgroupAndMetaAreSameDiffs = createSubgroupAndMetaAreSameDiffs(
    metaDiffs,
    subgroupDiffs,
    competitionGroupIds,
    subgroupData
  );

  return {
    metaDiffs,
    subgroupDiffs,
    subgroupAndMetaAreSameDiffs,
  };
}

function createDiffMessageForMupByMeta(
  metaDiff: {
    [key: number]: {
      [key: string]: ISubgroupMeta;
    };
  },
  competitionGroupIds: number[],
  mupSubgroupDiff: IMupSubgroupDiff
) {
  if (
    metaDiff.hasOwnProperty(competitionGroupIds[0]) &&
    metaDiff.hasOwnProperty(competitionGroupIds[1])
  ) {
    const first = metaDiff[competitionGroupIds[0]];
    const second = metaDiff[competitionGroupIds[1]];

    const loadSet = new Set<string>([
      ...Object.keys(first),
      ...Object.keys(second),
    ]);

    loadSet.forEach((load) => {
      const fHas = first.hasOwnProperty(load);
      const sHas = second.hasOwnProperty(load);
      mupSubgroupDiff.loadsToMetas[load] = [
        fHas ? first[load] : null,
        sHas ? second[load] : null,
      ];
    });
  }
}

function createDiffMessageForMupBySubgroups(
  subgroupDiff: {
    [key: number]: {
      [key: string]: number;
    };
  },
  competitionGroupIds: number[],
  subgroupData: ISubgroupData,
  mupSubgroupDiff: IMupSubgroupDiff
) {
  if (
    subgroupDiff.hasOwnProperty(competitionGroupIds[0]) &&
    subgroupDiff.hasOwnProperty(competitionGroupIds[1])
  ) {
    const first = subgroupDiff[competitionGroupIds[0]];
    const second = subgroupDiff[competitionGroupIds[1]];

    const load_numberSet = new Set<string>([
      ...Object.keys(first),
      ...Object.keys(second),
    ]);

    load_numberSet.forEach((load_number) => {
      const fHas = first.hasOwnProperty(load_number);
      const sHas = second.hasOwnProperty(load_number);

      let fTeacher: string | null = null;
      let sTeacher: string | null = null;

      if (fHas) {
        const fSubgroup = subgroupData.data[first[load_number]];
        if (fSubgroup.teacherId) {
          fTeacher = fSubgroup.teacherId;
        }
      }
      if (sHas) {
        const sSubgroup = subgroupData.data[second[load_number]];
        if (sSubgroup.teacherId) {
          sTeacher = sSubgroup.teacherId;
        }
      }
      mupSubgroupDiff.loadToTeachers[load_number] = [fTeacher, sTeacher];
    });
  }
}

export function createDiffMessageForMup(
  mupName: string,
  competitionGroupIds: number[],
  subgroupDiffInfo: ISubgoupDiffInfo,
  subgroupData: ISubgroupData
): IMupSubgroupDiff {
  const mupSubgroupDiff: IMupSubgroupDiff = {
    loadsToMetas: {},
    loadToTeachers: {},
  };

  if (subgroupDiffInfo.metaDiffs.hasOwnProperty(mupName)) {
    const metaDiff = subgroupDiffInfo.metaDiffs[mupName];

    createDiffMessageForMupByMeta(
      metaDiff,
      competitionGroupIds,
      mupSubgroupDiff
    );
  }

  if (subgroupDiffInfo.subgroupDiffs.hasOwnProperty(mupName)) {
    const subgroupDiff = subgroupDiffInfo.subgroupDiffs[mupName];

    createDiffMessageForMupBySubgroups(
      subgroupDiff,
      competitionGroupIds,
      subgroupData,
      mupSubgroupDiff
    );
  }

  return mupSubgroupDiff;
}

export function createSubgroupDiffs(
  mupNames: string[],
  competitionGroupIds: number[],
  subgroupDiffInfo: ISubgoupDiffInfo,
  subgroupData: ISubgroupData
): { [key: string]: IMupSubgroupDiff } {
  const res: { [key: string]: IMupSubgroupDiff } = {};
  mupNames.forEach((mupName) => {
    res[mupName] = createDiffMessageForMup(
      mupName,
      competitionGroupIds,
      subgroupDiffInfo,
      subgroupData
    );
  });
  return res;
}

export function createMupToDifferenceMessages(
  mupNames: string[],
  sDiffs: { [key: string]: IMupSubgroupDiff },
  subgroupDiffInfo: ISubgoupDiffInfo
): { [key: string]: string[] } {
  const res: { [key: string]: string[] } = {};
  mupNames.forEach((mupName) => {
    if (!sDiffs.hasOwnProperty(mupName)) {
      throw new Error(`${mupName} has no corresponding SubgroupDiff`);
    }
    res[mupName] = createDifferenceMessagesForMup(
      mupName,
      sDiffs[mupName],
      subgroupDiffInfo
    );
  });
  return res;
}

export function createDifferenceMessagesForMup(
  mupName: string,
  sDiff: IMupSubgroupDiff,
  subgroupDiffInfo: ISubgoupDiffInfo
): string[] {
  const messages: string[] = [];
  messages.push(...createDifferenceMessagesForSubgroupDiff(sDiff));
  const haveLoadMetas = Object.keys(sDiff.loadsToMetas).length !== 0;
  const haveCreatedSubgroups = Object.keys(sDiff.loadToTeachers).length !== 0;

  if (!haveLoadMetas) {
    messages.push(
      `Нагрузки отсутсвуют, проверьте предыдущий шаг или Вручную заполните наргузки`
    );
  }

  if (haveLoadMetas && !haveCreatedSubgroups) {
    messages.push(
      `Не найдено созданных групп. Убедитесь, что количество подгрупп задано и примените изменения, чтобы создать подгруппы`
    );
  }

  if (
    haveCreatedSubgroups &&
    subgroupDiffInfo.subgroupAndMetaAreSameDiffs.hasOwnProperty(mupName)
  ) {
    const [same1, same2] =
      subgroupDiffInfo.subgroupAndMetaAreSameDiffs[mupName];
    if (!same1) {
      messages.push(`Группа 1 имеет подгруппы отличные от настроек подгрупп`);
    }
    if (!same2) {
      messages.push(`Группа 2 имеет подгруппы отличные от настроек подгрупп`);
    }
  }

  return messages;
}

export function createDifferenceMessagesForSubgroupDiff(
  sDiff: IMupSubgroupDiff
): string[] {
  const messages: string[] = [];

  const absentLoads: [string[], string[]] = [[], []];
  const loadsWithDifferentCounts: string[] = [];
  for (const load in sDiff.loadsToMetas) {
    const [sm1, sm2] = sDiff.loadsToMetas[load];
    if (sm1 === null) {
      absentLoads[0].push(load);
    }
    if (sm2 === null) {
      absentLoads[1].push(load);
    }
    if (sm1 && sm2) {
      if (sm1.count !== sm2.count) {
        loadsWithDifferentCounts.push(
          `"${load}" (${sm1.count} != ${sm2.count})`
        );
      }
    }
  }
  if (loadsWithDifferentCounts.length > 0) {
    const loadsWithDifferentCountsStr = loadsWithDifferentCounts.join(", ");
    messages.push(
      `Количество групп для следующих нагрузок оличается: ${loadsWithDifferentCountsStr}. Проверьте настройки, перейдя по ссылкам над таблицей`
    );
  }
  if (absentLoads[0].length > 0) {
    const loadsStr = absentLoads[0].join(", ");
    messages.push(`Группа 1 не содержит нагрузки: ${loadsStr}`);
  }
  if (absentLoads[1].length > 0) {
    const loadsStr = absentLoads[1].join(", ");
    messages.push(`Группа 2 не содержит нагрузки: ${loadsStr}`);
  }
  if (absentLoads[0].length > 0 || absentLoads[1].length > 0) {
    messages.push("Проверьте состав нагрузки периода");
  }

  const load_numberWithAbsentTeachers: [string[], string[]] = [[], []];
  const teachers1 = new Set<string>();
  const teachers2 = new Set<string>();
  for (const load_number in sDiff.loadToTeachers) {
    const [t1, t2] = sDiff.loadToTeachers[load_number];
    if (!t1) {
      load_numberWithAbsentTeachers[0].push(load_number);
    } else {
      teachers1.add(t1);
    }
    if (!t2) {
      load_numberWithAbsentTeachers[1].push(load_number);
    } else {
      teachers2.add(t2);
    }
  }
  if (load_numberWithAbsentTeachers[0].length > 0) {
    const loadsStr = load_numberWithAbsentTeachers[0].join(", ");
    messages.push(`Группа 1 не имеет преподавателя для нагрузок: ${loadsStr}`);
  }

  if (load_numberWithAbsentTeachers[1].length > 0) {
    const loadsStr = load_numberWithAbsentTeachers[1].join(", ");
    messages.push(`Группа 2 не имеет преподавателя для нагрузок: ${loadsStr}`);
  }

  if (!checkSetsEqual(teachers1, teachers2)) {
    messages.push(`Наборы преподавателей отличаются`);
  }

  return messages;
}

export function createTodoMessages(actions: ITSAction[]): string[] {
  const messages = actions.map((a) => a.getMessageSimple());

  return messages;
}
