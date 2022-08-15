import React, { useContext, useEffect, useState } from "react";
import style from "./TaskResultsInput.module.css";
import { ITaskResultsInputProps } from "./types";
import { DEBOUNCE_MS } from "../../../utils/constants";
import { ITSContext } from "../../../common/Context";
import {
  CompetitionGroupIdToMupAdmissions,
  AdmissionInfo,
  IStudentData,
} from "../../../common/types";

import {
  findPersonalNumber,
  getNameRecords,
  getSurnameToKeys,
  TaskResultNameRecord,
} from "../../../taskResultUpdater/studentNamesParser";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import {
  IActionExecutionLogItem,
  ITSAction,
  executeActions,
} from "../../../common/actions";
import { createTaskResultActions } from "../../../taskResultUpdater/actionCreator";
import { createDebouncedWrapper } from "../../../utils/helpers";

import Button from "@mui/material/Button";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import { RefreshButton } from "../../RefreshButton";

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function getAdmissionIdsPerCompetitionGroup(
  competitionGroupIds: number[],
  mupId: string,
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
) {
  const competitionGroupIdToAdmissionIds: { [key: number]: number[] } = {};
  for (const competitionGroupId of competitionGroupIds) {
    if (!competitionGroupIdToMupAdmissions.hasOwnProperty(competitionGroupId)) {
      // console.log(
      //   `competitionGroupId: ${competitionGroupId} not found in competitionGroupIdToMupAdmissions`
      // );
      continue;
    }
    const mupIdToAdmissionId =
      competitionGroupIdToMupAdmissions[competitionGroupId];
    if (!mupIdToAdmissionId.hasOwnProperty(mupId)) {
      // console.log(`mupId: ${mupId} not found in mupIdToAdmissionId`);
      continue;
    }
    if (!competitionGroupIdToAdmissionIds.hasOwnProperty(competitionGroupId)) {
      competitionGroupIdToAdmissionIds[competitionGroupId] = [];
    }
    competitionGroupIdToAdmissionIds[competitionGroupId].push(
      mupIdToAdmissionId[mupId].admissionsId
    );
  }
  return competitionGroupIdToAdmissionIds;
}

function getMupIdsToChoseFrom(
  competitionGroupIds: number[],
  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
) {
  const allMupIds = new Set<string>();
  for (const competitionGroupId of competitionGroupIds) {
    if (competitionGroupIdToMupAdmissions.hasOwnProperty(competitionGroupId)) {
      const mupIdToAdmissionId =
        competitionGroupIdToMupAdmissions[competitionGroupId];
      for (const mupId in mupIdToAdmissionId) {
        allMupIds.add(mupId);
      }
    }
  }

  return Array.from(allMupIds);
}

export interface IStudentItem {
  group: string;

  name: string;

  testResult: number | null;
}

export function createStudentItems(
  admissionIds: number[],
  admissionInfo: AdmissionInfo,
  studentData: IStudentData
): { [key: string]: IStudentItem } {
  const personalNumberToStudentItems: { [key: string]: IStudentItem } = {};
  for (const admissionId of admissionIds) {
    if (admissionInfo.hasOwnProperty(admissionId)) {
      const personalNumberToStudentAdmission = admissionInfo[admissionId];
      for (const personalNumber in personalNumberToStudentAdmission) {
        if (!studentData.data.hasOwnProperty(personalNumber)) {
          console.log(
            `personalNumber: ${personalNumber} not found in studentData`
          );
          continue;
        }

        const studentInfo = studentData.data[personalNumber];
        if (studentInfo.status !== "Активный") {
          continue;
        }

        const testResult =
          personalNumberToStudentAdmission[personalNumber]?.testResult || 0;
        const studentItem: IStudentItem = {
          group: studentInfo.groupName,
          name: `${studentInfo.surname} ${studentInfo.firstname} ${studentInfo.patronymic}`,
          testResult: testResult,
        };
        personalNumberToStudentItems[personalNumber] = studentItem;
      }
    }
  }

  return personalNumberToStudentItems;
}

