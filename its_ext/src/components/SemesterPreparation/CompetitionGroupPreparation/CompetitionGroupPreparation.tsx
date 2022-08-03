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
import { createDebouncedWrapper, prepareMupData } from "../../../utils/helpers";
import {
  createUpdateSubgroupCountActions,
  createDeleteCreatedSubgroupCountActions,
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

function getCompetitionGroupName(
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

  const [allMupNames, setAllMupNames] = useState<Set<string>>(
    new Set<string>()
  );
  const [updateSubgroupCountActions, setUpdateSubgroupCountActions] = useState<
    ITSAction[]
  >([]);
  const [
    updateSubgroupCountActionResults,
    setUpdateSubgroupCountActionResults,
  ] = useState<IActionExecutionLogItem[]>([]);

  // const [updateSubgroupCountActions, setUpdateSubgroupCountActions] = useState<ITSAction[]>([]);
  // const [updateSubgroupCountActionResults, setUpdateSubgroupCountActionResults] = useState<
  //   IActionExecutionLogItem[]
  // >([]);

  const [ensureInProgress, setEnsureInProgress] = useState<boolean>(false);
  const currentEnsurePromise = useRef<Promise<any> | null>(null);

  const context = useContext(ITSContext)!;

  const ensureData = (refresh: boolean = false) => {
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
      !refresh
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
      !refresh && repo.CheckSubgroupMetasPresent(newCompetitionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSubgroupMetas(newCompetitionGroupIds);
    const updateSubgroupsPromise = (newCompetitionGroupIds: number[]) =>
      !refresh && repo.CheckSubgroupPresent(competitionGroupIds)
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

  const prepareData = () => {
    const repo = context.dataRepository;
    const newCompetitionGroupIds = extractCompetitionGroupIds(
      props.selectionGroupIds,
      repo.selectionGroupData
    );
    let newSelectedCompetitionGroupId = selectedCompetitionGroupId;
    if (
      newSelectedCompetitionGroupId === null &&
      newCompetitionGroupIds.length > 0
    ) {
      newSelectedCompetitionGroupId = newCompetitionGroupIds[0];
    }

    setSelectedCompetitionGroupId(newSelectedCompetitionGroupId);
    // if (newCompetitionGroupIds.length > 0) {
    //   setSelectedCompetitionGroupId(newCompetitionGroupIds[0]);
    // }
    setCompetitionGroupIds(newCompetitionGroupIds);

    const allMupIds = new Set<string>();
    // if (props.selectionGroupIds > 0) {

    // }
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

    const newAllMupNames = new Set<string>(
      Array.from(allMupIds).map((mId) => repo.mupData.data[mId].name)
    );
    setAllMupNames(newAllMupNames);

    return { newSelectedCompetitionGroupId, newAllMupNames };
  };

  const generateUpdateSubgroupCountActions = (
    cgId: number,
    newAllMupNames: Set<string>
  ) => {
    const actions = createUpdateSubgroupCountActions(
      cgId,
      newAllMupNames,
      context.dataRepository.competitionGroupToSubgroupMetas
    );
    setUpdateSubgroupCountActions(actions);
  };

  const generateAllActions = (cgId: number, newAllMupNames: Set<string>) => {
    generateUpdateSubgroupCountActions(cgId, newAllMupNames);
  };

  const handleUpdateSubgroupCountApply = () => {
    executeActions(updateSubgroupCountActions, context)
      .then((actionResults) => {
        setUpdateSubgroupCountActionResults(actionResults);
      })
      .then(() => handleRefresh());
    // TODO: generate all actions
  };

  const handleRefresh = () => {
    ensureData(true)
      .then(() => prepareData())
      .then(
        ({ newSelectedCompetitionGroupId, newAllMupNames }) =>
          newSelectedCompetitionGroupId !== null &&
          generateAllActions(newSelectedCompetitionGroupId, newAllMupNames)
      );
  };

  useEffect(() => {
    ensureData()
      .then(() => prepareData())
      .then(
        ({ newSelectedCompetitionGroupId, newAllMupNames }) =>
          newSelectedCompetitionGroupId !== null &&
          generateAllActions(newSelectedCompetitionGroupId, newAllMupNames)
      );
  }, []);

  const handleCompetitionGroupChange = (event: SelectChangeEvent) => {
    const newCompetitionGroupIdStr = event.target.value;
    if (newCompetitionGroupIdStr !== null) {
      const newCompetitionGroupId = Number(newCompetitionGroupIdStr);

      isFinite(newCompetitionGroupId) &&
        setSelectedCompetitionGroupId(Number(newCompetitionGroupIdStr));
    }
  };

  const handleUpdateSubgroupCountApplyDebounced = () => {
    debouncedWrapperForApply(handleUpdateSubgroupCountApply);
  };

  const renderSelect = () => {
    return (
      <FormControl sx={{ minWidth: 120, marginLeft: "1em" }}>
        <InputLabel id="competition-group-preparation-select">
          Конкурсная группа
        </InputLabel>
        {selectedCompetitionGroupId !== null && (
          <Select
            labelId="competition-group-preparation-select"
            value={`${selectedCompetitionGroupId}`}
            label="Конкурсная группа"
            onChange={handleCompetitionGroupChange}
          >
            {competitionGroupIds.map((cgId) => (
              <MenuItem key={cgId} value={cgId}>
                {getCompetitionGroupName(
                  cgId,
                  context.dataRepository.competitionGroupData
                )}
              </MenuItem>
            ))}
          </Select>
        )}
      </FormControl>
    );
  };

  return (
    <React.Fragment>
      <h3>
        Подготовьте следующую группу выбора для последующей синхронизации
        конкурсных групп
      </h3>
      <RefreshButton onClick={handleRefresh} title="Обновить данные" />
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
            // clicked={true}
            // onNextStep={onNextStep}
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
          {/* <Button style={{ color: "red" }}>Удалить созданные подгруппы</Button> */}
          <Button>Создать подгруппы и попробовать выбрать преподавателя</Button>
          <p>
            Отредактируйте Лимиты и выбранных преподавателей созданных подгрупп{" "}
            <OuterLink
              url={COMPETITION_GROUP_SUBGROUP_URL + selectedCompetitionGroupId}
            >
              в ИТС
            </OuterLink>{" "}
            и обновите данные
          </p>
        </li>
        <li>Синхронизируйте Конкурсные группы на следующем шаге</li>
      </ol>
    </React.Fragment>
  );
}
