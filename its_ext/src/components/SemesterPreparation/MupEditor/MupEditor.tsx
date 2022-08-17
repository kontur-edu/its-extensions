import React, { useState, useEffect, useContext, useRef } from "react";
import { MupsList } from "../../MupsList";
import style from "./MupEditor.module.css";
import { IMupEditorProps } from "./types";
import {
  IMupEdit,
  IMupDiff,
  IModuleData,
  IModuleSelection,
} from "../../../common/types";

import { DEBOUNCE_MS } from "../../../utils/constants";

import {
  createDiffForMup,
  updateMupDiffDateInfo,
} from "../../../mupUpdater/mupDifference";

import { ITSContext } from "../../../common/Context";

import {
  ActionType,
  ITSAction,
  executeActions,
  checkAllRefreshAction,
} from "../../../common/actions";
import {
  createActions,
  getMupActions,
} from "../../../mupUpdater/actionCreater";
import { UpdateSelectionGroupAction } from "../../../mupUpdater/actions";
import { createDebouncedWrapper } from "../../../utils/helpers";
import { IActionExecutionLogItem } from "../../../common/actions";

import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";

import { RefreshButton } from "../../RefreshButton";
import CircularProgress from "@mui/material/CircularProgress";

function getDatesOfMupDiff(diff: IMupDiff) {
  const dates: [string, string] = ["", ""];
  for (let currentPeriod of Object.values(diff.courseToCurrentPeriod)) {
    if (currentPeriod.selectionBegin) {
      dates[0] = currentPeriod.selectionBegin;
    }
    if (currentPeriod.selectionDeadline) {
      dates[1] = currentPeriod.selectionDeadline;
    }
    if (dates[0] && dates[1]) {
      return dates;
    }
  }
  return dates;
}

function findInitDates(initDiffs: {
  [key: string]: IMupDiff;
}): [string, string] {
  const dates: [string, string] = ["", ""];
  for (let mupId of Object.keys(initDiffs)) {
    const newDates = getDatesOfMupDiff(initDiffs[mupId]);
    if (newDates[0] && newDates[1]) {
      return newDates;
    }
  }
  return dates;
}

