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
  createPersonalNumberToStudentItem,
  createMupIdToMupItem,
  filterActiveStudentsAndSortByRating,
} from "../../../studentAdmission/studentDistributor";
import { ITSContext } from "../../../common/Context";
import { REQUEST_ERROR_UNAUTHORIZED } from "../../../utils/constants";
import { downloadFileFromText } from "../../../utils/helpers";

interface StudentMupsData {
  studentPersonalNumberToMupIds: { [key: string]: number[] }; // personalNumber -> mupIds
  mupIdToMupName: { [key: number]: string }; // mupId -> mupName
}

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
    personalNumbersOfActiveStudentsSortedByRating.current = filterActiveStudentsAndSortByRating(
      Array.from(allPersonalNumbers),
      context.dataRepository.studentData
    )

    const newPersonalNumberToStudentItems = createPersonalNumberToStudentItem(
      props.competitionGroupIds,
      context.dataRepository.mupData,
      context.dataRepository.competitionGroupIdToMupAdmissions,
      context.dataRepository.admissionInfo
    );
    setPersonalNumberToStudentItems(newPersonalNumberToStudentItems);

    const newMupIdToMupItems = createMupIdToMupItem(
      props.competitionGroupIds,
      context.dataRepository.competitionGroupIdToMupAdmissions
    );
    setMupIdToMupItems(newMupIdToMupItems);

    const studentMupsData = createStudentMupsData(
      newPersonalNumberToStudentItems,
      // newMupIdToMupItems
    );
    setStudentAdmissionsText(JSON.stringify(studentMupsData, null, 2));

    console.log("newPersonalNumberToStudentItems");
    console.log(newPersonalNumberToStudentItems);

    console.log("newMupIdToMupItems");
    console.log(newMupIdToMupItems);
  };

  const createStudentMupsData = (
    newPersonalNumberToStudentItems: {
      [key: string]: IStudentAdmissionDistributionItem;
    },
    // newMupIdToMupItems: { [key: string]: IMupDistributionItem }
  ): StudentMupsData => {
    const result: StudentMupsData = {
      studentPersonalNumberToMupIds: {},
      mupIdToMupName: {},
    };
    const admissionIds = new Set<number>();
    for (const personalNumber in newPersonalNumberToStudentItems) {
      const student = context.dataRepository.studentData.data[personalNumber];
      if (student.status === "Активный" && student.rating !== null) {
        result.studentPersonalNumberToMupIds[personalNumber] =
          newPersonalNumberToStudentItems[personalNumber].admittedIndices.map(aIdx => {
            const admissionId = newPersonalNumberToStudentItems[personalNumber]
              .admissions[aIdx].admissionId;
            admissionIds.add(admissionId)
            return admissionId;
          });
      }
    }
    for (const admissionId of Array.from(admissionIds)) {
      const mupId = context.dataRepository.admissionIdToMupId[admissionId];
      result.mupIdToMupName[admissionId] =
        context.dataRepository.mupData.data[mupId].name;
    }
    return result;
  };

  useEffect(() => {
    refreshData().then(() => prepareItemsAndStudentMupDataText());
  }, [props.competitionGroupIds]);

  const handleDownlad = () => {
    downloadFileFromText(`studentAdmissions.json`, studentAdmissionsText);
  };

  const renderRows = () => {
    // return Object.keys(personalNumberToStudentItems)
    //   .filter((personalNumber) => {
    //     const student = context.dataRepository.studentData.data[personalNumber];
    //     // console.log("student");
    //     // console.log(student);
    //     return student.status === "Активный" && student.rating !== null;
    //   })
    return personalNumbersOfActiveStudentsSortedByRating.current
      .map((personalNumber) => {
        const studentItem = personalNumberToStudentItems[personalNumber];
        const student = context.dataRepository.studentData.data[personalNumber];
        const mupNames = studentItem.admittedIndices.map((idx) => {
          const admission = studentItem.admissions[idx];
          const mupId = context.dataRepository.admissionIdToMupId[admission.admissionId];
          const mupName = context.dataRepository.mupData.data[mupId].name;
          return `${admission.priority}. ${mupName}`;
        });
        const priorities = studentItem.admissions
          .filter((a, idx) => !studentItem.admittedIndices.includes(idx))
          .map((admission) => {
          const mupId =
            context.dataRepository.admissionIdToMupId[admission.admissionId];
          const mupName = context.dataRepository.mupData.data[mupId].name;
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
                {mupNames.map((mupName, index) => (
                  <li key={index}>{mupName}</li>
                ))}
              </ul>
            </td>
            <td>
              <ul className="list_without_decorations">
                {priorities.map((priority, index) => (
                  <li key={index}>{priority}</li>
                ))}
              </ul>
            </td>
          </tr>
        );
      });
  };

  return (
    <section className="step__container">
      <article>
        <Button
          onClick={refreshData}
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

      <textarea value={studentAdmissionsText} rows={10} readOnly />
      <Button onClick={handleDownlad} style={{ alignSelf: "flex-start" }}>
        Скачать файл
      </Button>
    </section>
  );
}
