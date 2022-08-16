import React, { useContext, useEffect, useRef, useState } from "react";
import style from "./StudentsDistribution.module.css";
import Button from "@mui/material/Button";
import { IStudentsDistributionProps } from "./types";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import {
  IStudentAdmissionDistributionItem,
  IMupDistributionItem,
  getAllPersonalNumbers,
  prepareStudentAndMupItems,
  getAvailableAdmissionIds,
  createStudentsDistributionData,
  filterActiveStudentsAndSortByRating,
  parseStudentAdmissionsFromText,
  validateStudentAdmissions,
  createAdmissionRecord,
  findMupIdsWithTestResultRequired,
  tryDistributeMupsByStudentRatingAndAdmissionPriority,
  addRandomMupsForStudentIfNeeded,
} from "../../../studentAdmission/studentDistributor";
import { ITSContext } from "../../../common/Context";
import { DEBOUNCE_MS } from "../../../utils/constants";
import { createDebouncedWrapper } from "../../../utils/helpers";
import { createStudentAdmissionActions } from "../../../studentAdmission/actionCreator";
import {
  executeActions,
  IActionExecutionLogItem,
  ITSAction,
} from "../../../common/actions";
import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import AutoFixNormalIcon from "@mui/icons-material/AutoFixNormal";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { CopyOrDownload } from "../../CopyOrDownload";
import { RefreshButton } from "../../RefreshButton";
import CircularProgress from "@mui/material/CircularProgress";
// import { createPersonalNumberToAdmittedMupNames } from "./utils";

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);
const debouncedEnsureData = createDebouncedWrapper(DEBOUNCE_MS);