function findModuleSelection(
  semesterName: string,
  ze: number,
  moduleData: IModuleData
) {
  let semesterNumbers: number[] = [5, 7];
  if (semesterName !== "Осенний") {
    semesterNumbers = [6, 8];
  }
  const res: IModuleSelection[] = [];
  for (const moduleId in moduleData.data) {
    const module = moduleData.data[moduleId];
    for (const course of semesterNumbers) {
      if (
        module.name.toLocaleLowerCase().includes(`специальные курсы ${course}`)
      ) {
        const moduleSelection: IModuleSelection = {
          id: module.id,
          selected: module.disciplines
            .filter((d) => d.ze === ze)
            .map((d) => d.id),
        };
        if (moduleSelection.selected.length > 0) {
          res.push(moduleSelection);
        }
      }
    }
  }
  return res;
}

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function MupEditor(props: IMupEditorProps) {
  const [mupEdits, setMupEdits] = useState<{ [key: string]: IMupEdit }>({});
  const [mupDiffs, setMupDiffs] = useState<{ [key: string]: IMupDiff }>({});
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [mupEditorActions, setMupEditorActions] = useState<ITSAction[]>([]);
  const [mupEditorActionResults, setMupEditorActionResults] = useState<
    IActionExecutionLogItem[]
  >([]);
  const [zeToModuleSelection, setZeToModuleSelection] = useState<{
    [key: number]: IModuleSelection[];
  }>({});
  const [ensureInProgress, setEnsureInProgress] = useState<boolean>(false);
  const currentEnsurePromise = useRef<Promise<any> | null>(null);
  const [executingActionsInProgress, setExecutingActionsInProgress] =
    useState<boolean>(false);

  const context = useContext(ITSContext)!;

  const handleDateChanged = (dates: [string, string]) => {
    if (dates.length !== 2) return;
    if (dates[0] === startDate && dates[1] === endDate) return;

    if (dates[0] !== startDate) setStartDate(dates[0]);
    if (dates[1] !== endDate) setEndDate(dates[1]);

    const newMupDiffs = { ...mupDiffs };
    for (let mupId in newMupDiffs) {
      updateMupDiffDateInfo(newMupDiffs[mupId], dates);
    }
    setMupDiffs(newMupDiffs);
    generateActionsDebounced(newMupDiffs, mupEdits, dates, zeToModuleSelection);
  };

  const onStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateFormatted = event.target.value;
    handleDateChanged([dateFormatted, endDate]);
  };

  const onEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateFormatted = event.target.value;
    handleDateChanged([startDate, dateFormatted]);
  };

  const createInitDiffsAndDates = (
    selectedMupIdsSet: Set<string>,
    zeToModuleSelections: { [key: number]: IModuleSelection[] }
  ) => {
    console.log("createInitDiffsAndDates: zeToModuleSelections");
    console.log(zeToModuleSelections);
    const repo = context.dataRepository;
    const newMupEdits: { [key: string]: IMupEdit } = {};
    const newMupDiffs: { [key: string]: IMupDiff } = {};
    repo.mupData.ids.forEach((mupId) => {
      const selected = selectedMupIdsSet.has(mupId);
      let limit = 0;
      let mupDiff: IMupDiff | null = null;
      if (selected) {
        mupDiff = createDiffForMup(
          mupId,
          props.selectionGroupIds,
          [startDate, endDate],
          zeToModuleSelections,
          repo.mupData,
          repo.selectionGroupToMupsData,
          repo.selectionGroupData,
          repo.mupToPeriods,
          context.dataRepository
            .selectionGroupModuleIdToSelectedModuleDisciplines
        );
        newMupDiffs[mupId] = mupDiff;
        for (let initLimit of mupDiff.initLimits) {
          if (initLimit && initLimit > 0) {
            limit = initLimit;
          }
        }
      }

      const mupEdit: IMupEdit = {
        selected: selected,
        limit: limit,
        messages: [],
      };

      newMupEdits[mupId] = mupEdit;
    });

    const initDates = findInitDates(newMupDiffs);
    if (initDates[0] || initDates[1]) {
      for (let mupId in newMupDiffs) {
        updateMupDiffDateInfo(newMupDiffs[mupId], initDates);
      }
    }
    return { newMupDiffs, newMupEdits, initDates };
  };

  const setUpDiffsAndDates = (
    newMupDiffs: { [key: string]: IMupDiff },
    newMupEdits: { [key: string]: IMupEdit },
    newDates: [string, string]
  ) => {
    newDates[0] && setStartDate(newDates[0]);
    newDates[1] && setEndDate(newDates[1]);

    setMupDiffs(newMupDiffs);
    setMupEdits(newMupEdits);
  };

  const ensureData = (mupIds: string[], refresh: boolean) => {
    // console.log(`ensureData mupIds: ${mupIds.length} refresh: ${refresh}`);
    if (currentEnsurePromise.current !== null) {
      // console.log("refreshInProgress is already in progress");
      return currentEnsurePromise.current;
    }
    setEnsureInProgress(true);

    const repo = context.dataRepository;
    const updateSelectionGroupPromise = () =>
      !refresh && repo.CheckSelectionGroupDataPresent(props.selectionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSelectionGroupData();
    const updateMupDataPromise = () =>
      !refresh && repo.mupData.ids.length !== 0
        ? Promise.resolve()
        : repo.UpdateMupData();
    const updateSelectionGroupToMupDataPromise = () =>
      !refresh &&
      repo.CheckSelectionGroupToMupDataPresent(props.selectionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSelectionGroupToMupsData(props.selectionGroupIds);
    const updatePeriodsPromise = () =>
      !refresh && repo.CheckPeriodDataPresent(mupIds)
        ? Promise.resolve()
        : repo.UpdatePeriods(mupIds);
    const updateSubgroupsPromise = () => {
      const competitionGroupIds: number[] = [];
      props.selectionGroupIds.forEach((sgId) => {
        const cgId =
          context.dataRepository.selectionGroupData.data[sgId]
            .competitionGroupId;
        if (cgId !== null && cgId !== undefined) {
          competitionGroupIds.push(cgId);
        }
      });
      const updateSubgroupsAction =
        !refresh && repo.CheckSubgroupPresent(competitionGroupIds)
          ? Promise.resolve()
          : context.dataRepository.UpdateSubgroups(competitionGroupIds);
      return updateSubgroupsAction;
    };

    const createUpdateModuleAndSelectionGroupMupModuleDisciplinesPromise =
      () => {
        const allConnectionIds: number[] = [];
        for (const selectionGroupId of props.selectionGroupIds) {
          allConnectionIds.push(
            ...Object.values(
              context.dataRepository.selectionGroupToMupsData.data[
                selectionGroupId
              ].data
            ).map((m) => m.connectionId)
          );
        }
        if (allConnectionIds.length === 0)
          return Promise.allSettled([Promise.resolve(), Promise.resolve()]);
        const updateModuleDataPromise =
          !refresh && repo.CheckModuleDataPresent()
            ? Promise.resolve()
            : repo.UpdateModuleData(allConnectionIds[0]);
        const updateSelectionGroupMupModuleDisciplinesPromise =
          !refresh &&
          repo.CheckSelectionGroupMupModuleDisciplinesPresent(allConnectionIds)
            ? Promise.resolve()
            : repo.UpdateSelectionGroupMupModuleDisciplines(allConnectionIds);

        return Promise.allSettled([
          updateModuleDataPromise,
          updateSelectionGroupMupModuleDisciplinesPromise,
        ]);
      };

    const ensureDataPromise = Promise.allSettled([
      updateSelectionGroupPromise().then(() => updateSubgroupsPromise()), // update selectionGrousp then subgroups
      updateMupDataPromise(),
      updateSelectionGroupToMupDataPromise(),
      updatePeriodsPromise(),
    ])
      .then(() =>
        createUpdateModuleAndSelectionGroupMupModuleDisciplinesPromise()
      )
      .finally(() => {
        currentEnsurePromise.current = null;
        setEnsureInProgress(false);
      });
    // .catch((err) => {
    //   currentEnsurePromise.current = null;
    //   setEnsureInProgress(false);
    //   if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
    //     props.onUnauthorized();
    //     return;
    //   }
    //   throw err;
    // });
    currentEnsurePromise.current = ensureDataPromise;
    return ensureDataPromise;
  };

  const prepareData = (mupIds: Set<string>) => {
    // console.log("prepareData");
    const newZeToModuleSelection = findReferenceModules();
    const { newMupDiffs, newMupEdits, initDates } = createInitDiffsAndDates(
      mupIds,
      newZeToModuleSelection
    );
    setZeToModuleSelection(newZeToModuleSelection);
    setUpDiffsAndDates(newMupDiffs, newMupEdits, initDates);
    generateActionsDebounced(
      newMupDiffs,
      newMupEdits,
      initDates,
      newZeToModuleSelection
    );
  };

  useEffect(() => {
    return () => {
      // console.warn("MupEditor UNMOUNTED");
    };
  }, []);

  useEffect(() => {
    const repo = context.dataRepository;
    const updateSelectionGroupToMupDataPromise = () =>
      repo.CheckSelectionGroupToMupDataPresent(props.selectionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSelectionGroupToMupsData(props.selectionGroupIds);

    updateSelectionGroupToMupDataPromise()
      .then(() => {
        let mupIdUnionArr: string[][] = [];
        for (let sgId of props.selectionGroupIds) {
          mupIdUnionArr.push(
            context.dataRepository.selectionGroupToMupsData.data[sgId].ids
          );
        }
        const mupIdUnion = new Set(mupIdUnionArr.flat());

        return ensureData(Array.from(mupIdUnion), false).then(() => mupIdUnion);
      })
      .then((mupIdUnion) => {
        prepareData(mupIdUnion);
      })
      .finally(() => props.onLoad());
    // eslint-disable-next-line
  }, [props.selectionGroupIds]);

  const ensurePeriodAndModulesForMup = (mupId: string) => {
    const repo = context.dataRepository;
    const mupIds = [mupId];
    const periodPromise = repo.CheckPeriodDataPresent(mupIds)
      ? Promise.resolve()
      : repo.UpdatePeriods(mupIds);
    const connectionIds: number[] = [];
    for (const sgId of props.selectionGroupIds) {
      const selectionGroupMups = repo.selectionGroupToMupsData.data[sgId];
      if (selectionGroupMups.data.hasOwnProperty(mupId)) {
        connectionIds.push(selectionGroupMups.data[mupId].connectionId);
      }
    }
    const modulePromise =
      connectionIds.length === 0 ||
      repo.CheckSelectionGroupMupModuleDisciplinesPresent(connectionIds)
        ? Promise.resolve()
        : repo.UpdateSelectionGroupMupModuleDisciplines(connectionIds);
    return Promise.allSettled([periodPromise, modulePromise]);
  };

  const handleMupToggle = (mupId: string) => {
    console.log("handleMupToggle: zeToModuleSelection");
    console.log(zeToModuleSelection);
    // console.log(`handleMupToggle: ${mupId}`);
    let newDates: [string, string] = ["", ""];
    let newDiff: IMupDiff | null = null;
    let useNewDates = false;
    const repo = context.dataRepository;
    ensurePeriodAndModulesForMup(mupId).then(() => {
      let mupDiffsToCompareWith = mupDiffs;
      if (!mupDiffs.hasOwnProperty(mupId) || !mupDiffs[mupId]) {
        newDiff = createDiffForMup(
          mupId,
          props.selectionGroupIds,
          [startDate, endDate],
          zeToModuleSelection,
          repo.mupData,
          repo.selectionGroupToMupsData,
          repo.selectionGroupData,
          repo.mupToPeriods,
          repo.selectionGroupModuleIdToSelectedModuleDisciplines
        );
        // const newMupDiffs = { ...mupDiffs, [mupId]: newInitDiff };

        // // FIXME: need to split large functions
        if (!startDate && !endDate && !newDates[0] && !newDates[1]) {
          useNewDates = true;
          const datesFromNewMup = getDatesOfMupDiff(newDiff);
          if (datesFromNewMup[0] || datesFromNewMup[1]) {
            newDates = datesFromNewMup;
          }
        }

        // mupDiffsToCompareWith = newMupDiffs;
        // setMupDiffs(newMupDiffs);
      }

      mupDiffsToCompareWith = mupDiffs;

      if (newDiff) {
        mupDiffsToCompareWith = { ...mupDiffs, [mupId]: newDiff };

        if (useNewDates) {
          setStartDate(newDates[0]);
          setEndDate(newDates[1]);
          for (let mupId in mupDiffsToCompareWith) {
            updateMupDiffDateInfo(mupDiffsToCompareWith[mupId], newDates);
          }
        }

        setMupDiffs(mupDiffsToCompareWith);
      }

      const newMupEdits = { ...mupEdits };
      newMupEdits[mupId].selected = !newMupEdits[mupId].selected;

      setMupEdits(newMupEdits);

      // FIXME
      const datesToCompareWith: [string, string] = useNewDates
        ? newDates
        : [startDate, endDate];

      generateActionsDebounced(
        mupDiffsToCompareWith,
        newMupEdits,
        datesToCompareWith,
        zeToModuleSelection
      );
    });
  };

  const handleMupLimitChange = (mupId: string, newLimit: number) => {
    const newEdits = {
      ...mupEdits,
      [mupId]: { ...mupEdits[mupId], limit: newLimit },
    };
    setMupEdits(newEdits);
    generateActionsDebounced(
      mupDiffs,
      newEdits,
      [startDate, endDate],
      zeToModuleSelection
    );
  };

  const findReferenceModules = () => {
    let semesterName: string = "Осенний";
    for (const sgId of props.selectionGroupIds) {
      if (context.dataRepository.selectionGroupData.data.hasOwnProperty(sgId)) {
        semesterName =
          context.dataRepository.selectionGroupData.data[sgId].semesterName;
        break;
      }
    }
    const zes = new Set<number>();
    for (const mupId in context.dataRepository.mupData.data) {
      zes.add(context.dataRepository.mupData.data[mupId].ze);
    }
    const newZeToModuleSelection: { [key: number]: IModuleSelection[] } = {};
    for (const ze of Array.from(zes)) {
      const moduleSelection = findModuleSelection(
        semesterName,
        ze,
        context.dataRepository.moduleData
      );
      newZeToModuleSelection[ze] = moduleSelection;
    }
    // console.log("newZeToModuleSelection");
    // console.log(newZeToModuleSelection);

    return newZeToModuleSelection;
  };

  const handleRefresh = () => {
    // console.log("handleRefresh");
    let mupIdsToRefresh: string[] = Object.keys(mupDiffs);
    let selectedMupIds: Set<string> = new Set<string>();
    for (let mupId of mupIdsToRefresh) {
      if (mupEdits[mupId].selected || !mupDiffs[mupId].canBeDeleted) {
        selectedMupIds.add(mupId);
      }
    }
    return ensureData(mupIdsToRefresh, true).then(() =>
      prepareData(selectedMupIds)
    );
  };

  const handleRefreshDebounced = () => {
    debouncedWrapperForApply(handleRefresh);
  };

  const generateActions = (
    mupDiffs: { [key: string]: IMupDiff },
    mupEdits: { [key: string]: IMupEdit },
    newDates: [string, string],
    zeToModuleSelections: { [key: number]: IModuleSelection[] }
  ) => {
    const selectedMupIds: string[] = [];
    const mupLimits: { [key: string]: number } = {};
    for (let mupId of Object.keys(mupEdits)) {
      if (
        mupEdits[mupId].selected ||
        (mupDiffs.hasOwnProperty(mupId) && !mupDiffs[mupId].canBeDeleted)
      ) {
        mupLimits[mupId] = mupEdits[mupId].limit;
        selectedMupIds.push(mupId);
      }
    }
    // console.log("mupLimits");
    // console.log(mupLimits);

    const actions = createActions(
      props.selectionGroupIds,
      selectedMupIds,
      mupDiffs,
      newDates,
      mupLimits,
      zeToModuleSelections,
      context
    );

    if (checkAllRefreshAction(actions)) {
      return [];
    }

    return actions;
  };

  const setUpMupMessagesByActions = (
    mupDiffs: { [key: string]: IMupDiff },
    mupEdits: { [key: string]: IMupEdit },
    actions: ITSAction[]
  ) => {
    const mupToActions = getMupActions(actions);

    let selectedMups: Set<string> | null = null;
    for (const action of actions) {
      if (action.actionType === ActionType.UpdateSelectionGroup) {
        const updateSelectionGroupAction = action as UpdateSelectionGroupAction;
        selectedMups = new Set<string>(updateSelectionGroupAction.mupIds);
        break;
      }
    }
    const newMupEdits = { ...mupEdits };

    for (const mupId in mupEdits) {
      newMupEdits[mupId].messages = [];

      if (mupDiffs.hasOwnProperty(mupId)) {
        if (selectedMups) {
          const isSelected = selectedMups.has(mupId);
          if (isSelected && mupDiffs[mupId].presentInGroups.length !== 2) {
            newMupEdits[mupId].messages.push("Добавить МУП в группы");
          } else if (
            !isSelected &&
            mupDiffs[mupId].presentInGroups.length > 0
          ) {
            newMupEdits[mupId].messages.push(
              "Удалить созданные подгруппы и удалить МУП из групп"
            );
          }

          if (isSelected && mupDiffs[mupId].someLoads.length === 0) {
            newMupEdits[mupId].addLoadsManual = true;
          }
        }

        if (!newMupEdits[mupId].selected && !mupDiffs[mupId].canBeDeleted) {
          newMupEdits[mupId].messages.push(
            "Нельзя удалить МУП, так как период выбора уже начался, установите Лимит в 0 и оповестите студентов"
          );
        }
      }
    }

    for (const mupId in mupToActions) {
      newMupEdits[mupId].messages.push(
        ...mupToActions[mupId].map((a) => a.getMessageSimple())
      );
    }

    setMupEdits(newMupEdits);
  };

  const generateActionsDebounced = (
    mupDiffs: { [key: string]: IMupDiff },
    mupEdits: { [key: string]: IMupEdit },
    newDates: [string, string],
    zeToModuleSelections: { [key: number]: IModuleSelection[] }
  ) => {
    // console.log("Debounce handleApply");
    debouncedWrapperForApply(() => {
      const actions = generateActions(
        mupDiffs,
        mupEdits,
        newDates,
        zeToModuleSelections
      );

      setUpMupMessagesByActions(mupDiffs, mupEdits, actions);
      setMupEditorActions(actions);
    });
  };

  const handleApplyReal = () => {
    setExecutingActionsInProgress(true);
    executeActions(mupEditorActions, context)
      .then((results) => setMupEditorActionResults(results))
      .then(() => alert("Применение изменений завершено"))
      .then(() => handleRefresh()) // refresh
      .finally(() => {
        setExecutingActionsInProgress(false);
        props.onApplyFinish();
      });
    // .catch((err) => {
    //   setExecutingActionsInProgress(false);
    //   if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
    //     props.onUnauthorized();
    //     return;
    //   }
    //   throw err;
    // });
  };

  const handleApplyRealDebounced = () => {
    // console.log("Debounce handleApplyRealDebounced");

    debouncedWrapperForApply(() => handleApplyReal());
  };

  const renderTable = () => {
    return (
      <div className="load_content_container">
        <MupsList
          mupData={context.dataRepository.mupData}
          mupEdits={mupEdits}
          onMupToggle={handleMupToggle}
          onMupLimitChange={handleMupLimitChange}
        />
        {ensureInProgress && <div className="progress_screen"></div>}
        {ensureInProgress && (
          <CircularProgress className="progress_icon" size="8rem" />
        )}
      </div>
    );
  };

  return props.selectionGroupIds.length !== 2 ? null : (
    <section className="step__container">
      <article>
        <h4>
          Выберите даты, в которые откроется выбор дисциплин в личном кабинете
          стедентов
        </h4>
        <div className={style.mups__period}>
          <label>
            Старт выбора
            <input
              className={style.period__input}
              type="date"
              value={startDate}
              onChange={onStartDateChange}
            />
          </label>
          <label>
            Завершение выбора
            <input
              className={style.period__input}
              type="date"
              value={endDate}
              onChange={onEndDateChange}
            />
          </label>
        </div>

        <h4>Выберите МУПы и Лимиты на количество зачисленных студентов</h4>

        <RefreshButton
          onClick={handleRefreshDebounced}
          title="Обновить список"
          loading={ensureInProgress}
        />

        {renderTable()}

        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={mupEditorActions}
          actionResults={mupEditorActionResults}
          onNextStep={props.onNextStep}
          onApply={handleApplyRealDebounced}
          loading={executingActionsInProgress}
        >
          Применить изменения
        </ApplyButtonWithActionDisplay>
      </article>
    </section>
  );
}
