import { IITSContext } from "../common/Context";
import { ActionType, ITSAction } from "../common/actions";
import {
  DeleteSubgroupsAction,
  UpdateSelectionGroupAction,
  UpdateLimitAction,
  CreatePeriodAction,
  UpdatePeriodAction,
  AddLoadsAction,
  RefreshSelectionGroupsAction,
  RefreshPeriodsAction,
  UpdateModulesAction,
} from "./actions";

import {
  IMupLoad,
  IMupDiff,
  IPeriodTimeInfo,
  // IMupToPeriods,
  IPeriod,
  IMupData,
  IModuleSelection,
  IModuleData,
  ISelectionGroupToMupsData,
} from "../common/types";

import { ITSRepository } from "../utils/repository";

function generateDeleteSubgroupsActions(
  selectionGroupsIds: number[],
  selectedMupsIds: string[],
  repository: ITSRepository
) {
  const selectedMupsIdsSet = new Set<string>(selectedMupsIds);
  const actions: ITSAction[] = [];
  for (let selectionGroupId of selectionGroupsIds) {
    const cgId =
      repository.selectionGroupData.data[selectionGroupId].competitionGroupId;
    if (cgId !== null && cgId !== undefined) {
      const subgroupIds = repository.competitionGroupToSubgroupIds[cgId];
      const subgroupIdsToDelete: number[] = [];
      for (let subgroupId of subgroupIds) {
        const subgroup = repository.subgroupData.data[subgroupId];
        if (!selectedMupsIdsSet.has(subgroup.mupId)) {
          subgroupIdsToDelete.push(subgroup.id);
        }
      }
      if (subgroupIdsToDelete.length > 0) {
        actions.push(new DeleteSubgroupsAction(subgroupIdsToDelete));
      }
    }
  }
  return actions;
}

function generateDeleteModulesActions(
  selectionGroupsIds: number[],
  selectedMupsIds: string[],
  selectionGroupToMupsData: ISelectionGroupToMupsData,
  moduleData: IModuleData
) {
  const selectedMupsIdsSet = new Set<string>(selectedMupsIds);
  const emptyModules: IModuleSelection[] = Object.keys(moduleData.data).map(
    (moduleId) => {
      const moduleSelection: IModuleSelection = {
        id: moduleId,
        selected: [],
      };
      return moduleSelection;
    }
  );
  const actions: ITSAction[] = [];
  for (let selectionGroupId of selectionGroupsIds) {
    if (!selectionGroupToMupsData.data.hasOwnProperty(selectionGroupId)) {
      continue;
    }
    const selectionGroupMups =
      selectionGroupToMupsData.data[selectionGroupId].data;
    for (const mupId in selectionGroupMups) {
      if (!selectedMupsIdsSet.has(mupId)) {
        // delete all modules
        actions.push(
          new UpdateModulesAction(mupId, selectionGroupId, emptyModules)
        );
      }
    }
  }
  return actions;
}

export function checkSetsEqual(lhs: Set<string>, rhs: Set<string>) {
  if (lhs.size !== rhs.size) return false;
  for (const val of Array.from(lhs.values())) {
    if (!rhs.has(val)) return false;
  }
  return true;
}

function generateUpdateSelectionGroupActions(
  selectionGroupsIds: number[],
  selectedMupsIds: string[],
  repository: ITSRepository
) {
  const actions: ITSAction[] = [];
  for (let selectionGroupId of selectionGroupsIds) {
    // check if need update
    const selectionGroupMups =
      repository.selectionGroupToMupsData.data[selectionGroupId];
    const initMups = new Set(selectionGroupMups.ids);
    const newMups = new Set(selectedMupsIds);
    if (checkSetsEqual(initMups, newMups)) {
      continue;
    }

    const selectionGroup = repository.selectionGroupData.data[selectionGroupId];
    actions.push(
      new UpdateSelectionGroupAction(selectionGroup, selectedMupsIds)
    );
  }
  return actions;
}