export function StudentsDistribution(props: IStudentsDistributionProps) {
  const [personalNumberToStudentItems, setPersonalNumberToStudentItems] =
    useState<{
      [key: string]: IStudentAdmissionDistributionItem;
    }>({});
  const [mupIdToMupItems, setMupIdToMupItems] = useState<{
    [key: string]: IMupDistributionItem;
  }>({});

  const [studentAdmissionsText, setStudentAdmissionsText] =
    useState<string>("");
  const [studentAdmissionsTextInput, setStudentAdmissionsTextInput] =
    useState<string>("");
  const [
    studentAdmissionsTextInputMessages,
    setStudentAdmissionsTextInputMessages,
  ] = useState<string[]>([]);
  const [mupIdsWithIncorrectLimits, setMupIdsWithIncorrectLimits] = useState<
    string[]
  >([]);
  const [manualEditOpen, setManualEditOpen] = useState<boolean>(false);
  const mupIdsWithTestResultRequired = useRef<Set<string>>(new Set<string>());
  const competitionGroupIdToZELimit = useRef<{ [key: number]: number }>({});
  const personalNumbersOfActiveStudentsSortedByRating = useRef<string[]>([]);
  // const refreshInProgress = useRef<boolean>(false);
  const [studentAdmissionActions, setStudentAdmissionActions] = useState<
    ITSAction[]
  >([]);
  const [studentAdmissionActionResults, setStudentAdmissionActionResults] =
    useState<IActionExecutionLogItem[]>([]);

  // const [personalNumberToAdmittedMupNames, setPersonalNumberToAdmittedMupNames] = useState<{[key: string]: Set<string>}>({});

  const tableRef = useRef<HTMLElement | null>(null);

  const [ensureInProgress, setEnsureInProgress] = useState<boolean>(false);
  const currentEnsurePromise = useRef<Promise<any> | null>(null);

  const context = useContext(ITSContext)!;

  const handleGoToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const ensureData = (refresh: boolean) => {
    // console.log("StudentsDistribution: ensureData");
    if (currentEnsurePromise.current !== null) {
      return currentEnsurePromise.current;
    }
    setEnsureInProgress(true);
    const repo = context.dataRepository;

    const updateMupDataPromise = () =>
      repo.mupData.ids.length > 0 ? Promise.resolve() : repo.UpdateMupData();
    const updateSelectionGroupDataPromise = () =>
      repo.selectionGroupData.ids.length > 0
        ? Promise.resolve()
        : repo.UpdateSelectionGroupData();
    const updateAdmissionMetasPromise = () =>
      !refresh && repo.CheckAdmissionMetasPresent(props.competitionGroupIds)
        ? Promise.resolve()
        : repo.UpdateAdmissionMetas(props.competitionGroupIds);
    const updateStudentAdmissionsAndStudentDataPromise = () => {
      const competitionGroupIdToAdmissionIds: { [key: number]: number[] } = {};
      for (const competitionGroupId of props.competitionGroupIds) {
        competitionGroupIdToAdmissionIds[competitionGroupId] = [];
        const mupToAdmission =
          context.dataRepository.competitionGroupIdToMupAdmissions[
            competitionGroupId
          ];
        for (const mupId in mupToAdmission) {
          competitionGroupIdToAdmissionIds[competitionGroupId].push(
            mupToAdmission[mupId].admissionsId
          );
        }
      }
      return context.dataRepository.UpdateStudentAdmissionsAndStudentData(
        competitionGroupIdToAdmissionIds
      );
    };
    const updatePersonalNumberToAdmittedMupNames = () =>
      !refresh && Object.keys(repo.personalNumberToAdmittedMupNames).length > 0
        ? Promise.resolve()
        : repo.UpdatePersonalNumberToAdmittedMupNames();
    return Promise.allSettled([
      updateMupDataPromise(),
      updateSelectionGroupDataPromise(),
      updateAdmissionMetasPromise().then(() =>
        updateStudentAdmissionsAndStudentDataPromise()
      ),
    ])
      .then(() => updatePersonalNumberToAdmittedMupNames())
      .finally(() => {
        currentEnsurePromise.current = null;
        setEnsureInProgress(false);
      });
    // .catch((err) => {
    //   currentEnsurePromise.current = null;
    //   setEnsureInProgress(false);
    //   console.warn(`catch: ${err.message}`);
    //   if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
    //     props.onUnauthorized();
    //     return;
    //   }
    //   throw err;
    // });
  };

  const refreshData = () => ensureData(true);

  // const preparePersonalNumberToAdmittedMupNames = async () => {
  //   const res = await createPersonalNumberToAdmittedMupNames(
  //     context.apiService,
  //     context.dataRepository.selectionGroupData,
  //     context.dataRepository.mupData,
  //   );
  //   setPersonalNumberToAdmittedMupNames(res);
  //   console.log(res);
  //   return res;
  // }

  const prepareItemsAndStudentMupDataText = () => {
    const allPersonalNumbers = getAllPersonalNumbers(
      props.competitionGroupIds,
      context.dataRepository.competitionGroupIdToMupAdmissions,
      context.dataRepository.admissionInfo
    );
    personalNumbersOfActiveStudentsSortedByRating.current =
      filterActiveStudentsAndSortByRating(
        Array.from(allPersonalNumbers),
        context.dataRepository.studentData
      );

    const studentAndMupItems = prepareStudentAndMupItems(
      props.competitionGroupIds,
      context.dataRepository.mupData,
      context.dataRepository.competitionGroupIdToMupAdmissions,
      context.dataRepository.admissionInfo,
      context.dataRepository.admissionIdToMupId,
      context.dataRepository.studentData
    );

    const newMupIdsWithIncorrectLimits: string[] = [];
    for (const mupId in studentAndMupItems.mupIdToMupItems) {
      if (!studentAndMupItems.mupIdToMupItems[mupId].valid) {
        newMupIdsWithIncorrectLimits.push(mupId);
      }
    }
    setMupIdsWithIncorrectLimits(newMupIdsWithIncorrectLimits);

    setPersonalNumberToStudentItems(
      studentAndMupItems.personalNumberToStudentItems
    );
    setMupIdToMupItems(studentAndMupItems.mupIdToMupItems);

    mupIdsWithTestResultRequired.current = findMupIdsWithTestResultRequired(
      props.competitionGroupIds,
      context.dataRepository.competitionGroupIdToMupAdmissions,
      context.dataRepository.admissionInfo
    );

    const newZeLimits: { [key: number]: number } = {};
    for (const competitionGroupId of props.competitionGroupIds) {
      for (const selectionGroupId of context.dataRepository.selectionGroupData
        .ids) {
        const selectionGroup =
          context.dataRepository.selectionGroupData.data[selectionGroupId];
        if (selectionGroup.competitionGroupId === competitionGroupId) {
          newZeLimits[competitionGroupId] = selectionGroup.unitSum;
          break;
        }
      }
    }
    competitionGroupIdToZELimit.current = newZeLimits;

    const availableAdmissionIds = getAvailableAdmissionIds(
      props.competitionGroupIds,
      context.dataRepository.competitionGroupIdToMupAdmissions
    );
    const newStudentDistributionData = createStudentsDistributionData(
      studentAndMupItems.personalNumberToStudentItems,
      context.dataRepository.studentData,
      context.dataRepository.mupData,
      context.dataRepository.admissionIdToMupId,
      Array.from(availableAdmissionIds)
    );
    setStudentAdmissionsText(
      JSON.stringify(newStudentDistributionData, null, 2)
    );
  };

  useEffect(() => {
    return () => {
      // console.warn("StudentDistribution UNMOUNTED");
    };
  }, []);

  useEffect(() => {
    // console.log(
    //   "------- props.competitionGroupIds changed, ",
    //   props.competitionGroupIds
    // );
    debouncedEnsureData(() =>
      refreshData()
        .then(() => prepareItemsAndStudentMupDataText())
        .finally(() => props.onLoad())
    );
    // eslint-disable-next-line
  }, [props.competitionGroupIds]);

  const handleRefresh = () => {
    return refreshData().then(() => prepareItemsAndStudentMupDataText());
  };

  const handleRefreshDebounced = () => {
    debouncedWrapperForApply(handleRefresh);
  };

  const handleStudentAdmissionsTextInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setStudentAdmissionsTextInput(value);
  };

  const handleParseStudentAdmissionsFromTextArea = () => {
    const newStudentsDistributionData = parseStudentAdmissionsFromText(
      studentAdmissionsTextInput
    );
    if (newStudentsDistributionData === null) {
      setStudentAdmissionsTextInputMessages([
        "Неверный формат, пример формата можно получить под таблицей",
      ]);
      return;
    }
    const { success, messages } = validateStudentAdmissions(
      newStudentsDistributionData,
      context.dataRepository.studentData,
      context.dataRepository.mupData,
      context.dataRepository.competitionGroupIdToMupAdmissions
    );
    setStudentAdmissionsTextInputMessages(messages);
    // console.log("validateStudentAdmissions");
    // console.log({ success, messages });

    if (success) {
      const personalNumberToSelectedAdmissionIds: { [key: string]: string[] } =
        {};
      for (const studentInfo of newStudentsDistributionData.students) {
        personalNumberToSelectedAdmissionIds[studentInfo.personalNumber] =
          studentInfo.mupIds;
      }
      // Отобразить распределение в таблице
      const studentAndMupItems = prepareStudentAndMupItems(
        props.competitionGroupIds,
        context.dataRepository.mupData,
        context.dataRepository.competitionGroupIdToMupAdmissions,
        context.dataRepository.admissionInfo,
        context.dataRepository.admissionIdToMupId,
        context.dataRepository.studentData,
        personalNumberToSelectedAdmissionIds
      );

      setPersonalNumberToStudentItems(
        studentAndMupItems.personalNumberToStudentItems
      );
      setMupIdToMupItems(studentAndMupItems.mupIdToMupItems);

      generateActions(studentAndMupItems.personalNumberToStudentItems);
    } else {
    }
  };

  const renderStudentAdmissionsTextInputMessages = () => {
    return (
      <ul className="warning">
        {studentAdmissionsTextInputMessages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    );
  };

  const distributeRemainingStudents = () => {
    const newPersonalNumberToStudentItems: {
      [key: string]: IStudentAdmissionDistributionItem;
    } = {};
    const newMupIdToMupItems: {
      [key: string]: IMupDistributionItem;
    } = {};
    for (const pn in personalNumberToStudentItems) {
      newPersonalNumberToStudentItems[pn] = {
        ...personalNumberToStudentItems[pn],
      };
    }
    for (const mupId in mupIdToMupItems) {
      newMupIdToMupItems[mupId] = { ...mupIdToMupItems[mupId] };
    }

    const repo = context.dataRepository;

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      newPersonalNumberToStudentItems,
      newMupIdToMupItems,
      mupIdsWithTestResultRequired.current,
      competitionGroupIdToZELimit.current,
      personalNumbersOfActiveStudentsSortedByRating.current,
      repo.mupData,
      repo.admissionIdToMupId,
      repo.admissionInfo
    );

    addRandomMupsForStudentIfNeeded(
      personalNumbersOfActiveStudentsSortedByRating.current,
      newPersonalNumberToStudentItems,
      newMupIdToMupItems,
      mupIdsWithTestResultRequired.current,
      competitionGroupIdToZELimit.current,
      repo.personalNumberToAdmittedMupNames,
      repo.admissionIdToMupId,
      repo.mupData,
      repo.competitionGroupIdToMupAdmissions,
      repo.admissionInfo
    );

    setPersonalNumberToStudentItems(newPersonalNumberToStudentItems);
    setMupIdToMupItems(newMupIdToMupItems);

    return newPersonalNumberToStudentItems;
  };

  const generateActions = (newPersonalNumberToStudentItems: {
    [key: string]: IStudentAdmissionDistributionItem;
  }) => {
    const actions = createStudentAdmissionActions(
      newPersonalNumberToStudentItems,
      context.dataRepository.admissionInfo,
      context.dataRepository.studentData
    );

    setStudentAdmissionActions(actions);
    return actions;
  };

  const handleDistributeRemainingStudents = () => {
    const newPersonalNumberToStudentItems = distributeRemainingStudents();
    generateActions(newPersonalNumberToStudentItems);
  };

  const handleRealApplyDebounced = () => {
    debouncedWrapperForApply(() => {
      executeActions(studentAdmissionActions, context)
        .then((actionResults) => {
          setStudentAdmissionActionResults(actionResults);
          return handleRefresh();
        })
        .then(() => generateActions(personalNumberToStudentItems));
    });
  };

  const toggleManualEditSection = () => {
    setManualEditOpen(!manualEditOpen);
  };

  const renderErrorMessage = () => {
    const mupNames = mupIdsWithIncorrectLimits
      .map((mupId) => context.dataRepository.mupData.data[mupId].name)
      .sort();
    return mupIdsWithIncorrectLimits.length === 0 ? null : (
      <div className="warning">
        Выбранные Конкурсные группы имеют разные Лимиты для следующий МУПов:
        <ul className="list_without_decorations">
          {mupNames.map((mupName, i) => (
            <li key={i}>{mupName}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderRows = () => {
    return personalNumbersOfActiveStudentsSortedByRating.current.map(
      (personalNumber) => {
        const studentItem = personalNumberToStudentItems[personalNumber];
        const student = context.dataRepository.studentData.data[personalNumber];
        const selectedMupRecords = studentItem.selectedAdmissionIds.map((aId) =>
          createAdmissionRecord(
            aId,
            personalNumber,
            context.dataRepository.admissionInfo,
            context.dataRepository.mupData,
            context.dataRepository.admissionIdToMupId
          )
        );
        const remainingMupRecords = studentItem.admissionIds
          .filter((aId, idx) => !studentItem.selectedAdmissionIds.includes(aId))
          .map((aId) =>
            createAdmissionRecord(
              aId,
              personalNumber,
              context.dataRepository.admissionInfo,
              context.dataRepository.mupData,
              context.dataRepository.admissionIdToMupId
            )
          );
        return (
          <tr key={personalNumber}>
            <td>
              {student.surname} {student.firstname} {student.patronymic}{" "}
              {student.personalNumber}
            </td>
            <td>{student.groupName}</td>
            <td>{student.rating}</td>
            <td>{studentItem.currentZ}</td>
            <td>
              <ul className="list_without_decorations">
                {selectedMupRecords.map((record, index) => (
                  <li
                    key={index}
                    className={record.initStatus !== 1 ? "warning" : ""}
                  >
                    {`${record.priority ?? "*"}. ${record.name}`}
                  </li>
                ))}
              </ul>
            </td>
            <td>
              <ul className="list_without_decorations">
                {remainingMupRecords.map((record, index) => (
                  <li
                    key={index}
                    className={record.initStatus === 1 ? "warning" : ""}
                  >
                    {`${record.priority ?? "*"}. ${record.name}`}
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        );
      }
    );
  };

  const renderAdmissionsInput = () => {
    return (
      <React.Fragment>
        <h4>
          Вставьте распределение студентов по МУПам (формат данных как в файле
          сверху)
        </h4>
        <textarea
          value={studentAdmissionsTextInput}
          onChange={handleStudentAdmissionsTextInputChange}
          rows={10}
          placeholder="Вставьте содержимое файла с распределением студентов по группам"
        />
        <div className={style.button_container}>
          <Button
            onClick={handleParseStudentAdmissionsFromTextArea}
            style={{ flexGrow: 1, marginBottom: "1.2em" }}
          >
            Распарсить и отобразить в таблице
          </Button>
          <Button onClick={handleGoToTable}>
            <ArrowUpwardIcon />
          </Button>
        </div>
        {studentAdmissionsTextInputMessages.length > 0 &&
          renderStudentAdmissionsTextInputMessages()}
      </React.Fragment>
    );
  };

  const renderTable = () => {
    return (
      <article>
        <RefreshButton
          onClick={handleRefreshDebounced}
          title="Обновить список"
          loading={ensureInProgress}
        />
        <div className="load_content_container">
          <section className="table__container" ref={tableRef}>
            <table className="table table_vertical_borders">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Группа</th>
                  <th>Рейтинг</th>
                  <th>З.Е.</th>
                  <th>Зачислен на курсы</th>
                  <th>Приоритеты оставшихся курсов</th>
                </tr>
              </thead>
              <tbody>{renderRows()}</tbody>
            </table>
          </section>
          {ensureInProgress && <div className="progress_screen"></div>}
          {ensureInProgress && (
            <CircularProgress className="progress_icon" size="8rem" />
          )}
        </div>
      </article>
    );
  };

  const renderContent = () => {
    return (
      <React.Fragment>
        {renderTable()}

        <Button
          onClick={handleDistributeRemainingStudents}
          variant="contained"
          style={{
            alignSelf: "flex-start",
          }}
          startIcon={<AutoFixNormalIcon />}
        >
          {" "}
          Дораспределить студентов по курсам
        </Button>

        <Button
          onClick={toggleManualEditSection}
          style={{
            alignSelf: "flex-start",
            margin: "1em 0",
          }}
          startIcon={<EditIcon />}
        >
          Редактирование вручную{" "}
          {manualEditOpen ? <ExpandLess /> : <ExpandMore />}
        </Button>
        <Collapse in={manualEditOpen} timeout="auto" unmountOnExit>
          <div className={style.manualEdit__container}>
            <h4>Распределение по курсам в ИТС</h4>
            <CopyOrDownload
              title="Скопировать распределение"
              filename="StudentAdmissions.json"
              data={studentAdmissionsText}
            />

            {renderAdmissionsInput()}
          </div>
        </Collapse>

        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={studentAdmissionActions}
          actionResults={studentAdmissionActionResults}
          onApply={handleRealApplyDebounced}
          onNextStep={props.onNextStep}
        >
          Применить изменения
        </ApplyButtonWithActionDisplay>
      </React.Fragment>
    );
  };

  return (
    <section className="step__container">
      {renderErrorMessage()}

      {mupIdsWithIncorrectLimits.length === 0 && renderContent()}
    </section>
  );
}
