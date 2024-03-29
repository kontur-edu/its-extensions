import React, { useState, useContext, useEffect, useRef } from "react";
import { ITSContext } from "../../../common/Context";
import style from "./CompetitionGroupSync.module.css";
import { ICompetitionGroupSyncProps } from "./types";
import { COMPETITION_GROUP_URL, DEBOUNCE_MS } from "../../../utils/constants";
import { ITSAction } from "../../../common/actions";
import { IActionExecutionLogItem } from "../../../common/actions";

import { getMupNameActions } from "../../../subgroupUpdater/actionCreator";

import { createDebouncedWrapper } from "../../../utils/helpers";
import { executeActions } from "../../../common/actions";
import {
  createSyncActions,
  createSubgroupReferenceInfoFromCompetitionGroup,
  checkMupsAndLoadsCompatible,
  ISubgroupReferenceInfo,
  getDiffMessagesBySubgroupReferenceInfo,
  getTodoMessagesByActions,
} from "./utils";

import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import { OuterLink } from "../../OuterLink";

import { RefreshButton } from "../../RefreshButton";
import CircularProgress from "@mui/material/CircularProgress";
import { SimpleSelect } from "../../SimpleSelect/SimpleSelect";
import { getCompetitionGroupName } from "../CompetitionGroupPreparation/CompetitionGroupPreparation";
import { SelectChangeEvent } from "@mui/material/Select";

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function CompetitionGroupSync(props: ICompetitionGroupSyncProps) {
  const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
  const [referenceCompetitionGroupId, setReferenceCompetitionGroupId] =
    useState<number | null>(null);

  const [canBeSync, setCanBeSync] = useState<boolean>(true);
  const [mupNames, setMupNames] = useState<Set<string>>(new Set<string>());
  const [mupToMessages, setMupToMessages] = useState<{
    [key: string]: [string[], string[]];
  }>({});

  const [syncActions, setSyncActions] = useState<ITSAction[]>([]);
  const [syncActionResults, setSyncActionResults] = useState<
    IActionExecutionLogItem[]
  >([]);
  const [ensureInProgress, setEnsureInProgress] = useState<boolean>(false);
  const currentEnsurePromise = useRef<Promise<any> | null>(null);
  const [applyClicked, setApplyClicked] = useState<boolean>(false);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);

  const context = useContext(ITSContext)!;

  const extractCompetitionGroupIds = (selectionGroupIds: number[]) => {
    const newCompetitionGroupIds: number[] = [];
    selectionGroupIds.forEach((sgId) => {
      const cgId =
        context.dataRepository.selectionGroupData.data[sgId].competitionGroupId;
      if (cgId !== null && cgId !== undefined) {
        newCompetitionGroupIds.push(cgId);
      }
    });
    return newCompetitionGroupIds;
  };

  const ensureData = (
    refresh: boolean = false,
    forceRefreshSubgroups: boolean = false
  ) => {
    if (currentEnsurePromise.current !== null) {
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
    const updateSubgroupMetasPromise = (newCompetitionGroupIds: number[]) =>
      !refresh &&
      !forceRefreshSubgroups &&
      repo.CheckSubgroupMetasPresent(newCompetitionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSubgroupMetas(newCompetitionGroupIds);
    const updateSubgroupsPromise = (newCompetitionGroupIds: number[]) =>
      !refresh &&
      !forceRefreshSubgroups &&
      repo.CheckSubgroupPresent(competitionGroupIds)
        ? Promise.resolve()
        : repo.UpdateSubgroups(newCompetitionGroupIds);

    const ensurePromise = Promise.allSettled([
      updateSelectionGroupPromise(),
      updateSelectionGroupToMupDataPromise(),
    ])
      .then(() => extractCompetitionGroupIds(props.selectionGroupIds))
      .then((newCompetitionGroupIds) =>
        emulateCheckSubgroupMetas(newCompetitionGroupIds).then(
          () => newCompetitionGroupIds
        )
      )
      .then((newCompetitionGroupIds) => {
        return Promise.allSettled([
          updateSubgroupMetasPromise(newCompetitionGroupIds),
          updateSubgroupsPromise(newCompetitionGroupIds),
        ]);
      })
      .finally(() => {
        currentEnsurePromise.current = null;
        setEnsureInProgress(false);
      });

    currentEnsurePromise.current = ensurePromise;
    return ensurePromise;
  };

  const prepareData = (
    newReferenceCompetitionGroupId: number | null = null
  ) => {
    const repo = context.dataRepository;

    const newCompetitionGroupIds = extractCompetitionGroupIds(
      props.selectionGroupIds
    );

    setCompetitionGroupIds(newCompetitionGroupIds);

    newReferenceCompetitionGroupId =
      newReferenceCompetitionGroupId ?? referenceCompetitionGroupId;
    if (
      newReferenceCompetitionGroupId === null &&
      newCompetitionGroupIds.length > 0
    ) {
      newReferenceCompetitionGroupId = newCompetitionGroupIds[0];
    }

    if (referenceCompetitionGroupId !== newReferenceCompetitionGroupId) {
      setReferenceCompetitionGroupId(newReferenceCompetitionGroupId);
    }

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

    const mupNameToMupId: { [key: string]: string } = {};
    allMupIds.forEach((mId) => {
      const mup = repo.mupData.data[mId];
      mupNameToMupId[mup.name] = mId;
    });

    setMupNames(new Set<string>(Object.keys(mupNameToMupId)));

    const competitionGroupIdToInfo: { [key: number]: ISubgroupReferenceInfo } =
      {};
    let newCanBeSync = true;
    if (newReferenceCompetitionGroupId !== null) {
      const referenceCompetitionGroupInfo =
        createSubgroupReferenceInfoFromCompetitionGroup(
          mupNameToMupId,
          repo.competitionGroupToSubgroupMetas[newReferenceCompetitionGroupId],
          repo.competitionGroupToSubgroupIds[newReferenceCompetitionGroupId],
          repo.subgroupData
        );
      competitionGroupIdToInfo[newReferenceCompetitionGroupId] =
        referenceCompetitionGroupInfo;

      for (const competitionGroupId of newCompetitionGroupIds) {
        if (competitionGroupId === newReferenceCompetitionGroupId) {
          continue;
        }
        const competitionGroupInfo =
          createSubgroupReferenceInfoFromCompetitionGroup(
            mupNameToMupId,
            repo.competitionGroupToSubgroupMetas[competitionGroupId],
            repo.competitionGroupToSubgroupIds[competitionGroupId],
            repo.subgroupData
          );
        competitionGroupIdToInfo[competitionGroupId] = competitionGroupInfo;
        const compatible = checkMupsAndLoadsCompatible(
          referenceCompetitionGroupInfo,
          competitionGroupInfo
        );
        if (!compatible) {
          newCanBeSync = false;
        }
      }
    }

    setCanBeSync(newCanBeSync);

    return {
      newReferenceCompetitionGroupId,
      newCompetitionGroupIds,
      mupNameToMupId,
      newCanBeSync,
      competitionGroupIdToInfo,
    };
  };

  const generateActions = (
    newReferenceCompetitionGroupId: number,
    newCompetitionGroupIds: number[],
    mupNameToMupId: { [key: string]: string },
    competitionGroupIdToInfo: { [key: number]: ISubgroupReferenceInfo }
  ) => {
    const repo = context.dataRepository;
    const newActions = createSyncActions(
      newReferenceCompetitionGroupId,
      newCompetitionGroupIds,
      mupNameToMupId,
      competitionGroupIdToInfo,
      repo.competitionGroupToSubgroupMetas
    );
    setSyncActions(newActions);
    return newActions;
  };

  const prepareMessages = (
    newReferenceCompetitionGroupId: number,
    newCompetitionGroupIds: number[],
    competitionGroupIdToInfo: { [key: number]: ISubgroupReferenceInfo },
    actions: ITSAction[]
  ) => {
    const mupNameToActions = getMupNameActions(actions);
    const mupNameToDiffMEssages = getDiffMessagesBySubgroupReferenceInfo(
      newReferenceCompetitionGroupId,
      newCompetitionGroupIds,
      competitionGroupIdToInfo
    );
    const newMupNameToMessages: { [key: string]: [string[], string[]] } = {};
    for (const mupName in mupNameToActions) {
      if (!newMupNameToMessages.hasOwnProperty(mupName)) {
        newMupNameToMessages[mupName] = [[], []];
      }
      newMupNameToMessages[mupName][1] = getTodoMessagesByActions(
        mupNameToActions[mupName]
      );
    }

    for (const mupName in mupNameToDiffMEssages) {
      if (!newMupNameToMessages.hasOwnProperty(mupName)) {
        newMupNameToMessages[mupName] = [[], []];
      }
      newMupNameToMessages[mupName][0] = mupNameToDiffMEssages[mupName];
    }
    setMupToMessages(newMupNameToMessages);
    return newMupNameToMessages;
  };

  const refreshData = (
    refreshAll: boolean = true,
    refreshSubgroups: boolean = false,
    competitionGroupId: number | null = null
  ) => {
    return ensureData(refreshAll, refreshSubgroups).then(() => {
      const {
        newReferenceCompetitionGroupId,
        newCompetitionGroupIds,
        mupNameToMupId,
        newCanBeSync,
        competitionGroupIdToInfo,
      } = prepareData(competitionGroupId);
      if (newReferenceCompetitionGroupId === null) {
        return;
      }
      if (!newCanBeSync) {
        return;
      }
      const actions = generateActions(
        newReferenceCompetitionGroupId,
        newCompetitionGroupIds,
        mupNameToMupId,
        competitionGroupIdToInfo
      );
      prepareMessages(
        newReferenceCompetitionGroupId,
        newCompetitionGroupIds,
        competitionGroupIdToInfo,
        actions
      );
    });
  };

  const refreshDataDebounced = (forceRefresh: boolean = true) => {
    debouncedWrapperForApply(() => {
      refreshData(forceRefresh);
    });
  };

  const refreshDataForNewReferenceCompetitionGroupDebounced = (
    competitionGroupId: number
  ) => {
    debouncedWrapperForApply(() => {
      refreshData(false, false, competitionGroupId);
    });
  };

  useEffect(() => {
    if (props.refreshCounter > 0) {
      if (props.selectionGroupIds.length !== 2) {
        return;
      }
      refreshData(false, true);
    }
    // eslint-disable-next-line
  }, [props.refreshCounter]);

  useEffect(() => {
    if (props.selectionGroupIds.length !== 2) {
      return;
    }
    refreshData(false);
    // eslint-disable-next-line
  }, [props.selectionGroupIds]);

  useEffect(() => {
    if (props.referenceCompetitionGroupId !== null) {
      setReferenceCompetitionGroupId(props.referenceCompetitionGroupId);
      refreshDataForNewReferenceCompetitionGroupDebounced(
        props.referenceCompetitionGroupId
      );
    }
    // eslint-disable-next-line
  }, [props.referenceCompetitionGroupId]);

  const handleReferenceCompetitionGroupChange = (event: SelectChangeEvent) => {
    const newReferenceCompetitionGroupIdStr = event.target.value;
    if (newReferenceCompetitionGroupIdStr !== null) {
      setApplyClicked(false);
      const newReferenceCompetitionGroupId = Number(
        newReferenceCompetitionGroupIdStr
      );

      if (isFinite(newReferenceCompetitionGroupId)) {
        setReferenceCompetitionGroupId(Number(newReferenceCompetitionGroupId));
        refreshDataForNewReferenceCompetitionGroupDebounced(
          newReferenceCompetitionGroupId
        );
      }
    }
  };

  const renderCompetitionGroupIsMissingMessage = () => {
    const selectionGroupNamesWithoutCompetitionGroups: string[] = [];
    props.selectionGroupIds.forEach((sgId) => {
      const selectionGroup =
        context.dataRepository.selectionGroupData.data[sgId];
      if (
        selectionGroup.competitionGroupId === null ||
        selectionGroup.competitionGroupId === undefined
      ) {
        selectionGroupNamesWithoutCompetitionGroups.push(selectionGroup.name);
      }
    });
    if (selectionGroupNamesWithoutCompetitionGroups.length === 0) return null;
    return (
      <div className="message_error">
        <p>Конкурсная группа отсутствует для следующих Групп выбора:</p>
        <ul className={style.list}>
          {selectionGroupNamesWithoutCompetitionGroups.map(
            (name: string, index: number) => (
              <li key={index}>{name}</li>
            )
          )}
        </ul>
        <p className="same_line_with_wrap">
          Создайте недостающие Конкрусные группы и укажите Группы выбора{" "}
          <OuterLink url={COMPETITION_GROUP_URL}>в ИТС</OuterLink>. И обновите
          данные.
        </p>
      </div>
    );
  };

  const renderMupsAreDifferent = () => {
    return (
      <h3 className="message_error">
        Состав МУПов или нагрузок в выбранных группах отличается, настройте МУПы
        и периоды на шаге 2
      </h3>
    );
  };

  const renderRows = () => {
    if (!canBeSync) return null;

    return Object.keys(mupToMessages)
      .sort()
      .map((mupName, i) => {
        let [differences, todos] = mupToMessages[mupName];
        const present = mupNames.has(mupName);
        if (!present) {
          differences = [
            "МУП не состоит в группах выбора, но имеет количество групп, не равное 0",
          ];
        }
        return (
          <tr key={i} className={present ? "" : "warning"}>
            <td>{mupName}</td>
            <td>
              <ul className={style.list}>
                {differences.map((val, index) => (
                  <li key={index}>{val}</li>
                ))}
                {differences.length === 0 && (
                  <li className="message_success">Нет отличий</li>
                )}
              </ul>
            </td>
            <td>
              <ul className={style.list}>
                {todos.map((val, index) => (
                  <li key={index}>{val}</li>
                ))}
                {todos.length === 0 && (
                  <li className="message_success">Нет действий</li>
                )}
              </ul>
            </td>
          </tr>
        );
      });
  };

  const renderTable = () => {
    return (
      <section className="table__container">
        <table className="table table_vertical_borders">
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "40%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>МУП</th>
              <th>Отличия</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>{competitionGroupIds.length === 2 && renderRows()}</tbody>
        </table>
      </section>
    );
  };

  const handleApplyReal = () => {
    setApplyClicked(true);
    setSyncInProgress(true);
    executeActions(syncActions, context)
      .then((results) => setSyncActionResults(results))
      .then(() => refreshDataDebounced())
      .finally(() => setSyncInProgress(false));
  };

  const handleApplyRealDebounced = () => {
    debouncedWrapperForApply(handleApplyReal);
  };

  const renderReferenceCompetitionGroupSelect = () => {
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
      <article className="same_line_with_wrap">
        <p>Выберите эталонную конкурсную группу для синхронизации</p>
        <SimpleSelect
          label={"Конкурсная группа"}
          items={items}
          selectedId={referenceCompetitionGroupId}
          onChange={handleReferenceCompetitionGroupChange}
        />
      </article>
    );
  };

  const renderCompetitionGroupSync = () => {
    return (
      <article>
        <p>
          Сравните оставшуюся Конкурсную группу с выбранной эталонной и
          синхронизируйте группы
        </p>
        <p>
          Таблица с отличиями Конкурсных групп и действиями для синхронизации:
        </p>
        <div className="load_content_container">
          {renderTable()}
          {ensureInProgress && <div className="progress_screen"></div>}
          {ensureInProgress && (
            <CircularProgress className="progress_icon" size="8rem" />
          )}
        </div>

        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={syncActions}
          actionResults={syncActionResults}
          onApply={handleApplyRealDebounced}
          clicked={applyClicked}
          loading={syncInProgress}
        >
          Синхронизировать конкурсные группы
        </ApplyButtonWithActionDisplay>
      </article>
    );
  };

  const renderContnet = () => {
    return (
      <React.Fragment>
        {!canBeSync && renderMupsAreDifferent()}

        <ol className="step_list">
          <li>{renderReferenceCompetitionGroupSelect()}</li>
          <li>{renderCompetitionGroupSync()}</li>
        </ol>
      </React.Fragment>
    );
  };

  return (
    <section className="step__container">
      <article>
        <RefreshButton
          onClick={refreshDataDebounced}
          title="Обновить данные"
          loading={ensureInProgress}
        />

        {competitionGroupIds.length !== 2 &&
          renderCompetitionGroupIsMissingMessage()}

        {competitionGroupIds.length === 2 && renderContnet()}
      </article>
    </section>
  );
}