function generateRefreshActions(
  selectionGroupsIds: number[],
  selectedMupsIds: string[]
) {
  const actions: ITSAction[] = [];
  if (selectedMupsIds.length > 0) {
    actions.push(new RefreshSelectionGroupsAction(selectionGroupsIds));
  }
  if (selectedMupsIds.length > 0) {
    actions.push(new RefreshPeriodsAction(selectedMupsIds));
  }
  return actions;
}

function generateUpdateLimitActions(
  selectionGroupsIds: number[],
  selectedMupsIds: string[],
  mupLimits: { [key: string]: number },
  mupDiffs: { [key: string]: IMupDiff }
) {
  const actions: ITSAction[] = [];
  for (let mupId of selectedMupsIds) {
    let newLimit = mupLimits[mupId];
    for (let i = 0; i < selectionGroupsIds.length; i++) {
      const selectionGroupId = selectionGroupsIds[i];
      const initLimit = mupDiffs[mupId].initLimits[i];
      // alert(mupDiffs[mupId].initLimits);
      // console.log(`initLimit: ${initLimit} newLimit: ${newLimit}`);
      if (initLimit !== newLimit) {
        actions.push(new UpdateLimitAction(mupId, selectionGroupId, newLimit));
      }
    }
  }
  return actions;
}

function generateCreatePeriodActions(
  selectedMupsIds: string[],
  mupDiffs: { [key: string]: IMupDiff },
  courseToPeriodTimeInfo: { [key: number]: IPeriodTimeInfo }
) {
  const actions: ITSAction[] = [];
  for (let mupId of selectedMupsIds) {
    for (let course of [3, 4]) {
      if (!mupDiffs[mupId].courseToCurrentPeriod.hasOwnProperty(course)) {
        const periodTimeInfo = courseToPeriodTimeInfo[course];
        actions.push(new CreatePeriodAction(mupId, periodTimeInfo));
      }
    }
  }
  return actions;
}

export function createResultLoads(mupDiff: IMupDiff): {
  [key: string]: IMupLoad;
} {
  const kmerToLoad: { [key: string]: IMupLoad } = {};
  for (let course of [3, 4]) {
    if (mupDiff.courseToCurrentPeriod.hasOwnProperty(course)) {
      const currentPeriod = mupDiff.courseToCurrentPeriod[course];
      for (let load of currentPeriod.loads) {
        kmerToLoad[load.kmer] = load;
      }
    }
  }
  if (Object.keys(kmerToLoad).length === 0) {
    for (let load of mupDiff.someLoads) {
      kmerToLoad[load.kmer] = load;
    }
  }
  return kmerToLoad;
}

export function findLoadsToAdd(
  currentPeriod: IPeriod,
  resulLoads: IMupLoad[]
): IMupLoad[] {
  const kmerToLoad: { [key: string]: IMupLoad } = {};
  for (const load of currentPeriod.loads) {
    kmerToLoad[load.kmer] = load;
  }
  const loadsToAdd: IMupLoad[] = [];
  for (const resultLoad of resulLoads) {
    if (!kmerToLoad.hasOwnProperty(resultLoad.kmer)) {
      loadsToAdd.push(resultLoad);
    }
  }
  return loadsToAdd;
}

function generateAddLoadsActions(
  selectedMupsIds: string[],
  mupDiffs: { [key: string]: IMupDiff },
  courseToPeriodTimeInfo: { [key: number]: IPeriodTimeInfo }
  // mupToPeriods: IMupToPeriods
) {
  const actions: ITSAction[] = [];
  for (let mupId of selectedMupsIds) {
    // let loads: IMupLoad[] = [];
    // for (let period of mupToPeriods[mupId]) {
    //   if (period.loads.length > 0) {
    //     loads = period.loads;
    //     break;
    //   }
    // }

    const mupDiff = mupDiffs[mupId];

    // NOTE: if we want to have same loads for 3 and 4 coursess
    // find union of loads
    const resulLoads = Object.values(createResultLoads(mupDiff));

    for (let course of [3, 4]) {
      const periodTimeInfo = courseToPeriodTimeInfo[course];
      let loadsToAdd: IMupLoad[] = resulLoads;
      if (mupDiff.courseToCurrentPeriod.hasOwnProperty(course)) {
        const currentPeriod = mupDiff.courseToCurrentPeriod[course];
        loadsToAdd = findLoadsToAdd(currentPeriod, resulLoads);
        if (loadsToAdd.length > 0) {
          actions.push(new AddLoadsAction(mupId, periodTimeInfo, loadsToAdd));
        }
      } else {
        if (resulLoads.length > 0) {
          actions.push(new AddLoadsAction(mupId, periodTimeInfo, resulLoads));
        }
      }
    }
  }
  return actions;
}

