import React, { useState, useEffect, useContext } from "react";
import { MupsList } from "../../MupsList";
import style from "./MupEditor.module.css";
import { IMupEditorProps } from "./types";
import { IMupEdit, IMupDiff } from "../../../common/types";

import {
  DEBOUNCE_MS,
  REQUEST_ERROR_UNAUTHORIZED,
} from "../../../utils/constants";

import {
  createDiffForMup,
  updateMupDiffDateInfo,
} from "../../../mupUpdater/mupDifference";

import { ITSContext } from "../../../common/Context";

import { ActionType, ITSAction, executeActions, checkAllRefreshAction } from "../../../common/actions";
import {
  createActions,
  getMupActions,
} from "../../../mupUpdater/actionCreater";
import { UpdateSelectionGroupAction } from "../../../mupUpdater/actions";
import { createDebouncedWrapper } from "../../../utils/helpers";
import { IActionExecutionLogItem } from "../../../common/actions";

import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";

import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
// Получение данных:
// Запросить все Группы выбора
// Запросить МУПы с Лимитами для выбранных Групп выбора
// Найти объединение выбранных МУПов из Групп выбора
// Запросить все Периоды для МУПов из объединения
// Отобрать периоды с годом и типом семестра (весна/осень) таким же как и в первой из выбранных групп выбора (для определения дат)
// Понадобится любой период с заполненными нагрузками, чтобы скопировать нагрузки
// Вставить дату из первого попавшегося периода
// Определить МУПы с пустыми нагрузками (Tmers)
// Определить какие МУПы есть только в одной из групп
// Определить какие МУПы не имеют подходящего периода
// Проверить, есть ли отличия дат среди выбранных периодов

// Ошибки:
// Нет МУПа в группе -> Добавить МУП в группу ("Примените изменения")
// Лимит не совпадает -> Установить нужный Лимит ("Примените изменения")
// Подходящего периода нет -> создать период с датами и (если есть) вставить нагрузки из любого другого периода ("Примените изменения")
// Нет другого периода с заполненными нагрузками -> дать ссылку на ИТС для заполнения нагрузки, созданному периоду (ссылка)
// Даты (начала/конца выбора) не совпадают -> изменить даты в отобранных периодах ("Примените изменения")

