import React, { useState, useContext, useEffect, useRef } from "react";
import { ITSContext } from "../../../common/Context";
import style from "./SubgroupSelection.module.css";
import { ISubgroupSelectionProps } from "./types";
import {
  COMPETITION_GROUP_URL,
  COMPETITION_GROUP_SUBGROUP_META_URL,
  DEBOUNCE_MS,
} from "../../../utils/constants";
import { ISubgoupDiffInfo, IMupSubgroupDiff } from "../../../common/types";
import { REQUEST_ERROR_UNAUTHORIZED } from "../../../utils/constants";
import { ITSAction } from "../../../common/actions";
import { IActionExecutionLogItem } from "../../../common/actions";

import {
  createActionsByDiffs,
  getMupNameActions,
} from "../../../subgroupUpdater/actionCreator";
import {
  createSubgroupDiffInfo,
  createSubgroupDiffs,
  createMupToDifferenceMessages,
  createTodoMessages,
} from "../../../subgroupUpdater/subgroupDiffs";

import { createDebouncedWrapper } from "../../../utils/helpers";
import { executeActions } from "../../../common/actions";

import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import { OuterLink } from "../../OuterLink";

import { RefreshButton } from "../../RefreshButton";
import CircularProgress from "@mui/material/CircularProgress";