function generateUpdatePeriodActions(
  selectedMupsIds: string[],
  mupDiffs: { [key: string]: IMupDiff },
  courseToPeriodTimeInfo: { [key: number]: IPeriodTimeInfo }
) {
  const actions: ITSAction[] = [];
  for (let mupId of selectedMupsIds) {
    const mupDiff = mupDiffs[mupId];

    for (let course of [3, 4]) {
      const periodTimeInfo = courseToPeriodTimeInfo[course];
      if (mupDiff.courseToCurrentPeriod.hasOwnProperty(course)) {
        const currentPeriod = mupDiff.courseToCurrentPeriod[course];

        if (
          currentPeriod.selectionBegin !== periodTimeInfo.dates[0] ||
          currentPeriod.selectionDeadline !== periodTimeInfo.dates[1]
        ) {
          // if (!mupDiff.canBeDeleted) {
          //   const periodInfoNotChangedSelectionBegin: IPeriodTimeInfo = {
          //     ...periodTimeInfo,
          //     dates: [currentPeriod.selectionBegin, periodTimeInfo.dates[1]],
          //   };
          //   actions.push(
          //     new UpdatePeriodAction(mupId, periodInfoNotChangedSelectionBegin)
          //   );
          // } else {
          //   actions.push(new UpdatePeriodAction(mupId, periodTimeInfo));
          // }
          actions.push(new UpdatePeriodAction(mupId, periodTimeInfo));
        }
      }
    }
  }
  return actions;
}

function generateUpdateModulesAction(
  selectionGroupsIds: number[],
  selectedMupsIds: string[],
  mupDiffs: { [key: string]: IMupDiff },
  zeToModuleSelection: { [key: number]: IModuleSelection[] },
  mupData: IMupData,
  moduleData: IModuleData
) {
  const actions: ITSAction[] = [];
  console.log("zeToModuleSelection");
  console.log(zeToModuleSelection);
  for (let mupId of selectedMupsIds) {
    const ze = mupData.data[mupId].ze;

    const moduleIdToSelection: { [key: string]: string[] } = {};
    if (zeToModuleSelection.hasOwnProperty(ze)) {
      zeToModuleSelection[ze].forEach((rm) => {
        moduleIdToSelection[rm.id] = rm.selected;
      });
    }
    // console.log("moduleIdToSelection");
    // console.log(moduleIdToSelection);
    for (let i = 0; i < selectedMupsIds.length; i++) {
      const selectionGroupId = selectionGroupsIds[i];
      if (mupDiffs[mupId].updateSelectedModuleDisciplines[i]) {
        const ms = Object.keys(moduleData.data).map((moduleId) => {
          const moduleSelection: IModuleSelection = {
            id: moduleId,
            selected: [],
          };

          if (moduleIdToSelection.hasOwnProperty(moduleId)) {
            moduleSelection.selected = moduleIdToSelection[moduleId];
          }
          return moduleSelection;
        });
        actions.push(new UpdateModulesAction(mupId, selectionGroupId, ms));
      }
    }
  }
  return actions;
}

