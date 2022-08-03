import { Refresh } from "@mui/icons-material";
import { Button } from "@mui/material";
import React, { useContext, useState, useRef, useEffect } from "react";
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

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { RefreshButton } from "../../RefreshButton";

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

export function CompetitionGroupPreparation(
  props: ICompetitionGroupPreparationProps
) {
  const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
  const [selectedCompetitionGroupId, setSelectedCompetitionGroupId] = useState<
    number | null
  >(null);
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
    const newCompetitionGroupIds = extractCompetitionGroupIds(
      props.selectionGroupIds,
      context.dataRepository.selectionGroupData
    );
    if (newCompetitionGroupIds.length > 0) {
      setSelectedCompetitionGroupId(newCompetitionGroupIds[0]);
    }
    setCompetitionGroupIds(newCompetitionGroupIds);
  };

  const handleRefresh = () => {
    ensureData().then(() => prepareData());
  };

  useEffect(() => {
    ensureData().then(() => prepareData());
  }, []);

  const handleCompetitionGroupChange = (event: SelectChangeEvent) => {
    const newCompetitionGroupIdStr = event.target.value;
    if (newCompetitionGroupIdStr !== null) {
      const newCompetitionGroupId = Number(newCompetitionGroupIdStr);

      isFinite(newCompetitionGroupId) &&
        setSelectedCompetitionGroupId(Number(newCompetitionGroupIdStr));
    }
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
        </li>
        <li>
          <p>Определите количество подгрупп для нагрузок выбранных МУПов</p>
          <Button>
            Установить количество подгрупп в 1 для всех нагрузок МУПов
          </Button>
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
          <p>Создайте подгруппы и выберите преподавателей</p>
          <Button style={{ color: "red" }}>Удалить созданные подгруппы</Button>
          <Button>Создать подгруппы и попробовать выбрать преподавателя</Button>
          <p>
            Отредактируйте преподавателей{" "}
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
