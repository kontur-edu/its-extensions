import React, { useContext, useEffect, useRef, useState } from "react";
import style from "./StudentsDistribution.module.css";
import Button from "@mui/material/Button";
import { IStudentsDistributionProps } from "./types";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import {
  IStudentAdmissionDistributionItem,
  getAllPersonalNumbers,
  prepareStudentItems,
  getAvailableAdmissionIds,
  createStudentsDistributionData,
  filterActiveStudentsAndSortByRating,
  parseStudentAdmissionsFromText,
  validateStudentAdmissions,
  createAdmissionRecord,
  findMupIdsWithTestResultRequired,
  createStudentDistributionAlgoInfos,
  getAvailableMupIds,
  createMupIdToMupAlgoInfo,
  createStudentDistribution,
  calcZE,
} from "../../../studentAdmission/studentDistribution";
import { ITSContext } from "../../../common/Context";
import { DEBOUNCE_MS } from "../../../utils/constants";
import { createDebouncedWrapper } from "../../../utils/helpers";
import { createStudentAdmissionActions } from "../../../studentAdmission/actionCreator";
import {
  executeActions,
  IActionExecutionLogItem,
  ITSAction,
} from "../../../common/actions";
import {
  createStudentDistributionMupToErrorMessages,
  createStudentMupPriorityData,
  // createStudentNumberToMupPrioritiesData,
  getMupIdsWithDifferentLimits,
} from "./utils";

import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import AutoFixNormalIcon from "@mui/icons-material/AutoFixNormal";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { CopyOrDownload } from "../../CopyOrDownload";
import { RefreshButton } from "../../RefreshButton";
import CircularProgress from "@mui/material/CircularProgress";

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);
const debouncedEnsureData = createDebouncedWrapper(DEBOUNCE_MS);