function checkArraysSame(arr1: any[], arr2: any[]) {
  return arr1.sort().join(",") === arr2.sort().join(",");
}

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function SubgroupSelection(props: ISubgroupSelectionProps) {
  const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
  const [mupIds, setMupIds] = useState<string[]>([]);
  const [mupIdsSame, setMupIdsSame] = useState<boolean>(true);
  const [subgroupDiffInfo, setSubgroupDiffInfo] =
    useState<ISubgoupDiffInfo | null>(null);
  // const [mupToDiffs, setMupToDiffs] = useState<{
  //   [key: string]: IMupSubgroupDiff;
  // }>({});
  const [mupToDifferenceTodoMessages, setMupToDifferenceTodoMessages] =
    useState<{ [key: string]: [string[], string[]] }>({});

  const [subgroupSelectionActions, setSubgroupSelectionActions] = useState<
    ITSAction[]
  >([]);
  const [subgroupSelectionActionsResults, setSubgroupSelectionActionsResults] =
    useState<IActionExecutionLogItem[]>([]);
  const [ensureInProgress, setEnsureInProgress] = useState<boolean>(false);
  const currentEnsurePromise = useRef<Promise<any> | null>(null);

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

  const ensureData = (refresh: boolean) => {
    console.log("SubgroupSelection: ensureData");
    if (currentEnsurePromise.current !== null) {
      console.log("SubgroupSelection: ensureData is already in progress");
      return currentEnsurePromise.current;
    }
    setEnsureInProgress(true);
    // currentEnsurePromise.current = Promise.resolve();

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
      props.selectionGroupIds
    );
    setCompetitionGroupIds(newCompetitionGroupIds);

    const sgMupIds: string[][] = [];
    for (let sgId of props.selectionGroupIds) {
      sgMupIds.push(
        context.dataRepository.selectionGroupToMupsData.data[sgId].ids
      );
    }
    if (!checkArraysSame(sgMupIds[0], sgMupIds[1])) {
      setMupIdsSame(false);
      // alert(`not setMupIdsSame`);
      return;
    }

    setMupIdsSame(true);
    setMupIds(sgMupIds[0]);
    const mupNames: string[] = [];

    for (let mupId of sgMupIds[0]) {
      const mup = context.dataRepository.mupData.data[mupId];
      mupNames.push(mup.name);
    }
    // console.log("creating subgoupDiffInfo");
    // console.log("context.dataRepository.competitionGroupToSubgroupMetas");
    //     console.log(context.dataRepository.competitionGroupToSubgroupMetas);
    // console.log("context.dataRepository.competitionGroupToSubgroupIds");
    //     console.log(context.dataRepository.competitionGroupToSubgroupIds);
    // console.log("context.dataRepository.subgroupData");
    //     console.log(context.dataRepository.subgroupData);
    const newSubgoupDiffInfo: ISubgoupDiffInfo = createSubgroupDiffInfo(
      newCompetitionGroupIds,
      context.dataRepository.competitionGroupToSubgroupMetas,
      context.dataRepository.competitionGroupToSubgroupIds,
      context.dataRepository.subgroupData
    );
    console.log("subgoupDiffInfo");
    console.log(newSubgoupDiffInfo);
    setSubgroupDiffInfo(newSubgoupDiffInfo);

    const newMupToDiffs: { [key: string]: IMupSubgroupDiff } =
      createSubgroupDiffs(
        mupNames,
        newCompetitionGroupIds,
        newSubgoupDiffInfo,
        context.dataRepository.subgroupData
      );
    console.log("newMupToDiffs");
    console.log(newMupToDiffs);
    // setMupToDiffs(newMupToDiffs);

    const newActions = createActionsByDiffs(
      newCompetitionGroupIds,
      newMupToDiffs,
      newSubgoupDiffInfo
      // context.dataRepository.subgroupData
    );

    console.log("SubgroupSelection: newActions");
    console.log(newActions);

    setSubgroupSelectionActions(newActions);

    const mupNameToActions = getMupNameActions(newActions);

    const newMupToDifferenceMessages = createMupToDifferenceMessages(
      mupNames,
      newMupToDiffs,
      // newCompetitionGroupIds,
      newSubgoupDiffInfo
    );
    console.log("newMupToDifferenceMessages");
    console.log(newMupToDifferenceMessages);

    const mupToDifferenceTodoMessages: {
      [key: string]: [string[], string[]];
    } = {};
    for (const mupName of mupNames) {
      let mupActions: ITSAction[] = [];
      if (mupNameToActions.hasOwnProperty(mupName)) {
        mupActions = mupNameToActions[mupName];
      }
      if (!newMupToDiffs.hasOwnProperty(mupName)) {
        throw new Error(`${mupName} has no corresponding newMupToDiffs`);
      }
      const todoMessages = createTodoMessages(
        // newMupToDiffs[mupName],
        mupActions
      );
      mupToDifferenceTodoMessages[mupName] = [
        newMupToDifferenceMessages[mupName],
        todoMessages,
      ];
    }

    setMupToDifferenceTodoMessages(mupToDifferenceTodoMessages);
  };

  const refreshData = () => {
    return ensureData(true).then(() => prepareData());
  };

  const refreshDataDebounced = () => {
    debouncedWrapperForApply(() => {
      refreshData();
    });
  };

  useEffect(() => {
    if (props.selectionGroupIds.length !== 2) {
      return;
    }
    ensureData(false).then(() => {
      prepareData();
    });
    // handleApply();
  }, [props.dataIsPrepared, props.selectionGroupIds]);

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
        <p>
          Создайте недостающие Конкрусные группы и укажите Группы выбора{" "}
          <OuterLink url={COMPETITION_GROUP_URL}>в ИТС</OuterLink>
        </p>
      </div>
    );
  };

  const renderCompetitionGroupSubgroupMetaLinks = () => {
    if (competitionGroupIds.length !== 2) return null;
    return (
      <React.Fragment>
        <h3>Заполните подгруппы для одной Конкурсной группы Групп выбора:</h3>
        <ul className={style.list}>
          {props.selectionGroupIds.map((sgId) => {
            const selectionGroup =
              context.dataRepository.selectionGroupData.data[sgId];
            const competitionGroupName = selectionGroup.competitionGroupName;
            const link =
              COMPETITION_GROUP_SUBGROUP_META_URL +
              selectionGroup.competitionGroupId;
            return (
              <li key={sgId}>
                <OuterLink url={link}>{competitionGroupName}</OuterLink>
              </li>
            );
          })}
        </ul>
      </React.Fragment>
    );
  };

  const renderMupsAreDifferent = () => {
    if (mupIdsSame) return null;
    return (
      <h3 className="message_error">
        Состав МУПов в выбранных группах отличается, настройте МУПы на
        предыдущем шаге
      </h3>
    );
  };

  const compareMupIds = (lhsMupId: string, rhsMupId: string) => {
    const lhsName = context.dataRepository.mupData.data[lhsMupId]?.name ?? "";
    const rhsName = context.dataRepository.mupData.data[rhsMupId]?.name ?? "";
    return lhsName.localeCompare(rhsName);
  };

  const renderRows = () => {
    if (!subgroupDiffInfo) return null;

    return mupIds.sort(compareMupIds).map((mupId) => {
      const mup = context.dataRepository.mupData.data[mupId];

      if (!mupToDifferenceTodoMessages.hasOwnProperty(mup.name)) {
        throw new Error(
          `${mup.name} has no corresponding mupToDifferenceTodoMessages`
        );
      }
      const diffTodoMessages = mupToDifferenceTodoMessages[mup.name];

      return (
        <tr key={mupId}>
          <td>{mup.name}</td>
          <td>
            <ul className={style.list}>
              {diffTodoMessages[0].map((val, index) => (
                <li key={index}>{val}</li>
              ))}
            </ul>
          </td>
          <td>
            <ul className={style.list}>
              {diffTodoMessages[1].map((val, index) => (
                <li key={index}>{val}</li>
              ))}
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
          <thead>
            <tr>
              <th>МУП</th>
              <th>Отличия</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>{competitionGroupIds.length === 2 && renderRows()}</tbody>
        </table>
      </section>
    );
  };

  const handleApplyReal = () => {
    executeActions(subgroupSelectionActions, context)
      .then((results) => setSubgroupSelectionActionsResults(results))
      .then(() => alert("Применение изменений завершено"))
      .then(() => refreshDataDebounced())
      .catch((err) => {
        if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
          props.onUnauthorized();
          return;
        }
        throw err;
      });
  };

  const handleApplyRealDebounced = () => {
    debouncedWrapperForApply(handleApplyReal);
  };

  return (
    <section className="step__container">
      <article>
        {competitionGroupIds.length !== 2 &&
          renderCompetitionGroupIsMissingMessage()}
        {renderCompetitionGroupSubgroupMetaLinks()}
        {renderMupsAreDifferent()}

        <h4>Сравение Конкурсных групп:</h4>
        <RefreshButton
          onClick={refreshDataDebounced}
          title="Обновить список"
          loading={ensureInProgress}
        />
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
          actions={subgroupSelectionActions}
          actionResults={subgroupSelectionActionsResults}
          onApply={handleApplyRealDebounced}
        />
      </article>
    </section>
  );
}
