import React, { useState, useContext, useEffect, useRef } from "react";
import { ITSContext } from "../../../common/Context";
import style from "./CompetitionGroupSync.module.css";
import { ICompetitionGroupSyncProps } from "./types";
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

import { createDebouncedWrapper } from "../../../utils/helpers";
import { executeActions } from "../../../common/actions";
import { createSyncActions } from "./utils";

import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import { OuterLink } from "../../OuterLink";

import { RefreshButton } from "../../RefreshButton";
import CircularProgress from "@mui/material/CircularProgress";
import { SimpleSelect } from "../../SimpleSelect/SimpleSelect";
import { getCompetitionGroupName } from "../CompetitionGroupPreparation/CompetitionGroupPreparation";
import { SelectChangeEvent } from "@mui/material/Select";

function checkArraysSame(arr1: any[], arr2: any[]) {
  return arr1.sort().join(",") === arr2.sort().join(",");
}

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function CompetitionGroupSync(props: ICompetitionGroupSyncProps) {
  const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
  const [referenceCompetitionGroupId, setReferenceCompetitionGroupId] =
    useState<number | null>(null);
  const [mupIds, setMupIds] = useState<string[]>([]);
  const [mupIdsSame, setMupIdsSame] = useState<boolean>(true);
  // const [subgroupDiffInfo, setSubgroupDiffInfo] =
  //   useState<ISubgoupDiffInfo | null>(null);
  // const [mupToDiffs, setMupToDiffs] = useState<{
  //   [key: string]: IMupSubgroupDiff;
  // }>({});
  const [mupToDifferenceTodoMessages, setMupToDifferenceTodoMessages] =
    useState<{ [key: string]: string[] }>({});

  const [syncActions, setSyncActions] = useState<ITSAction[]>([]);
  const [syncActionResults, setSyncActionResults] = useState<
    IActionExecutionLogItem[]
  >([]);
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

  

  const ensureData = (
    refresh: boolean = false,
    forceRefreshSubgroups: boolean = false
  ) => {
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
      props.selectionGroupIds
    );

    setCompetitionGroupIds(newCompetitionGroupIds);

    let newReferenceCompetitionGroupId = referenceCompetitionGroupId;
    if (
      referenceCompetitionGroupId === null &&
      newCompetitionGroupIds.length > 0
    ) {
      newReferenceCompetitionGroupId = newCompetitionGroupIds[0];
      setReferenceCompetitionGroupId(newCompetitionGroupIds[0]);
    }

    const sgMupIds: string[][] = [];
    for (let sgId of props.selectionGroupIds) {
      sgMupIds.push(repo.selectionGroupToMupsData.data[sgId].ids);
    }
    if (!checkArraysSame(sgMupIds[0], sgMupIds[1])) {
      setMupIdsSame(false);
    } else {
      setMupIdsSame(true);
    }

    const mupNameToMupId: { [key: string]: string } = {};
    sgMupIds[0].forEach((mId) => {
      const mup = repo.mupData.data[mId];
      mupNameToMupId[mup.name] = mId;
    });

    return {
      newReferenceCompetitionGroupId,
      newCompetitionGroupIds,
      mupNameToMupId,
    };
  };

  const generateActions = (
    newReferenceCompetitionGroupId: number,
    newCompetitionGroupIds: number[],
    mupNameToMupId: { [key: string]: string }
  ) => {
    const repo = context.dataRepository;
    const newActions = createSyncActions(
      newReferenceCompetitionGroupId,
      newCompetitionGroupIds,
      mupNameToMupId,
      repo.competitionGroupToSubgroupMetas,
      repo.competitionGroupToSubgroupIds,
      repo.subgroupData
    );
    setSyncActions(newActions);
    return newActions;
  };

  const refreshData = (refreshAll: boolean = true, refreshSubgroups: boolean = false) => {
    return ensureData(true).then(() => {
      const {
        newReferenceCompetitionGroupId,
        newCompetitionGroupIds,
        mupNameToMupId,
      } = prepareData();
      if (newReferenceCompetitionGroupId === null) {
        console.warn(`newReferenceCompetitionGroupId is null`);
        return;
      }
      generateActions(
        newReferenceCompetitionGroupId,
        newCompetitionGroupIds,
        mupNameToMupId
      );
    });
  };


  const refreshDataDebounced = () => {
    debouncedWrapperForApply(() => {
      refreshData(true);
    });
  };

  useEffect(() => {
    if (props.selectionGroupIds.length !== 2) {
      return;
    }
    refreshData(false);
  }, [props.dataIsPrepared, props.selectionGroupIds]);

  const handleReferenceCompetitionGroupChange = (event: SelectChangeEvent) => {
    const newReferenceCompetitionGroupIdStr = event.target.value;
    if (newReferenceCompetitionGroupIdStr !== null) {
      const newReferenceCompetitionGroupId = Number(newReferenceCompetitionGroupIdStr);

      isFinite(newReferenceCompetitionGroupId) &&
      setReferenceCompetitionGroupId(Number(newReferenceCompetitionGroupId));
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
        <p>
          Создайте недостающие Конкрусные группы и укажите Группы выбора{" "}
          <OuterLink url={COMPETITION_GROUP_URL}>в ИТС</OuterLink>
        </p>
      </div>
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
        selectedId={referenceCompetitionGroupId}
        onChange={handleReferenceCompetitionGroupChange}
      />
    );
  };

  const renderRows = () => {
    return null;
    // if (!subgroupDiffInfo) return null;

    // return mupIds.sort(compareMupIds).map((mupId) => {
    //   const mup = context.dataRepository.mupData.data[mupId];

    //   if (!mupToDifferenceTodoMessages.hasOwnProperty(mup.name)) {
    //     throw new Error(
    //       `${mup.name} has no corresponding mupToDifferenceTodoMessages`
    //     );
    //   }
    //   const diffTodoMessages = mupToDifferenceTodoMessages[mup.name];

    //   return (
    //     <tr key={mupId}>
    //       <td>{mup.name}</td>
    //       <td>
    //         <ul className={style.list}>
    //           {diffTodoMessages[0].map((val, index) => (
    //             <li key={index}>{val}</li>
    //           ))}
    //         </ul>
    //       </td>
    //       <td>
    //         <ul className={style.list}>
    //           {diffTodoMessages[1].map((val, index) => (
    //             <li key={index}>{val}</li>
    //           ))}
    //         </ul>
    //       </td>
    //     </tr>
    //   );
    // });
  };

  const renderTable = () => {
    return (
      <section className="table__container">
        <table className="table table_vertical_borders">
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
    executeActions(syncActions, context)
      .then((results) => setSyncActionResults(results))
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
        {renderMupsAreDifferent()}

        {renderSelect()}

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
          actions={syncActions}
          actionResults={syncActionResults}
          onApply={handleApplyRealDebounced}
        >
          Применить изменения
        </ApplyButtonWithActionDisplay>
      </article>
    </section>
  );
}
