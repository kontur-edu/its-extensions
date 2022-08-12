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
import { ITSContext } from "../../../common/Context";
import { CompetitionGroupSync } from "../CompetitionGroupSync";

import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import { BackButton } from "../../BackButton";
import { CompetitionGroupPreparation } from "../CompetitionGroupPreparation";
import { createDebouncedWrapper } from "../../../utils/helpers";

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
const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function SemesterPreparation(props: ISemesterPreparationProps) {
  // TODO: вынести в отдельный компонент
  const [selectionGroupsListItems, setSelectionGroupsListItems] = useState<
    ISelectionListItem[]
  >([]);
  const [selectionValid, setSelectionValid] = useState<boolean>(false);
  const [selectionGroupsIds, setSelectionGroupsIds] = useState<number[]>([]);
  const [mupEditorLoaded, setMupEditorLoaded] = useState<boolean>(false);
  const [competitionGroupLoaded, setCompetitionGroupLoaded] =
    useState<boolean>(false);

  const [referenceCompetitionGroupId, setReferenceCompetitionGroupId] =
    useState<number | null>(null);
  // const [editorDataPrepared, setEditorDataPrepared] = useState<boolean>(false);
  const requestSelectionGroupsInProgress = useRef(false);

  const stepTwoRef = useRef<HTMLElement | null>(null);
  const stepThreeRef = useRef<HTMLElement | null>(null);
  const stepFourRef = useRef<HTMLElement | null>(null);
  const context = useContext(ITSContext)!;

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

  const handleMupEditorLoaded = () => {
    console.log("handleMupEditorLoaded");
    setMupEditorLoaded(true);
  };

  const handleCompetitionGroupPreparationLoaded = () => {
    console.log("handleMupEditorLoaded");
    setCompetitionGroupLoaded(true);
  };

  // selectionGroupMups, SubgroupGroupMetas, Subgroups
  const handleSelectionGroupSelected = (selectionGroupIds: number[]) => {
    if (selectionGroupIds.length !== 2) {
      setSelectionValid(false);
    }
    setMupEditorLoaded(false);
    setCompetitionGroupLoaded(false);
    // setEditorDataPrepared(false);
    // console.log("handleSelectionGroupValid");
    // remember chosen selectionGroup ids
    debouncedWrapperForApply(() => {
      const repo = context.dataRepository;
      const updateMupDataPromise =
        repo.mupData.ids.length > 0 ? Promise.resolve() : repo.UpdateMupData();
      updateMupDataPromise.then(() => {
        setSelectionValid(true);
        setSelectionGroupsIds(selectionGroupIds);
      });
    });
  };

  const handleReferenceCompetitionGroupIdChange = (
    newReferenceCompetitionGroupId: number
  ) => {
    setReferenceCompetitionGroupId(newReferenceCompetitionGroupId);
  };

  const handleStepTwo = () => {
    stepTwoRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleStepThree = () => {
    stepThreeRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleStepFour = () => {
    stepFourRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    refreshSelectionGroups();
    return () => {};
  }, [props.isUnauthorized]);

  const renderStep2 = () => {
    return (
      <article className="step" ref={stepTwoRef}>
        <h3 className="step__header">
          2. Назначьте даты выбора, состав МУПов и их Лимиты
        </h3>

        <MupEditor
          selectionGroupIds={selectionGroupsIds}
          // dataIsPrepared={editorDataPrepared}
          onLoad={handleMupEditorLoaded}
          onNextStep={handleStepThree}
          onUnauthorized={props.onUnauthorized}
        />
      </article>
    );
  };

  const renderStep3 = () => {
    return (
      <article className="step" ref={stepThreeRef}>
        <h3 className="step__header">
          3. Подготовьте эталонную Конкурсную группу
        </h3>

        <CompetitionGroupPreparation
          selectionGroupIds={selectionGroupsIds}
          dataIsPrepared={mupEditorLoaded} // TODO: delete this
          onUnauthorized={props.onUnauthorized}
          onNextStep={handleStepFour} // TODO: fix
          onLoad={handleCompetitionGroupPreparationLoaded}
          onReferenceCompetitionGroupChange={
            handleReferenceCompetitionGroupIdChange
          }
        />
      </article>
    );
  };

  const renderStep4 = () => {
    return (
      <article className="step" ref={stepFourRef}>
        <h3 className="step__header">4. Синхронизация конкурсных групп</h3>

        <CompetitionGroupSync
          selectionGroupIds={selectionGroupsIds}
          dataIsPrepared={mupEditorLoaded} // TODO: delete this
          onUnauthorized={props.onUnauthorized}
          referenceCompetitionGroupId={referenceCompetitionGroupId}
        />
      </article>
    );
  };

  return (
    <section className="page">
      <h2 className="action_header">
        <BackButton route={"/"} />
        Подготовка семестра
      </h2>
      <article className="step">
        <h3 className="step__header">
          1. Выберите группы выбора: для третьего и четвертого курса
        </h3>
        <GroupSelect
          selectionGroupsList={selectionGroupsListItems}
          onRefresh={refreshSelectionGroups}
          onSelection={handleSelectionGroupSelected}
        />

        <div className="next_step__container">
          {selectionValid && (
            <ApplyButtonWithActionDisplay
              showErrorWarning={false}
              showSuccessMessage={false}
              onNextStep={handleStepTwo}
            >
              Применить изменения
            </ApplyButtonWithActionDisplay>
          )}
          <p className="next_step__message">
            {selectionValid &&
              selectionGroupsIds.length !== 2 &&
              "Выберите две группы для перехода к следующему шагу"}
          </p>
        </div>
      </article>

      {selectionValid && selectionGroupsIds.length === 2 && renderStep2()}

      {selectionValid &&
        selectionGroupsIds.length === 2 &&
        mupEditorLoaded && // TODO Delete this
        renderStep3()}

      {selectionValid &&
        selectionGroupsIds.length === 2 &&
        mupEditorLoaded &&
        competitionGroupLoaded &&
        renderStep4()}
    </section>
  );
}