export function StudentsDistribution(props: IStudentsDistributionProps) {
  const [personalNumberToStudentItems, setPersonalNumberToStudentItems] =
    useState<{
      [key: string]: IStudentAdmissionDistributionItem;
    }>({});
  const [mupPrioritiesText, setMupPrioritiesText] = useState<string>("");
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
  const [studentAdmissionActions, setStudentAdmissionActions] = useState<
    ITSAction[]
  >([]);
  const [studentAdmissionActionResults, setStudentAdmissionActionResults] =
    useState<IActionExecutionLogItem[]>([]);
  const [mupToErrorMessages, setMupToErrorMessages] = useState<{
    [key: string]: string[];
  }>({});

  const tableRef = useRef<HTMLElement | null>(null);

  const [ensureInProgress, setEnsureInProgress] = useState<boolean>(false);
  const currentEnsurePromise = useRef<Promise<any> | null>(null);

  const context = useContext(ITSContext)!;

  const handleGoToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const ensureData = (refresh: boolean) => {
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
            mupToAdmission[mupId].admissionId
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
  };

  const refreshData = () => ensureData(true);

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

    const newPersonalNumberToStudentItems = prepareStudentItems(
      props.competitionGroupIds,
      context.dataRepository.mupData,
      context.dataRepository.competitionGroupIdToMupAdmissions,
      context.dataRepository.admissionInfo,
      context.dataRepository.admissionIdToMupId,
      context.dataRepository.studentData
    );

    const newMupIdsWithIncorrectLimitsSet = getMupIdsWithDifferentLimits(
      props.competitionGroupIds,
      context.dataRepository.competitionGroupIdToMupAdmissions
    );
    const newMupIdsWithIncorrectLimits: string[] = Array.from(
      newMupIdsWithIncorrectLimitsSet
    );

    setMupIdsWithIncorrectLimits(newMupIdsWithIncorrectLimits);

    setPersonalNumberToStudentItems(newPersonalNumberToStudentItems);

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
      newPersonalNumberToStudentItems,
      context.dataRepository.studentData,
      context.dataRepository.mupData,
      context.dataRepository.admissionIdToMupId,
      Array.from(availableAdmissionIds)
    );
    setStudentAdmissionsText(
      JSON.stringify(newStudentDistributionData, null, 2)
    );

    const newStudentPersonalNumberToMupPriorities =
      createStudentMupPriorityData(
        props.competitionGroupIds,
        context.dataRepository.competitionGroupIdToMupAdmissions,
        context.dataRepository.admissionInfo,
        context.dataRepository.mupData,
        context.dataRepository.studentData
      );
    const newStudentPersonalNumberToMupPrioritiesJson = JSON.stringify(
      newStudentPersonalNumberToMupPriorities,
      null,
      2
    );
    setMupPrioritiesText(newStudentPersonalNumberToMupPrioritiesJson);
  };

  useEffect(() => {
    return () => {};
  }, []);

  useEffect(() => {
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

    if (success) {
      const personalNumberToSelectedAdmissionIds: { [key: string]: string[] } =
        {};
      for (const studentInfo of newStudentsDistributionData.students) {
        personalNumberToSelectedAdmissionIds[studentInfo.personalNumber] =
          studentInfo.mupIds;
      }
      // Отобразить распределение в таблице
      const newPersonalNumberToStudentItems = prepareStudentItems(
        props.competitionGroupIds,
        context.dataRepository.mupData,
        context.dataRepository.competitionGroupIdToMupAdmissions,
        context.dataRepository.admissionInfo,
        context.dataRepository.admissionIdToMupId,
        context.dataRepository.studentData,
        personalNumberToSelectedAdmissionIds
      );

      setPersonalNumberToStudentItems(newPersonalNumberToStudentItems);

      generateActions(newPersonalNumberToStudentItems);
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
    for (const pn in personalNumberToStudentItems) {
      newPersonalNumberToStudentItems[pn] = {
        ...personalNumberToStudentItems[pn],
      };
    }

    const repo = context.dataRepository;

    const studentDistributionAlgoInfos = createStudentDistributionAlgoInfos(
      personalNumbersOfActiveStudentsSortedByRating.current,
      repo.studentData,
      repo.personalNumberToAdmittedMupNames,
      repo.mupData,
      repo.admissionInfo,
      repo.competitionGroupIdToMupAdmissions
    );

    const availableMupIds = getAvailableMupIds(
      props.competitionGroupIds,
      repo.competitionGroupIdToMupAdmissions
    );

    const mupAlgoInfo = createMupIdToMupAlgoInfo(
      availableMupIds,
      repo.mupData,
      mupIdsWithTestResultRequired.current
    );

    const personalNumberToAdmissionIds = createStudentDistribution(
      studentDistributionAlgoInfos,
      mupAlgoInfo,
      competitionGroupIdToZELimit.current,
      repo.competitionGroupIdToMupAdmissions
    );

    for (const pn in personalNumberToAdmissionIds) {
      const enrolledAdmissionIds = personalNumberToAdmissionIds[pn];
      const ze = calcZE(
        enrolledAdmissionIds,
        repo.mupData,
        repo.admissionIdToMupId
      );
      newPersonalNumberToStudentItems[pn].currentZE = ze;
      newPersonalNumberToStudentItems[pn].assignedAdmissionIds =
        Array.from(enrolledAdmissionIds);
    }

    setPersonalNumberToStudentItems(newPersonalNumberToStudentItems);

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
          const newMupToErrorMessages =
            createStudentDistributionMupToErrorMessages(
              actionResults,
              studentAdmissionActions,
              context.dataRepository.admissionIdToMupId,
              context.dataRepository.mupData
            );
          setMupToErrorMessages(newMupToErrorMessages);
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
        if (!personalNumberToStudentItems.hasOwnProperty(personalNumber)) {
          return null;
        }
        const studentItem = personalNumberToStudentItems[personalNumber];
        const student = context.dataRepository.studentData.data[personalNumber];
        const selectedMupRecords = studentItem.assignedAdmissionIds.map((aId) =>
          createAdmissionRecord(
            aId,
            personalNumber,
            context.dataRepository.admissionInfo,
            context.dataRepository.mupData,
            context.dataRepository.admissionIdToMupId
          )
        );
        const remainingMupRecords =
          studentItem.admissionIdsWithPriorityOrTestResult
            .filter(
              (aId, idx) => !studentItem.assignedAdmissionIds.includes(aId)
            )
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
              {/* {student.personalNumber} */}
            </td>
            <td>{student.groupName}</td>
            <td>{student.rating}</td>
            <td>{studentItem.currentZE}</td>
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

  const renderMupToErrorMessages = () => {
    return Object.keys(mupToErrorMessages).map((mupName, i) => {
      if (mupToErrorMessages[mupName].length === 0) return null;
      const messages = mupToErrorMessages[mupName];
      return (
        <li key={i}>
          "{mupName}":
          <ul>
            {messages.map((message, mIdx) => (
              <li key={mIdx}>{message}</li>
            ))}
          </ul>
        </li>
      );
    });
  };

  const renderContent = () => {
    return (
      <React.Fragment>
        {renderTable()}
        <CopyOrDownload
          title="Скопировать приоритеты студентов на дисциплины по выбору"
          filename="StudentMupPriorities.json"
          data={mupPrioritiesText}
        />{" "}
        <br />
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
        {Object.keys(mupToErrorMessages).length > 0 && (
          <article className={style.error_list_container}>
            <ul className="warning">{renderMupToErrorMessages()}</ul>
          </article>
        )}
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