// По кнопке "Применить изменения":
// 1) Добавление МУПов в группы
// 2) Обновление Лимитов
// 3) Создание нужных периодов
// 4) Обновление дат в периодах
const findInitDates = (initDiffs: {
  [key: string]: IMupDiff;
}): [string, string] => {
  const dates: [string, string] = ["", ""];
  for (let mupId of Object.keys(initDiffs)) {
    for (let currentPeriod of Object.values(
      initDiffs[mupId].courseToCurrentPeriod
    )) {
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
  }
  return dates;
};

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

  const context = useContext(ITSContext)!;

  const onStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateFormatted = event.target.value;

    const newMupDiffs = { ...mupDiffs };
    for (let mupId in newMupDiffs) {
      updateMupDiffDateInfo(newMupDiffs[mupId], [dateFormatted, endDate]);
    }
    setMupDiffs(newMupDiffs);

    setStartDate(dateFormatted);
    // console.log(`new start date: ${dateFormatted}`);
    callDebouncedApply(newMupDiffs, mupEdits, [dateFormatted, endDate]);
  };

  const onEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateFormatted = event.target.value;

    const newMupDiffs = { ...mupDiffs };
    for (let mupId in newMupDiffs) {
      updateMupDiffDateInfo(newMupDiffs[mupId], [startDate, dateFormatted]);
    }
    setMupDiffs(newMupDiffs);

    setEndDate(dateFormatted);
    // console.log(`new end date: ${dateFormatted}`);
    callDebouncedApply(newMupDiffs, mupEdits, [startDate, dateFormatted]);
  };

  const createInitDiffsAndDates = (selectedMupIdsSet: Set<string>) => {
    const newMupEdits: { [key: string]: IMupEdit } = {};
    const newMupDiffs: { [key: string]: IMupDiff } = {};
    context.dataRepository.mupData.ids.forEach((mupId) => {
      const selected = selectedMupIdsSet.has(mupId);
      let limit = 0;
      let mupDiff: IMupDiff | null = null;
      if (selected) {
        mupDiff = createDiffForMup(
          mupId,
          props.selectionGroupIds,
          [startDate, endDate],
          context.dataRepository.selectionGroupToMupsData,
          context.dataRepository.selectionGroupData,
          context.dataRepository.mupToPeriods
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

      if (mupDiff) {
        console.log("initMupDiff");
        console.log(mupDiff);
      }

      newMupEdits[mupId] = mupEdit;
    });

    const initDates = findInitDates(newMupDiffs);
    if (initDates[0] || initDates[1]) {
      for (let mupId in newMupDiffs) {
        updateMupDiffDateInfo(newMupDiffs[mupId], initDates);
      }
    }
    // initDates[0] && setStartDate(initDates[0]);
    // initDates[1] && setEndDate(initDates[1]);

    // setMupDiffs(newMupDiffs);
    // setMupEdits(newMupEdits);

    const res: [
      { [key: string]: IMupDiff },
      { [key: string]: IMupEdit },
      [string, string]
    ] = [newMupDiffs, newMupEdits, initDates];
    return res;
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

  useEffect(() => {
    if (!props.dataIsPrepared) return;

    let mupIdUnionArr: string[][] = [];
    for (let sgId of props.selectionGroupIds) {
      mupIdUnionArr.push(
        context.dataRepository.selectionGroupToMupsData.data[sgId].ids
      );
    }
    const mupIdUnion = new Set(mupIdUnionArr.flat());
    const [newMupDiffs, newMupEdits, initDates] =
      createInitDiffsAndDates(mupIdUnion);

    setUpDiffsAndDates(newMupDiffs, newMupEdits, initDates);
    // initDates[0] && setStartDate(initDates[0]);
    // initDates[1] && setEndDate(initDates[1]);

    // setMupDiffs(newMupDiffs);
    // setMupEdits(newMupEdits);
    callDebouncedApply(newMupDiffs, newMupEdits, initDates);
  }, [props.dataIsPrepared, props.selectionGroupIds]);

  const handleMupToggle = (mupId: string) => {
    context.dataRepository
      .EnsurePeriodInfoFor(mupId)
      .then(() => {
        let mupDiffsToCompareWith = mupDiffs;
        if (!mupDiffs.hasOwnProperty(mupId) || !mupDiffs[mupId]) {
          const newInitDiff = createDiffForMup(
            mupId,
            props.selectionGroupIds,
            [startDate, endDate],
            context.dataRepository.selectionGroupToMupsData,
            context.dataRepository.selectionGroupData,
            context.dataRepository.mupToPeriods
          );
          const newMupDiffs = { ...mupDiffs, [mupId]: newInitDiff };
          mupDiffsToCompareWith = newMupDiffs;
          console.log("newInitDiff");
          console.log(newInitDiff);
          setMupDiffs(newMupDiffs);
        }

        const newMupEdits = { ...mupEdits };
        newMupEdits[mupId].selected = !newMupEdits[mupId].selected;

        setMupEdits(newMupEdits);
        const res: [{ [key: string]: IMupDiff }, { [x: string]: IMupEdit }] = [
          mupDiffsToCompareWith,
          newMupEdits,
        ];
        return res;
      })
      .then((mupDiffsAndEdits) => {
        callDebouncedApply(mupDiffsAndEdits[0], mupDiffsAndEdits[1], [
          startDate,
          endDate,
        ]);
      });
  };

  const handleMupLimitChange = (mupId: string, newLimit: number) => {
    const newEdits = {
      ...mupEdits,
      [mupId]: { ...mupEdits[mupId], limit: newLimit },
    };
    setMupEdits(newEdits);
    callDebouncedApply(mupDiffs, newEdits, [startDate, endDate]);
  };

  const handleRefresh = () => {
    let mupIdsToRefresh: string[] = Object.keys(mupDiffs);
    let selectedMupIds: Set<string> = new Set<string>();
    for (let mupId of mupIdsToRefresh) {
      if (mupEdits[mupId].selected || !mupDiffs[mupId].canBeDeleted) {
        selectedMupIds.add(mupId);
      }
    }
    const updateSelectionGroupsThenSubgroupsPromise = context.dataRepository
      .UpdateSelectionGroupData()
      .then(() => {
        const competitionGroupIds: number[] = [];
        props.selectionGroupIds.forEach((sgId) => {
          const cgId =
            context.dataRepository.selectionGroupData.data[sgId]
              .competitionGroupId;
          if (cgId !== null && cgId !== undefined) {
            competitionGroupIds.push(cgId);
          }
        });
        return context.dataRepository.UpdateSubgroups(competitionGroupIds);
      });
    return Promise.all([
      updateSelectionGroupsThenSubgroupsPromise,
      context.dataRepository.UpdateMupData(),
      context.dataRepository.UpdateSelectionGroupToMupsData(
        props.selectionGroupIds
      ),
      context.dataRepository.UpdatePeriods(mupIdsToRefresh),
    ])
      .then(() => createInitDiffsAndDates(selectedMupIds))
      .then(([newMupDiffs, newMupEdits, initDates]) => {
        setUpDiffsAndDates(newMupDiffs, newMupEdits, initDates);
        callDebouncedApply(newMupDiffs, newMupEdits, initDates);
      })
      .catch((err) => {
        if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
          props.onUnauthorized();
          return;
        }
        throw err;
      });
  };

  const handleRefreshDebounced = () => {
    debouncedWrapperForApply(handleRefresh);
  };

  const generateActions = (
    mupDiffs: { [key: string]: IMupDiff },
    mupEdits: { [key: string]: IMupEdit },
    newDates: [string, string]
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

    const actions = createActions(
      props.selectionGroupIds,
      selectedMupIds,
      mupDiffs,
      newDates,
      mupLimits,
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

      if (selectedMups && mupDiffs.hasOwnProperty(mupId)) {
        const isSelected = selectedMups.has(mupId);
        if (isSelected && mupDiffs[mupId].presentInGroups.length !== 2) {
          newMupEdits[mupId].messages.push("Добавить МУП в группы");
        } else if (!isSelected && mupDiffs[mupId].presentInGroups.length > 0) {
          newMupEdits[mupId].messages.push("Удалить МУП из групп");
        }
        if (isSelected && mupDiffs[mupId].someLoads.length === 0) {
          newMupEdits[mupId].addLoadsManual = true;
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

  const callDebouncedApply = (
    mupDiffs: { [key: string]: IMupDiff },
    mupEdits: { [key: string]: IMupEdit },
    newDates: [string, string]
  ) => {
    console.log("Debounce handleApply");
    debouncedWrapperForApply(() => {
      const actions = generateActions(mupDiffs, mupEdits, newDates);

      setUpMupMessagesByActions(mupDiffs, mupEdits, actions);
      setMupEditorActions(actions);
    });
  };

  const handleApplyReal = () => {
    executeActions(mupEditorActions, context)
      .then((results) => setMupEditorActionResults(results))
      .then(() => alert("Применение изменений завершено"))
      .then(() => handleRefresh()) // refresh
      .catch((err) => {
        if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
          props.onUnauthorized();
          return;
        }
        throw err;
      });
  };

  const handleApplyRealDebounced = () => {
    console.log("Debounce handleApplyRealDebounced");

    debouncedWrapperForApply(() => handleApplyReal());
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

        <h4>Выберите МУПы и лимиты на количество зачисленных студентов</h4>

        <Button
          onClick={handleRefreshDebounced}
          style={{ fontSize: 12, marginBottom: "1em" }}
          variant="text"
          startIcon={<RefreshIcon />}
        >
          Обновить список
        </Button>
        <MupsList
          mupData={context.dataRepository.mupData}
          mupEdits={mupEdits}
          onMupToggle={handleMupToggle}
          onMupLimitChange={handleMupLimitChange}
        />

        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={mupEditorActions}
          actionResults={mupEditorActionResults}
          onNextStep={props.onNextStep}
          onApply={handleApplyRealDebounced}
        />
      </article>
    </section>
  );
}
