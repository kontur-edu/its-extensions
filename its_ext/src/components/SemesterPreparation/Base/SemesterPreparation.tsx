import React, { useState, useEffect, useRef, useContext } from "react";
import { MupEditor } from "../MupEditor";
import { ISelectionListItem } from "../../SelectionList/types";
import style from "./SemesterPreparation.module.css";
import { ISemesterPreparationProps } from "./types";
import {
  DEBOUNCE_MS,
  REQUEST_ERROR_UNAUTHORIZED,
} from "../../../utils/constants";

import { GroupSelect } from "../GroupSelect/GroupSelect";
import { unionArrays } from "../../../utils/helpers";
import { ITSContext } from "../../../common/Context";
import { SubgroupSelection } from "../SubgroupSelection";
import { useNavigate } from "react-router-dom";

import { Button } from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import WestIcon from "@mui/icons-material/West";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
// import { CreateDebouncedWrapper } from "../../../utils/helpers";

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

// unionMupIds -> mupdsUpdate (request limit);
// mupId -> limit
// AllMups if (limit > 0) new
// mupsUpdate {ids: [], data: {id: {id, limit}}}

export function SemesterPreparation(props: ISemesterPreparationProps) {
  // TODO: вынести в отдельный компонент
  const [selectionGroupsListItems, setSelectionGroupsListItems] = useState<
    ISelectionListItem[]
  >([]);
  const [selectionGroupsIds, setSelectionGroupsIds] = useState<number[]>([]);
  const [editorDataPrepared, setEditorDataPrepared] = useState<boolean>(false);
  const requestSelectionGroupsInProgress = useRef(false);

  const stepTwoRef = useRef<HTMLElement | null>(null);
  const stepThreeRef = useRef<HTMLElement | null>(null);
  const context = useContext(ITSContext)!;

  const navigate = useNavigate();

  const handleBackButton = () => {
    navigate("/");
  };

  const refreshSelectionGroups = () => {
    if (props.isUnauthorized) {
      return;
    }
    if (!requestSelectionGroupsInProgress.current) {
      requestSelectionGroupsInProgress.current = true;
      context.dataRepository
        .UpdateSelectionGroupData()
        .then(() => {
          requestSelectionGroupsInProgress.current = false;
          setSelectionGroupsListItems(
            context.dataRepository.selectionGroupData.ids.map((sgId) => {
              return {
                id: sgId,
                name: context.dataRepository.selectionGroupData.data[sgId].name,
              };
            })
          );
        })
        .catch((err) => {
          requestSelectionGroupsInProgress.current = false;
          if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
            props.onUnauthorized();
            return;
          }
          throw err;
        });
    }
  };

  const refreshSelectionGroupMups = async (ids: number[]) => {
    console.log(`refreshSelectionGroupMups`);
    console.log(ids);
    await context.dataRepository.UpdateSelectionGroupToMupsData(ids);
    let newChosenMups: string[] = [];
    if (ids.length === 2) {
      const firstSGId = ids[0];
      const secondSGId = ids[1];
      if (
        context.dataRepository.selectionGroupToMupsData.data.hasOwnProperty(
          firstSGId
        ) &&
        context.dataRepository.selectionGroupToMupsData.data.hasOwnProperty(
          secondSGId
        )
      ) {
        newChosenMups = unionArrays(
          context.dataRepository.selectionGroupToMupsData.data[firstSGId].ids,
          context.dataRepository.selectionGroupToMupsData.data[secondSGId].ids
        );
      } else {
        throw Error("ERROR: Data for chosen SelectionGroups is absent!!!");
      }
    }
    return newChosenMups;
  };

  const refreshMupData = async () => {
    console.log(`refreshMupData`);
    await context.dataRepository.UpdateMupData();
  };

  const refreshPeriods = async (mupIds: string[]) => {
    console.log(`refreshPeriods`);
    console.log(mupIds);
    await context.dataRepository.UpdatePeriods(mupIds);
  };

  const refreshSubgroupMetasAndSubgroups = async (
    selectionGroupIds: number[]
  ) => {
    console.log(`refreshSubgroupMetasAndSubgroups`);
    const competitionGroupIds: number[] = [];
    for (let selectionGroupId of selectionGroupIds) {
      const selectionGroup =
        context.dataRepository.selectionGroupData.data[selectionGroupId];
      const competitionGroupId = selectionGroup.competitionGroupId;
      if (competitionGroupId !== null && competitionGroupId !== undefined) {
        competitionGroupIds.push(competitionGroupId);
      }
    }
    return Promise.allSettled([
      context.dataRepository.UpdateSubgroupMetas(competitionGroupIds),
      context.dataRepository.UpdateSubgroups(competitionGroupIds),
    ]);
  };

  const prepareDataForSelectionGroups = async (selectionGroupIds: number[]) => {
    const ensureMupDataPromise =
      context.dataRepository.mupData.ids.length === 0
        ? refreshMupData()
        : Promise.resolve();
    const refreshGroupMupsThenPeriodsPromise = refreshSelectionGroupMups(
      selectionGroupIds
    ).then((mupIds) => refreshPeriods(mupIds));
    const refreshSubgroupMetasAndSubgroupsPromise =
      refreshSubgroupMetasAndSubgroups(selectionGroupIds);
    return Promise.all([
      ensureMupDataPromise,
      refreshGroupMupsThenPeriodsPromise,
      refreshSubgroupMetasAndSubgroupsPromise,
    ]);
  };

  // selectionGroupMups, SubgroupGroupMetas, Subgroups
  const handleSelectionGroupValid = (selectionGroupIds: number[]) => {
    setEditorDataPrepared(false);
    console.log("handleSelectionGroupValid");
    // remember chosen selectionGroup ids
    setSelectionGroupsIds(selectionGroupIds);
    // request mups for chosen selectionGroups
    // find union of mupIds in chosen selectionGroups
    // const groupMupsRefreshPromise = refreshSelectionGroupMups(selectionGroupIds);
    prepareDataForSelectionGroups(selectionGroupIds)
      .then(() => setEditorDataPrepared(true))
      .catch((err) => {
        if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
          props.onUnauthorized();
          return;
        }
        throw err;
      });
  };

  const handleGroupSelectButton = () => {
    stepTwoRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleMupEditorNextStepButton = () => {
    stepThreeRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    refreshSelectionGroups();
    return () => {};
  }, [props.isUnauthorized]);

  const renderStep2 = () => {
    // console.log("mupEditorActionResults");
    // console.log(mupEditorActionResults);
    return (
      <article className="step" ref={stepTwoRef}>
        <h3 className="step__header">2. Лимиты МУПов и даты выбора</h3>

        <MupEditor
          selectionGroupIds={selectionGroupsIds}
          dataIsPrepared={editorDataPrepared}
          onNextStep={handleMupEditorNextStepButton}
          onUnauthorized={props.onUnauthorized}
        />
      </article>
    );
  };

  const renderStep3 = () => {
    return (
      <article className="step" ref={stepThreeRef}>
        <h3 className="step__header">
          3. Определите количество подгрупп для МУПов и выберите преподавателей
        </h3>

        <SubgroupSelection
          selectionGroupIds={selectionGroupsIds}
          dataIsPrepared={editorDataPrepared}
          onUnauthorized={props.onUnauthorized}
        />
      </article>
    );
  };

  return (
    <section className="page">
      <h2 className="action_header">
        <Button
          onClick={handleBackButton}
          variant="text"
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translate(0, -50%)",
          }}
          startIcon={<WestIcon />}
        >
          Вернуться назад
        </Button>
        Подготовка семестра
      </h2>
      <article className="step">
        <h3 className="step__header">
          1. Выберите группы выбора: для третьего и четвертого курса
        </h3>
        <GroupSelect
          selectionGroupsList={selectionGroupsListItems}
          onRefresh={refreshSelectionGroups}
          onSelectionValid={handleSelectionGroupValid}
        />

        <div className="next_step__container">
          <ApplyButtonWithActionDisplay
            showErrorWarning={false}
            showSuccessMessage={false}
            onNextStep={handleGroupSelectButton}
          />
          <p className="next_step__message">
            {selectionGroupsIds.length !== 2
              ? "Выберите две группы для перехода к следующему шагу"
              : null}
          </p>
        </div>
      </article>

      {selectionGroupsIds.length === 2 ? renderStep2() : null}

      {selectionGroupsIds.length === 2 && editorDataPrepared
        ? renderStep3()
        : null}
    </section>
  );
}
