import React, { useContext, useState, useRef, useEffect } from "react";
import { COMPETITION_GROUP_URL, DEBOUNCE_MS } from "../../../utils/constants";
import { ITSContext } from "../../../common/Context";
import {
  ISelectionGroupData,
  ICompetitionGroupData,
} from "../../../common/types";
import {
  COMPETITION_GROUP_SUBGROUP_METAS_URL,
  COMPETITION_GROUP_SUBGROUP_URL,
} from "../../../utils/constants";
import { OuterLink } from "../../OuterLink";
import style from "./CompetitionGroupPreparation.module.css";
import { ICompetitionGroupPreparationProps } from "./types";
import { createDebouncedWrapper } from "../../../utils/helpers";
import {
  createPrepareSubgroupsActions,
  createUpdateSubgroupCountActions,
} from "../../../competitionGroupPreparation/actionCreator";

import {
  IActionExecutionLogItem,
  ITSAction,
  executeActions,
} from "../../../common/actions";
import { SelectChangeEvent } from "@mui/material/Select";
import { RefreshButton } from "../../RefreshButton";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import { NextStepButton } from "../../ApplyButtonWithActionDisplay/ApplyButtonWithActionDisplay";
import { SimpleSelect } from "../../SimpleSelect/SimpleSelect";

function extractCompetitionGroupIds(
  selectionGroupIds: number[],
  selectionGroupData: ISelectionGroupData
) {
  const newCompetitionGroupIds: number[] = [];
  selectionGroupIds.forEach((sgId) => {
    const cgId = selectionGroupData.data[sgId].competitionGroupId;
    if (cgId !== null && cgId !== undefined) {
      newCompetitionGroupIds.push(cgId);
    }
  });
  return newCompetitionGroupIds;
}

function getCompetitionGroupIdToSelectionGroupId(
  selectionGroupIds: number[],
  selectionGroupData: ISelectionGroupData
) {
  const res: { [key: number]: number } = {};
  selectionGroupIds.forEach((sgId) => {
    const cgId = selectionGroupData.data[sgId].competitionGroupId;
    if (cgId !== null && cgId !== undefined) {
      res[cgId] = sgId;
    }
  });
  return res;
}

export function getCompetitionGroupName(
  competitionGroupId: number,
  competitionGroupData: ICompetitionGroupData
) {
  if (competitionGroupData.data.hasOwnProperty(competitionGroupId)) {
    return competitionGroupData.data[competitionGroupId].name;
  }
  return competitionGroupId;
}