export function TaskResultsInput(props: ITaskResultsInputProps) {
  const [selectedMupId, setSelectedMupId] = useState<string>("");
  const [competitionGroupToAdmissionIds, setCompetitionGroupToAdmissionIds] =
    useState<{ [key: number]: number[] }>({});
  const [mupIds, setMupIds] = useState<string[]>([]);
  const [studentItems, setStudentItems] = useState<{
    [key: string]: IStudentItem;
  }>({});
  const [taskResultsActions, setTaskResultsActions] = useState<ITSAction[]>([]);
  const [taskResultsActionResults, setTaskResultsActionResults] = useState<
    IActionExecutionLogItem[]
  >([]);
  const [textAreaValue, setTextAreaValue] = useState<string>("");
  const [invalidStudentRows, setInvalidStudentRows] = useState<string[]>([]);
  // const allowSuccessMessage = useRef<boolean>(false);
  const [applyClicked, setApplyClicked] = useState<boolean>(false);

  const [ensureDataInProgress, setEnsureDataInProgress] =
    useState<boolean>(false);

  const context = useContext(ITSContext)!;

  const getMupNameById = (mupId: string) => {
    if (!mupId) {
      return "Не определен";
    }
    return context.dataRepository.mupData.data[mupId].name;
  };

  const getCurrentAdmissionIdsPerCompetitionGroup = (mupId: string) => {
    if (!mupId) {
      return {};
    }
    const competitionGroupIdToAdmissionIds = getAdmissionIdsPerCompetitionGroup(
      props.competitionGroupIds,
      mupId,
      context.dataRepository.competitionGroupIdToMupAdmissions
    );
    return competitionGroupIdToAdmissionIds;
  };

  // const ensureData = () => {

  // }

  const refreshAdmissionInfo = async () => {
    // console.log("refreshAdmissionInfo");
    setEnsureDataInProgress(true);
    // ensure mup data is present
    if (context.dataRepository.mupData.ids.length === 0) {
      await context.dataRepository.UpdateMupData();
    }

    // request admission metas
    await context.dataRepository.UpdateAdmissionMetas(
      props.competitionGroupIds
    );

    const newMupIds = getMupIdsToChoseFrom(
      props.competitionGroupIds,
      context.dataRepository.competitionGroupIdToMupAdmissions
    );
    setMupIds(newMupIds);

    const newCompetitionGroupToAdmissionIds =
      getCurrentAdmissionIdsPerCompetitionGroup(selectedMupId);

    // setCompetitionGroupToAdmissionIds(newCompetitionGroupToAdmissionIds);
    await context.dataRepository
      .UpdateStudentAdmissionsAndStudentData(newCompetitionGroupToAdmissionIds)
      .then(() =>
        setCompetitionGroupToAdmissionIds(newCompetitionGroupToAdmissionIds)
      );
    setEnsureDataInProgress(false);
  };

  useEffect(() => {
    // console.log("useEffect: TaskResultsInput");
    return () => {
      // console.warn("TaskResultInput UNMOUNTED");
    };
  }, []);

  useEffect(() => {
    // console.log("useEffect: TaskResultsInput: [props.competitionGroupIds]: ", props.competitionGroupIds);
    debouncedWrapperForApply(() =>
      refreshAdmissionInfo().finally(() => props.onLoad())
    );
    // .catch((err) =>{
    //   setEnsureDataInProgress(false);
    //   console.warn(`catch: ${err.message}`);
    //   if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
    //     props.onUnauthorized();
    //   }
    // })

    // eslint-disable-next-line
  }, [props.competitionGroupIds]);

  useEffect(() => {
    setEnsureDataInProgress(true);
    const repo = context.dataRepository;
    // let ensureStudentAdmissionDataIsPresentPromise = Promise.resolve();
    // let admissionDataIsPresent = true;

    const admissionIds: number[] = [];
    Object.values(competitionGroupToAdmissionIds).forEach((aIds) =>
      admissionIds.push(...aIds)
    );

    if (admissionIds.length === 0) {
      setEnsureDataInProgress(false);
      return;
    }

    const ensureStudentAdmissionDataIsPresentPromise =
      repo.CheckAdmissionInfoPresent(admissionIds)
        ? Promise.resolve()
        : repo.UpdateStudentAdmissionsAndStudentData(
            competitionGroupToAdmissionIds
          );

    ensureStudentAdmissionDataIsPresentPromise
      .then(() => {
        const newStudentItems = createStudentItems(
          admissionIds,
          repo.admissionInfo,
          repo.studentData
        );
        setStudentItems(newStudentItems);
        return newStudentItems;
      })
      .then((newStudentItems) => {
        handleGenerateActionsDebounced(newStudentItems);
        setEnsureDataInProgress(false);
      });
    // .catch((err) =>{
    //   setEnsureDataInProgress(false);
    //   console.warn(`catch: ${err.message}`);
    //   if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
    //     props.onUnauthorized();
    //   }
    // })
    // .finally(() => {
    //   console.log("competitionGroupToAdmissionIds");
    //   console.log(competitionGroupToAdmissionIds);
    //   props.onLoad();
    // });
    // eslint-disable-next-line
  }, [competitionGroupToAdmissionIds]);

  const handleMupChange = (event: SelectChangeEvent) => {
    setApplyClicked(false);

    const newMupId = event.target.value;
    setSelectedMupId(newMupId);

    const newCompetitionGroupToAdmissionIds =
      getCurrentAdmissionIdsPerCompetitionGroup(newMupId);
    setCompetitionGroupToAdmissionIds(newCompetitionGroupToAdmissionIds);
    // ensure AdmissionInfo for admission Id for each group
    // sho each student from groups
  };

  const handleStudentPassedToggle = (personalNumber: string) => {
    setApplyClicked(false);
    const newStudentItems = { ...studentItems };
    const studentItem = newStudentItems[personalNumber];
    if (studentItem.testResult) {
      studentItem.testResult = 0;
    } else {
      studentItem.testResult = 1;
    }
    setStudentItems(newStudentItems);

    handleGenerateActionsDebounced(newStudentItems);
  };

  const selectStudentsByNameRecords = (
    nameRecords: TaskResultNameRecord[]
  ): { [x: string]: IStudentItem } => {
    const personalNumbers = Object.keys(studentItems);

    const surnameToPersonalNumbers = getSurnameToKeys(
      personalNumbers,
      context.dataRepository.studentData
    );

    const newStudentItems = { ...studentItems };
    personalNumbers.forEach((pn) => (newStudentItems[pn].testResult = 0));
    const newInvalidStudentRows: string[] = [];
    const textAreaRows = textAreaValue.split("\n");
    for (let i = 0; i < nameRecords.length; i++) {
      const record = nameRecords[i];
      if (record.nameParts.length === 0) continue;
      const personalNumber = findPersonalNumber(
        record,
        surnameToPersonalNumbers,
        personalNumbers,
        context.dataRepository.studentData
      );
      if (personalNumber) {
        newStudentItems[personalNumber].testResult = 1;
      } else {
        newInvalidStudentRows.push(textAreaRows[i]);
      }
    }

    setStudentItems(newStudentItems);
    setInvalidStudentRows(newInvalidStudentRows);
    return newStudentItems;
  };

  const handleTextAreaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setTextAreaValue(value);
  };

  const handleSelectStudentsFromTextArea = () => {
    setApplyClicked(false);
    const records = getNameRecords(textAreaValue);
    selectStudentsDebounced(records);
  };

  const selectStudentsDebounced = (records: TaskResultNameRecord[]) => {
    debouncedWrapperForApply(() => {
      const newStudentItems = selectStudentsByNameRecords(records);
      generateActions(newStudentItems);
    });
  };

  const renderRows = () => {
    const studentPersonalNumbersSorted = Object.keys(studentItems).sort(
      (lhs, rhs) => {
        return studentItems[lhs].name.localeCompare(studentItems[rhs].name);
      }
    );
    return studentPersonalNumbersSorted.map((personalNumber) => {
      const studentItem = studentItems[personalNumber];
      const selected =
        studentItem.testResult !== null && studentItem.testResult > 0;
      return (
        <tr
          onClick={() => handleStudentPassedToggle(personalNumber)}
          className={"selectable"}
          key={personalNumber}
        >
          <td>{studentItem.group || personalNumber}</td>
          <td>{studentItem.name}</td>
          <td>
            <input type="checkbox" readOnly checked={selected} />
          </td>
        </tr>
      );
    });
  };

  const handleRefreshAdmissionInfo = () => {
    refreshAdmissionInfo();
  };

  const generateActions = (newStudentItems: {
    [key: string]: IStudentItem;
  }) => {
    const admissionIds: number[] = [];
    Object.values(competitionGroupToAdmissionIds).forEach((aIds) =>
      admissionIds.push(...aIds)
    );

    if (admissionIds.length === 0 || admissionIds.length > 2) return;
    const personalNumberToTaskResult: { [key: string]: number | null } = {};
    for (const personalNumber in newStudentItems) {
      const studentItem = newStudentItems[personalNumber];
      personalNumberToTaskResult[personalNumber] = studentItem.testResult;
    }

    const actions = createTaskResultActions(
      admissionIds,
      personalNumberToTaskResult,
      context.dataRepository.admissionInfo,
      context.dataRepository.studentData
    );

    setTaskResultsActions(actions);
  };

  const handleGenerateActionsDebounced = (newStudentItems: {
    [key: string]: IStudentItem;
  }) => debouncedWrapperForApply(() => generateActions(newStudentItems));

  const handleRealApply = () => {
    alert(`Настоящее применение изменений`);
    setApplyClicked(true);
    executeActions(taskResultsActions, context)
      .then((actionResults) => {
        setTaskResultsActionResults(actionResults);
      })
      .then(() => refreshAdmissionInfo());
  };

  const handleRealApplyDebounced = () => {
    debouncedWrapperForApply(handleRealApply);
  };

  const renderInvalidStudentRows = () => {
    return (
      <article className="warning">
        <h4 className={style.not_parsed_rows__header}>
          Не получилось однозначно найти студентов по строкам:
        </h4>
        <ul className={style.list}>
          {invalidStudentRows.map((row, index) => (
            <li key={index}>{row}</li>
          ))}
        </ul>
      </article>
    );
  };

  const renderContent = () => {
    return (
      <React.Fragment>
        <h3>
          Вставьте список ФИО студентов, прошедших тестовое или выберите
          студентов в таблице
        </h3>
        <textarea
          value={textAreaValue}
          onChange={handleTextAreaChange}
          rows={10}
          className="textarea"
          placeholder="Вставьте <Группa> <Фамилия> <Имя> <Отчество> разделяя переносом строки"
        />
        {invalidStudentRows.length > 0 && renderInvalidStudentRows()}
        <Button onClick={handleSelectStudentsFromTextArea}>
          Распрасить студентов
        </Button>
        <h3>Студенты (активные), прошедшие Тестовое</h3>
        <RefreshButton
          onClick={handleRefreshAdmissionInfo}
          title="Обновить список"
          loading={ensureDataInProgress}
        />

        <section className="table__container">
          <table className="table">
            <thead>
              <tr>
                <th>Группа</th>
                <th>ФИО</th>
                <th>Прошел тестовое</th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        </section>

        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={taskResultsActions}
          actionResults={taskResultsActionResults}
          clicked={applyClicked}
          onNextStep={props.onNextStep}
          onApply={handleRealApplyDebounced}
        >
          Применить изменения
        </ApplyButtonWithActionDisplay>
      </React.Fragment>
    );
  };

  return (
    <section className="step__container">
      <article>
        <h3 className={style.mup_select__header}>
          Выберите МУП:
          <FormControl sx={{ minWidth: 120, marginLeft: "1em" }}>
            <InputLabel id="task-results-mup-select-label">МУП</InputLabel>
            <Select
              labelId="task-results-mup-select-label"
              value={selectedMupId}
              label="МУП"
              onChange={handleMupChange}
            >
              <MenuItem key={""} value={""}>
                Не выбран
              </MenuItem>
              {mupIds.map((mupId) => (
                <MenuItem key={mupId} value={mupId}>
                  {getMupNameById(mupId)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </h3>

        {selectedMupId ? renderContent() : null}
      </article>
    </section>
  );
}
