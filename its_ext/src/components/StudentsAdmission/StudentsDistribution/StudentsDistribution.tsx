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
  createIStudentMupsData,
  filterActiveStudentsAndSortByRating,
  parseStudentAdmissionsFromText,
  validateStudentAdmissions,
} from "../../../studentAdmission/studentDistributor";
import { ITSContext } from "../../../common/Context";
import { REQUEST_ERROR_UNAUTHORIZED } from "../../../utils/constants";
import { downloadFileFromText } from "../../../utils/helpers";

// interface IStudentMupsData {
//   studentPersonalNumberToAdmissionIds: { [key: string]: number[] }; // personalNumber -> mupIds
//   admissionIdToMupName: { [key: number]: string }; // mupId -> mupName
// }

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
  const personalNumbersOfActiveStudentsSortedByRating = useRef<string[]>([]);
  const refreshInProgress = useRef<boolean>(false);

  const context = useContext(ITSContext)!;

  const refreshData = () => {
    if (refreshInProgress.current) return Promise.resolve();
    refreshInProgress.current = true;
    let ensureMupDataPromise = Promise.resolve();
    if (context.dataRepository.mupData.ids.length === 0) {
      // update mupData
      ensureMupDataPromise = context.dataRepository.UpdateMupData();
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
    return Promise.allSettled([ensureMupDataPromise, updateAdmissionsPromise])
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
    )

    setPersonalNumberToStudentItems(studentAndMupItems.personalNumberToStudentItems);
    setMupIdToMupItems(studentAndMupItems.mupIdToMupItems);

    // const newPersonalNumberToStudentItems = createPersonalNumberToStudentItem(
    //   props.competitionGroupIds,
    //   context.dataRepository.mupData,
    //   context.dataRepository.competitionGroupIdToMupAdmissions,
    //   context.dataRepository.admissionInfo
    // );
    // setPersonalNumberToStudentItems(newPersonalNumberToStudentItems);

    // const newMupIdToMupItems = createMupIdToMupItemByStudentItems(
    //   newPersonalNumberToStudentItems,
    //   props.competitionGroupIds,
    //   context.dataRepository.competitionGroupIdToMupAdmissions,
    //   context.dataRepository.admissionIdToMupId
    // );
    // setMupIdToMupItems(newMupIdToMupItems);

    const studentMupsData = createIStudentMupsData(
      studentAndMupItems.personalNumberToStudentItems,
      context.dataRepository.studentData,
      context.dataRepository.mupData,
      context.dataRepository.admissionIdToMupId,
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
  }

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
    const newStudentMupsData = parseStudentAdmissionsFromText(studentAdmissionsTextInput);
    if (newStudentMupsData === null) {
      setStudentAdmissionsTextInputMessages([
        "Неверный формат, пример формата можно получить под таблицей",
      ]);
      return;
    }
    const { success, messages } = validateStudentAdmissions(
      newStudentMupsData,
      context.dataRepository.studentData,
      context.dataRepository.admissionIdToMupId
    );
    setStudentAdmissionsTextInputMessages(messages);
    console.log("validateStudentAdmissions");
    console.log({ success, messages });

    if (success) {
      // Отобразить распределение в таблице
      const studentAndMupItems = prepareStudentAndMupItems(
        props.competitionGroupIds,
        context.dataRepository.mupData,
        context.dataRepository.competitionGroupIdToMupAdmissions,
        context.dataRepository.admissionInfo,
        context.dataRepository.admissionIdToMupId,
        newStudentMupsData.studentPersonalNumberToSelectedAdmissionIds,
      );

      console.log("studentAndMupItems");
      console.log(studentAndMupItems);
      
      setPersonalNumberToStudentItems(studentAndMupItems.personalNumberToStudentItems);
      setMupIdToMupItems(studentAndMupItems.mupIdToMupItems);
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

  }

  const renderRows = () => {
    return personalNumbersOfActiveStudentsSortedByRating.current.map(
      (personalNumber) => {
        const studentItem = personalNumberToStudentItems[personalNumber];
        const student = context.dataRepository.studentData.data[personalNumber];
        const selectedMupRecords = studentItem.selectedAdmissionIds.map((aId) => {
          const admission = context.dataRepository.admissionInfo[aId][personalNumber];
          const mupId =
            context.dataRepository.admissionIdToMupId[admission.admissionId];
          const mupName = context.dataRepository.mupData.data[mupId].name;
          // const message = admission.status !== 1 ? "(новое)" : "";
          return `${admission.priority}. ${mupName}`;
        });
        const remainingMupRecords = studentItem.admissionIds
          .filter((aId, idx) => !studentItem.selectedAdmissionIds.includes(aId))
          .map((aId) => {
            const admission = context.dataRepository.admissionInfo[aId][personalNumber];
            const mupId =
              context.dataRepository.admissionIdToMupId[aId];
            const mupName = context.dataRepository.mupData.data[mupId].name;
            // const message = admission.status === 1 ? "(новое)" : "";
            return `${admission.priority}. ${mupName}`;
          });
        return (
          <tr key={personalNumber}>
            <td>
              {student.surname} {student.firstname} {student.patronymic}
            </td>
            <td>{student.groupName}</td>
            <td>{student.rating}</td>
            <td>{studentItem.currentZ}</td>
            <td>
              <ul className="list_without_decorations">
                {selectedMupRecords.map((record, index) => (
                  <li key={index}>{record}</li>
                ))}
              </ul>
            </td>
            <td>
              <ul className="list_without_decorations">
                {remainingMupRecords.map((record, index) => (
                  <li key={index}>{record}</li>
                ))}
              </ul>
            </td>
          </tr>
        );
      }
    );
  };

  return (
    <section className="step__container">
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
      <article>
        <Button
          onClick={handleRefresh}
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

      <ApplyButtonWithActionDisplay
        showErrorWarning={true}
        showSuccessMessage={true}
        onApply={() => {}}
      />

      <h4>Текущее распределение</h4>
      <textarea value={studentAdmissionsText} rows={10} readOnly />
      <Button onClick={handleDownlad} style={{ alignSelf: "flex-start" }}>
        Скачать файл
      </Button>

      <Button onClick={distributeRemainingStudents} style={{ alignSelf: "flex-start" }}>
        Распределить оставшихся студентов по курсам
      </Button>
    </section>
  );
}