// function getSelectionGroupIdByCompetitionGroup(competitonGroupId, selectionGroupIds, competitionGroupIds) {
//   if (selectionGroupIds.le)
// }

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function CompetitionGroupPreparation(
  props: ICompetitionGroupPreparationProps
) {
  const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
  const [selectedCompetitionGroupId, setSelectedCompetitionGroupId] = useState<
    number | null
  >(null);

  const [updateSubgroupCountActions, setUpdateSubgroupCountActions] = useState<
    ITSAction[]
  >([]);
  const [
    updateSubgroupCountActionResults,
    setUpdateSubgroupCountActionResults,
  ] = useState<IActionExecutionLogItem[]>([]);

  const [prepareSubgroupActions, setPrepareSubgroupActions] = useState<
    ITSAction[]
  >([]);
  const [prepareSubgroupActionResults, setPrepareSubgroupActionResults] =
    useState<IActionExecutionLogItem[]>([]);

  const [updateSubgroupCountInProgress, setUpdateSubgroupCountInProgress] =
    useState<boolean>(false);
  const [prepareSubgroupInProgress, setPrepareSubgroupInProgress] =
    useState<boolean>(false);
  const [prepareSubgroupMessages, setPrepareSubgroupMessages] = useState<
    string[]
  >([]);

  const [ensureInProgress, setEnsureInProgress] = useState<boolean>(false);
  const currentEnsurePromise = useRef<Promise<any> | null>(null);

  const [applyDefaultClicked, setApplyDefaultClicked] =
    useState<boolean>(false);
  const [applySubgroupsClicked, setApplySubgroupsClicked] =
    useState<boolean>(false);

  const context = useContext(ITSContext)!;

  const ensureData = (
    refresh: boolean = false,
    forceRefreshSubgroups: boolean = false
  ) => {
    // console.log("CompetitionGroupPreparation: ensureData");
    if (currentEnsurePromise.current !== null) {
      // console.log(
      //   "CompetitionGroupPreparation: ensureData is already in progress"
      // );
      return currentEnsurePromise.current;
    }
    setEnsureInProgress(true);

    const repo = context.dataRepository;
    const updateSelectionGroupPromise = () =>
      !refresh && repo.CheckSelectionGroupDataPresent(props.selectionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSelectionGroupData();
    const updateSelectionGroupToMupDataPromise = () =>
      !refresh &&
      repo.CheckSelectionGroupToMupDataPresent(props.selectionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSelectionGroupToMupsData(props.selectionGroupIds);
    const emulateCheckSubgroupMetas = (newCompetitionGroupIds: number[]) =>
      !refresh && !forceRefreshSubgroups
        ? Promise.resolve()
        : Promise.allSettled(
            newCompetitionGroupIds.map((cId) =>
              context.apiService.EmulateCheckSubgroupMetas(cId)
            )
          );
    const updateCompetitionGroupDataPromise = (
      newCompetitionGroupIds: number[]
    ) =>
      !refresh && repo.CheckCompetitionGroupDataPresent(newCompetitionGroupIds)
        ? Promise.resolve()
        : repo.UpdateCompetitionGroupData();
    const updateSubgroupMetasPromise = (newCompetitionGroupIds: number[]) =>
      !refresh &&
      !forceRefreshSubgroups &&
      repo.CheckSubgroupMetasPresent(newCompetitionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSubgroupMetas(newCompetitionGroupIds);
    const updateSubgroupsPromise = (newCompetitionGroupIds: number[]) =>
      !refresh &&
      !forceRefreshSubgroups &&
      repo.CheckSubgroupPresent(newCompetitionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSubgroups(newCompetitionGroupIds);

    const ensurePromise = Promise.allSettled([
      updateSelectionGroupPromise(),
      updateSelectionGroupToMupDataPromise(),
    ])
      .then(() => {
        const newCompetitionGroupIds = extractCompetitionGroupIds(
          props.selectionGroupIds,
          context.dataRepository.selectionGroupData
        );
        return emulateCheckSubgroupMetas(newCompetitionGroupIds).then(() => {
          return Promise.allSettled([
            updateCompetitionGroupDataPromise(newCompetitionGroupIds),
            updateSubgroupMetasPromise(newCompetitionGroupIds),
            updateSubgroupsPromise(newCompetitionGroupIds),
          ]);
        });
      })
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

    currentEnsurePromise.current = ensurePromise;
    return ensurePromise;
  };

  const prepareData = (newSelectedCompetitionGroupId: number | null = null) => {
    const repo = context.dataRepository;
    const newCompetitionGroupIds = extractCompetitionGroupIds(
      props.selectionGroupIds,
      repo.selectionGroupData
    );
    newSelectedCompetitionGroupId =
      newSelectedCompetitionGroupId ?? selectedCompetitionGroupId;
    if (
      newSelectedCompetitionGroupId === null &&
      newCompetitionGroupIds.length > 0
    ) {
      newSelectedCompetitionGroupId = newCompetitionGroupIds[0];
    }
    if (selectedCompetitionGroupId !== newSelectedCompetitionGroupId) {
      setSelectedCompetitionGroupId(newSelectedCompetitionGroupId);
      if (newSelectedCompetitionGroupId !== null) {
        props.onReferenceCompetitionGroupChange(newSelectedCompetitionGroupId);
      }
    }

    setCompetitionGroupIds(newCompetitionGroupIds);

    const allMupIds = new Set<string>();

    for (const selectionGroupId of props.selectionGroupIds) {
      if (
        !repo.selectionGroupToMupsData.data.hasOwnProperty(selectionGroupId)
      ) {
        continue;
      }
      Object.keys(
        repo.selectionGroupToMupsData.data[selectionGroupId].data
      ).forEach((mId) => allMupIds.add(mId));
    }

    return { newSelectedCompetitionGroupId, allMupIds };
  };

  const generateUpdateSubgroupCountActions = (
    cgId: number,
    allMupIds: Set<string>
  ) => {
    const repo = context.dataRepository;
    const newAllMupNames = new Set<string>(
      Array.from(allMupIds).map((mId) => repo.mupData.data[mId].name)
    );

    const actions = createUpdateSubgroupCountActions(
      cgId,
      newAllMupNames,
      repo.competitionGroupToSubgroupMetas
    );
    setUpdateSubgroupCountActions(actions);
  };

  const generatePrepareSubgroupActions = (
    cgId: number,
    allMupIds: Set<string>
  ) => {
    const repo = context.dataRepository;

    const mupNameToMupId: { [key: string]: string } = {};
    allMupIds.forEach((mId) => {
      const mup = repo.mupData.data[mId];
      mupNameToMupId[mup.name] = mId;
    });
    // TODO: save result
    const competitionGroupIdToSelectionGroupId =
      getCompetitionGroupIdToSelectionGroupId(
        props.selectionGroupIds,
        repo.selectionGroupData
      );
    const sgId = competitionGroupIdToSelectionGroupId[cgId];
    const { actions, subgroupReferenceInfo } = createPrepareSubgroupsActions(
      cgId,
      sgId,
      mupNameToMupId,
      repo.mupData,
      repo.selectionGroupToMupsData,
      repo.competitionGroupToSubgroupMetas,
      repo.competitionGroupToSubgroupIds,
      repo.subgroupData
    );
    setPrepareSubgroupActions(actions);
    const messages: string[] = [];
    if (actions.length === 0) {
      for (const mupName in subgroupReferenceInfo) {
        const loadsWithMissingTeachers: string[] = [];
        const createdSubgroupsAreWrong: string[] = [];
        for (const load in subgroupReferenceInfo[mupName]) {
          if (
            subgroupReferenceInfo[mupName][load].subgroupInfo.some(
              (si) => !si.teacher
            )
          ) {
            loadsWithMissingTeachers.push(load);
          }
          if (
            subgroupReferenceInfo[mupName][load].subgroupInfo.length !==
            subgroupReferenceInfo[mupName][load].count
          ) {
            createdSubgroupsAreWrong.push(load);
          }
        }
        if (loadsWithMissingTeachers.length > 0) {
          const loadsStr = loadsWithMissingTeachers
            .map((l) => `"${l}"`)
            .join(", ");
          messages.push(
            `МУП: "${mupName}": следующие нагрузки не имеют преподавателя: ${loadsStr}`
          );
        }
        if (createdSubgroupsAreWrong.length > 0) {
          const loadsStr = createdSubgroupsAreWrong
            .map((l) => `"${l}"`)
            .join(", ");
          messages.push(
            `МУП: "${mupName}": следующие нагрузки имеют созданные группы не соответствующие количеству: ${loadsStr} (удалите лишние подгруппы и создайте их заново)`
          );
        }
      }
    }
    setPrepareSubgroupMessages(messages);
  };

  const generateAllActions = (cgId: number, allMupIds: Set<string>) => {
    generateUpdateSubgroupCountActions(cgId, allMupIds);
    generatePrepareSubgroupActions(cgId, allMupIds);
  };

  const handleRefresh = () => {
    ensureData(true).then(() => {
      const { newSelectedCompetitionGroupId, allMupIds } = prepareData();
      newSelectedCompetitionGroupId !== null &&
        generateAllActions(newSelectedCompetitionGroupId, allMupIds);
    });
  };

  const handleRefreshDebounced = () => {
    debouncedWrapperForApply(handleRefresh);
  };

  const refreshSubgroupsAndRegenerateAcrtions = (
    selectedCompetitionGroupId: number | null = null
  ) => {
    ensureData(false, true).then(() => {
      const { newSelectedCompetitionGroupId, allMupIds } = prepareData(
        selectedCompetitionGroupId
      );
      newSelectedCompetitionGroupId !== null &&
        generateAllActions(newSelectedCompetitionGroupId, allMupIds);
    });
  };

  const refreshAfterCompetitionGroupSelectDebounced = (
    selectedCompetitionGroupId: number | null = null
  ) => {
    debouncedWrapperForApply(() => {
      ensureData(false, false).then(() => {
        const { newSelectedCompetitionGroupId, allMupIds } = prepareData(
          selectedCompetitionGroupId
        );
        newSelectedCompetitionGroupId !== null &&
          generateAllActions(newSelectedCompetitionGroupId, allMupIds);
      });
    });
  };

  useEffect(() => {
    ensureData()
      .then(() => {
        const { newSelectedCompetitionGroupId, allMupIds } = prepareData();
        newSelectedCompetitionGroupId !== null &&
          generateAllActions(newSelectedCompetitionGroupId, allMupIds);
      })
      .finally(() => props.onLoad());

    return () => {
      // console.warn("CompetitionGroupPreparation UNMOUNTED");
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // console.warn(
    //   `CompetitionGroupPreparation: useEffect [${props.refreshCounter}]`
    // );
    if (props.refreshCounter > 0) {
      // console.warn(`refreshing on counter`);
      ensureData(false, true).then(() => {
        const { newSelectedCompetitionGroupId, allMupIds } = prepareData();
        newSelectedCompetitionGroupId !== null &&
          generateAllActions(newSelectedCompetitionGroupId, allMupIds);
      });
    }
    // eslint-disable-next-lines
  }, [props.refreshCounter]);

  const handleCompetitionGroupChange = (event: SelectChangeEvent) => {
    const newCompetitionGroupIdStr = event.target.value;
    if (newCompetitionGroupIdStr !== null) {
      setApplyDefaultClicked(false);
      setApplySubgroupsClicked(false);

      const newCompetitionGroupId = Number(newCompetitionGroupIdStr);

      if (isFinite(newCompetitionGroupId)) {
        setSelectedCompetitionGroupId(Number(newCompetitionGroupIdStr));
        refreshAfterCompetitionGroupSelectDebounced(newCompetitionGroupId);
        props.onReferenceCompetitionGroupChange(newCompetitionGroupId);
      }
    }
  };

  const handleUpdateSubgroupCountApply = () => {
    setApplyDefaultClicked(true);
    setUpdateSubgroupCountInProgress(true);
    executeActions(updateSubgroupCountActions, context)
      .then((actionResults) => {
        setUpdateSubgroupCountActionResults(actionResults);
      })
      .then(() => refreshSubgroupsAndRegenerateAcrtions())
      .finally(() => {
        setUpdateSubgroupCountInProgress(false);
        props.onApplyFinish();
      });
  };

  const handleUpdateSubgroupCountApplyDebounced = () => {
    debouncedWrapperForApply(handleUpdateSubgroupCountApply);
  };

  const handlePrepareSubgroupsApply = () => {
    setApplySubgroupsClicked(true);
    setPrepareSubgroupInProgress(true);

    executeActions(prepareSubgroupActions, context)
      .then((actionResults) => {
        setPrepareSubgroupActionResults(actionResults);
      })
      .then(() => refreshSubgroupsAndRegenerateAcrtions())
      .finally(() => {
        setPrepareSubgroupInProgress(false);
        props.onApplyFinish();
      });
  };

  const handlePrepareSubgroupsApplyDebounced = () => {
    debouncedWrapperForApply(handlePrepareSubgroupsApply);
  };

  const renderSelect = () => {
    const items = competitionGroupIds.map((cgId) => {
      const name = getCompetitionGroupName(
        cgId,
        context.dataRepository.competitionGroupData
      );
      return {
        id: cgId,
        name: `${name}`,
      };
    });
    return (
      <SimpleSelect
        label={"Конкурсная группа"}
        items={items}
        selectedId={selectedCompetitionGroupId}
        onChange={handleCompetitionGroupChange}
      />
    );
  };

  const renderCompetitionGroupSelect = () => {
    return (
      <article className="same_line_with_wrap">
        <p>Выберите эталонную конкурсную группу для настройки</p>
        {renderSelect()}
      </article>
    );
  };

  const renderDefaultMetaSubrgoupCountSetUp = () => {
    return (
      <article>
        <p>
          Определите количество подгрупп по умолчанию для нагрузок выбранных
          МУПов
        </p>

        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={updateSubgroupCountActions}
          actionResults={updateSubgroupCountActionResults}
          clicked={applyDefaultClicked}
          // onNextStep={onNextStep}
          loading={updateSubgroupCountInProgress}
          onApply={handleUpdateSubgroupCountApplyDebounced}
        >
          Установить количество подгрупп в 1, если не задано (и в 0, если не
          входит в состав Группы выбора)
        </ApplyButtonWithActionDisplay>
      </article>
    );
  };

  const renderManualMetaSubrgoupCountSetUp = () => {
    return (
      <article>
        <p className="same_line_with_wrap">
          Отредактируйте количество подгрупп{" "}
          <OuterLink
            url={
              COMPETITION_GROUP_SUBGROUP_METAS_URL + selectedCompetitionGroupId
            }
          >
            в ИТС
          </OuterLink>{" "}
          и обновите данные
        </p>
      </article>
    );
  };

  const renderSubgroupSetUp = () => {
    return (
      <article>
        <p>
          Создайте подгруппы, определите Лимиты и выберите преподавателей для
          подгрупп
        </p>
        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={prepareSubgroupActions}
          actionResults={prepareSubgroupActionResults}
          clicked={applySubgroupsClicked}
          // onNextStep={onNextStep}
          loading={prepareSubgroupInProgress}
          onApply={handlePrepareSubgroupsApplyDebounced}
        >
          Создать подгруппы и попробовать выбрать преподавателя
        </ApplyButtonWithActionDisplay>
      </article>
    );
  };

  const renderSubgroupManualSetUp = () => {
    return (
      <article>
        <p className="same_line_with_wrap">
          Отредактируйте Лимиты и выбранных преподавателей созданных подгрупп{" "}
          <OuterLink
            url={COMPETITION_GROUP_SUBGROUP_URL + selectedCompetitionGroupId}
          >
            в ИТС
          </OuterLink>{" "}
          и обновите данные
        </p>
        {prepareSubgroupMessages.length > 0 && (
          <article className={style.error_list_container}>
            <ul className="warning">
              {prepareSubgroupMessages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </article>
        )}
      </article>
    );
  };

  const renderSteps = () => {
    return (
      <ol className="step_list">
        <li>{renderCompetitionGroupSelect()}</li>
        <li>{renderDefaultMetaSubrgoupCountSetUp()}</li>
        <li>{renderManualMetaSubrgoupCountSetUp()}</li>
        <li>{renderSubgroupSetUp()}</li>
        <li>{renderSubgroupManualSetUp()}</li>
        <li>Синхронизируйте Конкурсные группы на следующем шаге</li>
      </ol>
    );
  };

  const renderCompetitionGroupsNotFound = () => {
    return (
      <div className="message_error">
        <p>Конкурсные группы не найдены</p>
        <p>
          Создайте Конкрусные группы для каждой Группы выбора и свяжите их с
          соответствующими Группами выбора{" "}
          <OuterLink url={COMPETITION_GROUP_URL}>в ИТС</OuterLink>. И обновите
          данные.
        </p>
        <p className="warning">
          После привязки конкурсной группы к группе выбора, студенты направлений
          указанных в образовательном пространстве смогут увидеть дисциплины по
          выбору в личном кабинете
        </p>
      </div>
    );
  };

  return (
    <React.Fragment>
      <RefreshButton
        onClick={handleRefreshDebounced}
        loading={ensureInProgress}
        title="Обновить данные"
      />
      {competitionGroupIds.length === 0 && renderCompetitionGroupsNotFound()}
      {competitionGroupIds.length > 0 && renderSteps()}
      <NextStepButton onClick={props.onNextStep}>
        К следующему шагу
      </NextStepButton>
    </React.Fragment>
  );
}
