import React, { useContext, useEffect, useRef, useState } from "react";
import style from "./StudentsDistribution.module.css";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";
import { IStudentsDistributionProps } from "./types";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import {
  IStudentAdmissionDistributionItem,
  IMupDistributionItem,
  getAllPersonalNumbers,
  // createPersonalNumberToStudentItem,
  // createMupIdToMupItem,
  // createMupIdToMupItemByStudentItems,
  prepareStudentAndMupItems,
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
import {
  REQUEST_ERROR_UNAUTHORIZED,
  DEBOUNCE_MS,
} from "../../../utils/constants";
import {
  createDebouncedWrapper,
  downloadFileFromText,
} from "../../../utils/helpers";
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

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

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
  const refreshInProgress = useRef<boolean>(false);
  const [studentAdmissionActions, setStudentAdmissionActions] = useState<
    ITSAction[]
  >([]);
  const [studentAdmissionActionResults, setStudentAdmissionActionResults] =
    useState<IActionExecutionLogItem[]>([]);

  const context = useContext(ITSContext)!;

  const refreshData = () => {
    if (refreshInProgress.current) return Promise.resolve();
    refreshInProgress.current = true;
    let ensureMupDataPromise = Promise.resolve();
    if (context.dataRepository.mupData.ids.length === 0) {
      // update mupData
      ensureMupDataPromise = context.dataRepository.UpdateMupData();
    }
    let ensureSelectionGroupDataPromise = Promise.resolve();
    if (context.dataRepository.selectionGroupData.ids.length === 0) {
      ensureSelectionGroupDataPromise =
        context.dataRepository.UpdateSelectionGroupData();
    }
    const updateAdmissionsPromise = context.dataRepository
      .UpdateAdmissionMetas(props.competitionGroupIds)
      .then(() => {
        const admissionIds: number[] = [];
        for (const competitionGroupId of props.competitionGroupIds) {
          const mupToAdmission =
            context.dataRepository.competitionGroupIdToMupAdmissions[
              competitionGroupId
            ];
          for (const mupId in mupToAdmission) {
            admissionIds.push(mupToAdmission[mupId].admissionsId);
          }
        }
        return context.dataRepository.UpdateStudentAdmissionsAndStudentData(
          admissionIds
        );
      });
    return Promise.allSettled([
      ensureMupDataPromise,
      ensureSelectionGroupDataPromise,
      updateAdmissionsPromise,
    ])
      .then(() => {
        refreshInProgress.current = false;
      })
      .catch((err) => {
        refreshInProgress.current = false;
        if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
          props.onUnauthorized();
          return;
        }
        throw err;
      });
  };

  const prepareItemsAndStudentMupDataText = () => {
    console.log("context.dataRepository.competitionGroupIdToMupAdmissions");
    console.log(context.dataRepository.competitionGroupIdToMupAdmissions);
    console.log("context.dataRepository.admissionInfo");
    console.log(context.dataRepository.admissionInfo);

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
      context.dataRepository.admissionIdToMupId
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

    const availableAdmissionIds = new Set<number>();
    for (const competitionGroupId of props.competitionGroupIds) {
      const mupToAdmissionMeta =
        context.dataRepository.competitionGroupIdToMupAdmissions[
          competitionGroupId
        ];
      for (const mupId in mupToAdmissionMeta) {
        availableAdmissionIds.add(mupToAdmissionMeta[mupId].admissionsId);
      }
    }
    const studentMupsData = createStudentsDistributionData(
      studentAndMupItems.personalNumberToStudentItems,
      context.dataRepository.studentData,
      context.dataRepository.mupData,
      context.dataRepository.admissionIdToMupId,
      Array.from(availableAdmissionIds)
    );
    setStudentAdmissionsText(JSON.stringify(studentMupsData, null, 2));

    console.log("newPersonalNumberToStudentItems");
    console.log(studentAndMupItems.personalNumberToStudentItems);

    console.log("newMupIdToMupItems");
    console.log(studentAndMupItems.mupIdToMupItems);
  };

  useEffect(() => {
    refreshData().then(() => prepareItemsAndStudentMupDataText());
  }, [props.competitionGroupIds]);

  const handleRefresh = () => {
    refreshData().then(() => prepareItemsAndStudentMupDataText());
  };

  const handleRefreshDebounced = () => {
    debouncedWrapperForApply(handleRefresh);
  };

  const handleDownlad = () => {
    downloadFileFromText(`studentAdmissions.json`, studentAdmissionsText);
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
      context.dataRepository.admissionIdToMupId
    );
    setStudentAdmissionsTextInputMessages(messages);
    console.log("validateStudentAdmissions");
    console.log({ success, messages });

    if (success) {
      const personalNumberToSelectedAdmissionIds: { [key: string]: number[] } =
        {};
      for (const studentInfo of newStudentsDistributionData.students) {
        personalNumberToSelectedAdmissionIds[studentInfo.personalNumber] =
          studentInfo.admissions;
      }
      // Отобразить распределение в таблице
      const studentAndMupItems = prepareStudentAndMupItems(
        props.competitionGroupIds,
        context.dataRepository.mupData,
        context.dataRepository.competitionGroupIdToMupAdmissions,
        context.dataRepository.admissionInfo,
        context.dataRepository.admissionIdToMupId,
        personalNumberToSelectedAdmissionIds
      );

      console.log("studentAndMupItems");
      console.log(studentAndMupItems);

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
      <ul className="list_without_decorations warning">
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

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      newPersonalNumberToStudentItems,
      newMupIdToMupItems,
      mupIdsWithTestResultRequired.current,
      competitionGroupIdToZELimit.current,
      personalNumbersOfActiveStudentsSortedByRating.current,
      context.dataRepository.mupData,
      context.dataRepository.admissionIdToMupId,
      context.dataRepository.admissionInfo
    );

    addRandomMupsForStudentIfNeeded(
      personalNumbersOfActiveStudentsSortedByRating.current,
      newPersonalNumberToStudentItems,
      newMupIdToMupItems,
      competitionGroupIdToZELimit.current,
      context.dataRepository.admissionIdToMupId,
      context.dataRepository.mupData,
      context.dataRepository.competitionGroupIdToMupAdmissions
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
      alert("Real apply declined");
      return;
      executeActions(studentAdmissionActions, context).then((actionResults) => {
        setStudentAdmissionActionResults(actionResults);
      });
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
              {/* {personalNumber} */}
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
          Вставивьте распределение студентов по МУПам (формат данных как в поле
          сверху)
        </h4>
        <textarea
          value={studentAdmissionsTextInput}
          onChange={handleStudentAdmissionsTextInputChange}
          rows={10}
          placeholder="Вставьте содержимое файла с распределением студентов по группам"
        />
        <Button onClick={handleParseStudentAdmissionsFromTextArea}>
          Распарсить
        </Button>
        {studentAdmissionsTextInputMessages.length > 0 &&
          renderStudentAdmissionsTextInputMessages()}
      </React.Fragment>
    );
  };

  const renderTable = () => {
    return (
      <article>
        <Button
          onClick={handleRefreshDebounced}
          style={{ fontSize: 12, marginBottom: "1em" }}
          variant="text"
          startIcon={<RefreshIcon />}
        >
          Обновить список
        </Button>
        <section className="table__сontainer">
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
      </article>
    );
  };

  const renderContent = () => {
    return (
      <React.Fragment>
        {renderTable()}

        <Button
          onClick={toggleManualEditSection}
          style={{
            alignSelf: "flex-start",
          }}
          startIcon={<EditIcon />}
        >
          Редактирование вручную{" "}
          {manualEditOpen ? <ExpandLess /> : <ExpandMore />}
        </Button>
        <Collapse in={manualEditOpen} timeout="auto" unmountOnExit>
          <div className={style.manualEdit__container}>
            <h4>Распределение по курсам в ИТС</h4>
            <textarea value={studentAdmissionsText} rows={10} readOnly />
            <Button onClick={handleDownlad} style={{ alignSelf: "flex-start" }}>
              Скачать файл
            </Button>

            {renderAdmissionsInput()}
          </div>
        </Collapse>

        <Button
          onClick={handleDistributeRemainingStudents}
          variant="contained"
          style={{
            alignSelf: "flex-start",
            margin: "1em 0",
          }}
          startIcon={<AutoFixNormalIcon />}
        >
          {" "}
          Дораспределить студентов по курсам
        </Button>

        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={studentAdmissionActions}
          actionResults={studentAdmissionActionResults}
          onApply={handleRealApplyDebounced}
          onNextStep={props.onNextStep}
        />
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
