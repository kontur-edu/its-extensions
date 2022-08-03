import { Button } from "@mui/material";
import React, { useContext, useState, useRef, useEffect } from "react";
import { DEBOUNCE_MS } from "../../../utils/constants";
import { ITSContext } from "../../../common/Context";
import {
  ISelectionGroupData,
  ICompetitionGroupData,
} from "../../../common/types";
import {
  REQUEST_ERROR_UNAUTHORIZED,
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

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
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

export function getCompetitionGroupName(
  competitionGroupId: number,
  competitionGroupData: ICompetitionGroupData
) {
  if (competitionGroupData.data.hasOwnProperty(competitionGroupId)) {
    return competitionGroupData.data[competitionGroupId].name;
  }
  return competitionGroupId;
}

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function CompetitionGroupPreparation(
  props: ICompetitionGroupPreparationProps
) {
  const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
  const [selectedCompetitionGroupId, setSelectedCompetitionGroupId] = useState<
    number | null
  >(null);

  // const [allMupNames, setAllMupNames] = useState<Set<string>>(
  //   new Set<string>()
  // );
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

  const context = useContext(ITSContext)!;

  const ensureData = (
    refresh: boolean = false,
    forceRefreshSubgroups: boolean = false
  ) => {
    console.log("CompetitionGroupPreparation: ensureData");
    if (currentEnsurePromise.current !== null) {
      console.log(
        "CompetitionGroupPreparation: ensureData is already in progress"
      );
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
      .then(() => {
        currentEnsurePromise.current = null;
        setEnsureInProgress(false);
      })
      .catch((err) => {
        currentEnsurePromise.current = null;
        setEnsureInProgress(false);
        if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
          props.onUnauthorized();
          return;
        }
        throw err;
      });

    currentEnsurePromise.current = ensurePromise;
    return ensurePromise;
  };

  const prepareData = (newSelectedCompetitionGroupId: number | null = null) => {
    const repo = context.dataRepository;
    const newCompetitionGroupIds = extractCompetitionGroupIds(
      props.selectionGroupIds,
      repo.selectionGroupData
    );
    newSelectedCompetitionGroupId = newSelectedCompetitionGroupId ?? selectedCompetitionGroupId;
    if (
      newSelectedCompetitionGroupId === null &&
      newCompetitionGroupIds.length > 0
    ) {
      newSelectedCompetitionGroupId = newCompetitionGroupIds[0];
    }

    setSelectedCompetitionGroupId(newSelectedCompetitionGroupId);

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
    const { actions, mupNameToLoadToTeachers } = createPrepareSubgroupsActions(
      cgId,
      mupNameToMupId,
      repo.mupData,
      repo.competitionGroupToSubgroupMetas,
      repo.competitionGroupToSubgroupIds,
      repo.subgroupData
    );
    setPrepareSubgroupActions(actions);
    const messages: string[] = [];
    if (actions.length === 0) {
      for (const mupName in mupNameToLoadToTeachers) {
        const loadsWithMissingTeachers: string[] = [];
        for (const load in mupNameToLoadToTeachers[mupName]) {
          if (mupNameToLoadToTeachers[mupName][load].some((p) => !p)) {
            loadsWithMissingTeachers.push(load);
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
      }
    }
    setPrepareSubgroupMessages(messages);
  };

  const generateAllActions = (cgId: number, allMupIds: Set<string>) => {
    generateUpdateSubgroupCountActions(cgId, allMupIds);
    generatePrepareSubgroupActions(cgId, allMupIds);
  };

  const handleRefresh = () => {
    ensureData(true)
      .then(() => {
        const { newSelectedCompetitionGroupId, allMupIds } = prepareData();
        newSelectedCompetitionGroupId !== null &&
          generateAllActions(newSelectedCompetitionGroupId, allMupIds)
      });
  };

  const handleRefreshDebounced = () => {
    debouncedWrapperForApply(handleRefresh);
  }

  const refreshSubgroupsAndRegenerateAcrtions = (selectedCompetitionGroupId: number | null = null) => {
    ensureData(false, true)
      .then(() => {
        const { newSelectedCompetitionGroupId, allMupIds } = prepareData(selectedCompetitionGroupId);
        newSelectedCompetitionGroupId !== null &&
          generateAllActions(newSelectedCompetitionGroupId, allMupIds)
      });
  };
  
  const refreshAfterCompetitionGroupSelectDebounced = (selectedCompetitionGroupId: number | null = null) => {
    debouncedWrapperForApply(() => {
      ensureData(false, false)
      .then(() => {
        const { newSelectedCompetitionGroupId, allMupIds } = prepareData(selectedCompetitionGroupId);
        newSelectedCompetitionGroupId !== null &&
          generateAllActions(newSelectedCompetitionGroupId, allMupIds)
      });
    });
  }

  useEffect(() => {
    ensureData()
      .then(() => {
        const { newSelectedCompetitionGroupId, allMupIds } = prepareData();
        newSelectedCompetitionGroupId !== null &&
          generateAllActions(newSelectedCompetitionGroupId, allMupIds)
      });
  }, []);

  const handleCompetitionGroupChange = (event: SelectChangeEvent) => {
    const newCompetitionGroupIdStr = event.target.value;
    if (newCompetitionGroupIdStr !== null) {
      const newCompetitionGroupId = Number(newCompetitionGroupIdStr);

      isFinite(newCompetitionGroupId) &&
        setSelectedCompetitionGroupId(Number(newCompetitionGroupIdStr));
      
        refreshAfterCompetitionGroupSelectDebounced(newCompetitionGroupId);
    }
  };

  const handleUpdateSubgroupCountApply = () => {
    setUpdateSubgroupCountInProgress(true);
    executeActions(updateSubgroupCountActions, context)
      .then((actionResults) => {
        setUpdateSubgroupCountActionResults(actionResults);
      })
      .then(() => refreshSubgroupsAndRegenerateAcrtions())
      .then(() => setUpdateSubgroupCountInProgress(false));
  };

  const handleUpdateSubgroupCountApplyDebounced = () => {
    debouncedWrapperForApply(handleUpdateSubgroupCountApply);
  };

  const handlePrepareSubgroupsApply = () => {
    setPrepareSubgroupInProgress(true);

    executeActions(prepareSubgroupActions, context)
      .then((actionResults) => {
        setPrepareSubgroupActionResults(actionResults);
      })
      .then(() => refreshSubgroupsAndRegenerateAcrtions())
      .then(() => setPrepareSubgroupInProgress(false));
  };

  const handlePrepareSubgroupsApplyDebounced = () => {
    debouncedWrapperForApply(handlePrepareSubgroupsApply);
  };

  const renderSelect = () => {
    const items = competitionGroupIds.map(cgId => {
      const name = getCompetitionGroupName(
        cgId,
        context.dataRepository.competitionGroupData
      )
      return {
        id: cgId,
        name: `${name}`
      };
    })
    return (
      <SimpleSelect label={"Конкурсная группа"} items={items} selectedId={selectedCompetitionGroupId} onChange={handleCompetitionGroupChange} />
      // <FormControl sx={{ minWidth: 120, marginLeft: "1em" }}>
      //   <InputLabel id="competition-group-preparation-select">
      //     Конкурсная группа
      //   </InputLabel>
      //   {selectedCompetitionGroupId !== null && (
      //     <Select
      //       labelId="competition-group-preparation-select"
      //       value={`${selectedCompetitionGroupId}`}
      //       label="Конкурсная группа"
      //       onChange={handleCompetitionGroupChange}
      //     >
      //       {competitionGroupIds.map((cgId) => (
      //         <MenuItem key={cgId} value={cgId}>
      //           {getCompetitionGroupName(
      //             cgId,
      //             context.dataRepository.competitionGroupData
      //           )}
      //         </MenuItem>
      //       ))}
      //     </Select>
      //   )}
      // </FormControl>
    );
  };

  return (
    <React.Fragment>
      <h3>
        Подготовьте эталонную конкурсную группу
      </h3>
      <RefreshButton
        onClick={handleRefreshDebounced}
        loading={ensureInProgress}
        title="Обновить данные"
      />
      <ol className={style.step_list}>
        <li>
          Выберите эталонную конкурсную группу для настройки
          {renderSelect()}
        </li>
        <li>
          <p>Определите количество подгрупп для нагрузок выбранных МУПов</p>

          <ApplyButtonWithActionDisplay
            showErrorWarning={true}
            showSuccessMessage={true}
            actions={updateSubgroupCountActions}
            actionResults={updateSubgroupCountActionResults}
            // clicked={updateSubgroupCountClicked}
            // onNextStep={onNextStep}
            loading={updateSubgroupCountInProgress}
            onApply={handleUpdateSubgroupCountApplyDebounced}
          >
            Установить количество подгрупп в 1 для всех нагрузок МУПов
          </ApplyButtonWithActionDisplay>
          <p>
            Отредактируйте количество подгрупп{" "}
            <OuterLink
              url={
                COMPETITION_GROUP_SUBGROUP_METAS_URL +
                selectedCompetitionGroupId
              }
            >
              в ИТС
            </OuterLink>{" "}
            и обновите данные
          </p>
        </li>
        <li>
          <p>
            Создание подгрупп, определение Лимитов и выбор преподавателей для
            подгрупп
          </p>
          <ApplyButtonWithActionDisplay
            showErrorWarning={true}
            showSuccessMessage={true}
            actions={prepareSubgroupActions}
            actionResults={prepareSubgroupActionResults}
            // clicked={prepareSubgroupClicked}
            // onNextStep={onNextStep}
            loading={prepareSubgroupInProgress}
            onApply={handlePrepareSubgroupsApplyDebounced}
          >
            Создать подгруппы и попробовать выбрать преподавателя
          </ApplyButtonWithActionDisplay>
          <p>
            Отредактируйте Лимиты и выбранных преподавателей созданных подгрупп{" "}
            <OuterLink
              url={COMPETITION_GROUP_SUBGROUP_URL + selectedCompetitionGroupId}
            >
              в ИТС
            </OuterLink>{" "}
            и обновите данные
          </p>
          {
            <ul className="warning">
              {prepareSubgroupMessages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          }
        </li>
        <li>Синхронизируйте Конкурсные группы на следующем шаге</li>
        <NextStepButton onClick={props.onNextStep}>
          К следующему шагу
        </NextStepButton>
      </ol>
    </React.Fragment>
  );
}