export function createActions(
  selectionGroupsIds: number[],
  selectedMupsIds: string[],
  mupDiffs: { [key: string]: IMupDiff },
  dates: [string, string],
  mupLimits: { [key: string]: number },
  zeToModuleSelection: { [key: number]: IModuleSelection[] },
  itsContext: IITSContext
): ITSAction[] {
  if (selectionGroupsIds.length === 0) {
    return [];
  }
  const actions: ITSAction[] = [];

  const firstSelectionGroup =
    itsContext.dataRepository.selectionGroupData.data[selectionGroupsIds[0]];
  let year = firstSelectionGroup.year;
  let semesterId = firstSelectionGroup.semesterId;
  const courseToPeriodTimeInfo: { [key: number]: IPeriodTimeInfo } = {
    3: { course: 3, year, semesterId, dates },
    4: { course: 4, year, semesterId, dates },
  };

  actions.push(
    ...generateDeleteSubgroupsActions(
      selectionGroupsIds,
      selectedMupsIds,
      itsContext.dataRepository
    )
  );

  actions.push(
    ...generateDeleteModulesActions(
      selectionGroupsIds,
      selectedMupsIds,
      itsContext.dataRepository.selectionGroupToMupsData,
      itsContext.dataRepository.moduleData
    )
  );

  actions.push(
    ...generateUpdateSelectionGroupActions(
      selectionGroupsIds,
      selectedMupsIds,
      itsContext.dataRepository
    )
  );

  actions.push(
    ...generateCreatePeriodActions(
      selectedMupsIds,
      mupDiffs,
      courseToPeriodTimeInfo
    )
  );

  if (actions.length > 0) {
    actions.push(...generateRefreshActions(selectionGroupsIds, selectedMupsIds));
  }
  
  actions.push(
    ...generateUpdateLimitActions(
      selectionGroupsIds,
      selectedMupsIds,
      mupLimits,
      mupDiffs
    )
  );

  actions.push(
    ...generateUpdateModulesAction(
      selectionGroupsIds,
      selectedMupsIds,
      mupDiffs,
      zeToModuleSelection,
      itsContext.dataRepository.mupData,
      itsContext.dataRepository.moduleData
    )
  );

  actions.push(
    ...generateAddLoadsActions(
      selectedMupsIds,
      mupDiffs,
      courseToPeriodTimeInfo
      // itsContext.dataRepository.mupToPeriods
    )
  );

  actions.push(
    ...generateUpdatePeriodActions(
      selectedMupsIds,
      mupDiffs,
      courseToPeriodTimeInfo
    )
  );

  return actions;
}

export function getMupActions(actions: ITSAction[]): {
  [key: string]: ITSAction[];
} {
  const res: { [key: string]: ITSAction[] } = {};
  for (const action of actions) {
    if (action.actionType === ActionType.UpdateLimit) {
      const updateLimitAction = action as UpdateLimitAction;
      const mupId = updateLimitAction.mupId;

      if (!res.hasOwnProperty(mupId)) res[mupId] = [];
      res[mupId].push(action);
    } else if (action.actionType === ActionType.CreatePeriod) {
      const createPeriodAction = action as CreatePeriodAction;
      const mupId = createPeriodAction.mupId;

      if (!res.hasOwnProperty(mupId)) res[mupId] = [];
      res[mupId].push(action);
    } else if (action.actionType === ActionType.AddLoads) {
      const addLoadsAction = action as AddLoadsAction;
      const mupId = addLoadsAction.mupId;

      if (!res.hasOwnProperty(mupId)) res[mupId] = [];
      res[mupId].push(action);
    } else if (action.actionType === ActionType.UpdatePeriod) {
      const updatePeriodAction = action as UpdatePeriodAction;
      const mupId = updatePeriodAction.mupId;

      if (!res.hasOwnProperty(mupId)) res[mupId] = [];
      res[mupId].push(action);
    } else if (action.actionType === ActionType.UpdateModules) {
      const updateModulesAction = action as UpdateModulesAction;
      const mupId = updateModulesAction.mupId;

      if (!res.hasOwnProperty(mupId)) res[mupId] = [];
      res[mupId].push(action);
    }
  }

  return res;
}
