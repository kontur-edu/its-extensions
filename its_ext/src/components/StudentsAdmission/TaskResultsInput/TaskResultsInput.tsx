import React, {useContext, useEffect, useRef, useState} from "react";
import style from "./CompetitionGroupSelect.module.css";
import { ITaskResultsInputProps } from "./types";
import {DEBOUNCE_MS, StepMessages} from "../../../utils/constants";
import { ITSContext } from "../../../common/Context";
import { IAdmissionMeta, CompetitionGroupIdToMupAdmissions, AdmissionInfo, IStudentData } from "../../../common/types";
import { isConstTypeReference } from "typescript";
import {
    findPersonalNumber,
    getNameRecords,
    getSurnameToKeys,
    TaskResultNameRecord
} from "../../../taskResultUpdater/studentNamesParser";


export function getAdmissionIds(
    competitionGroupIds: number[],
    mupId: string,
    competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
) {
    const admissionIds: number[] = [];
    for (const competitionGroupId of competitionGroupIds) {
        if (!competitionGroupIdToMupAdmissions.hasOwnProperty(competitionGroupId)) {
            console.log(`competitionGroupId: ${competitionGroupId} not found in competitionGroupIdToMupAdmissions`);
            continue;
        }
        const mupIdToAdmissionId = competitionGroupIdToMupAdmissions[competitionGroupId];
        if (!mupIdToAdmissionId.hasOwnProperty(mupId)) {
            console.log(`mupId: ${mupId} not found in mupIdToAdmissionId`);
            continue;
        }
        admissionIds.push(mupIdToAdmissionId[mupId]);
    }
    return admissionIds;
}


function getMupIdsToChoseFrom(
    competitionGroupIds: number[],
    competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions
) {
    if (competitionGroupIds.length === 0) return [];
    const firstCGId =  competitionGroupIds[0];
    if (!competitionGroupIdToMupAdmissions.hasOwnProperty(firstCGId)) {
        return [];
    }

    const mupIdToAdmissionId = competitionGroupIdToMupAdmissions[firstCGId];
    
    const mupIds: string[] = Object.keys(mupIdToAdmissionId);
    return mupIds;
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
) : {[key: string]: IStudentItem} {
    const personalNumberToStudentItems: {[key: string]: IStudentItem} = {};
    for (const admissionId of admissionIds) {
        if (admissionInfo.hasOwnProperty(admissionId)) {
            const personalNumberToStudentAdmission = admissionInfo[admissionId];
            for (const personalNumber in personalNumberToStudentAdmission) {
                const testResult = personalNumberToStudentAdmission[personalNumber].testResult;
                if (!studentData.data.hasOwnProperty(personalNumber)) {
                    console.log(`personalNumber: ${personalNumber} not found in studentData`);
                    continue;
                }

                const studentInfo = studentData.data[personalNumber];
                console.log("studentInfo");
                console.log(studentInfo);
                if (studentInfo.status !== "Активный") {
                    continue;
                }
                const studentItem: IStudentItem = {
                    group: studentInfo.groupName,
                    name: `${studentInfo.surname} ${studentInfo.firstname} ${studentInfo.patronymic}`,
                    testResult: testResult
                };
                personalNumberToStudentItems[personalNumber] = studentItem;
            }
        }
    }
    return personalNumberToStudentItems;
}

// function findCurrentPersonalNumbers(
//     admissionIds: number[],
//     admissionInfo: AdmissionInfo,
// ): string[] {
//     const res: string[] = [];
//     for (const admissionId of admissionIds) {
//         if (admissionInfo.hasOwnProperty(admissionId)) {
//             res.push(...Object.keys(admissionInfo[admissionId]));
//         }
//     }
//     return res;
// }


// fullname -> studentNumber[]

export function TaskResultsInput(props: ITaskResultsInputProps) {
    const [selectedMupId, setSelectedMupId] = useState<string>('');
    const [admissionIds, setAdmissionIds] = useState<number[]>([]);
    const [mupIds, setMupIds] = useState<string[]>([]);
    const [studentItems, setStudentItems] = useState<{[key: string]: IStudentItem}>({});
    // const [studentPersonalNumbers, setStudentPersonalNumbers] = useState<string[]>([]);
    // const [studentFullNameToStudentNumbers, setStudentFullNameToStudentNumbers] = useState<{[key: string]: string[]}>({});
    // const surnameToPErsonalNumbers = useRef<{[key: string]: string[]}>({});
    const [textAreaValue, setTextAreaValue] = useState<string>('');
    const timeoutId = useRef<number | null>(null);

    const context = useContext(ITSContext)!;

    const getMupNameById = (mupId: string) => {
        if (!mupId) {
            return "Не определен";
        }
        return context.dataRepository.mupData.data[mupId].name;
    }

    const setCurrentAdmissionIds = (mupId: string) => {
        if (!mupId) return;
        const admissionIds = getAdmissionIds(
            props.competitionGroupIds,
            mupId,
            context.dataRepository.competitionGroupIdToMupAdmissions
        );
        console.log("admissionIds");
        console.log(admissionIds);
        setAdmissionIds(admissionIds);
    }

    const refreshAdmissionInfo = async () => {
        // ensure mup data is present
        if (context.dataRepository.mupData.ids.length === 0) {
            await context.dataRepository.UpdateMupData();
        }
        const mupIds = getMupIdsToChoseFrom(
            props.competitionGroupIds,
            context.dataRepository.competitionGroupIdToMupAdmissions
        );
        setMupIds(mupIds);

        // request admission metas
        await context.dataRepository.UpdateAdmissionMetas(props.competitionGroupIds);
        
        setCurrentAdmissionIds(selectedMupId);
    }
    
    useEffect(() => {
        refreshAdmissionInfo();
    }, [props.competitionGroupIds]);

    useEffect(() => {
        context.dataRepository.UpdateStudentAdmissionsAndStudentData(admissionIds)
            .then(() => {
                // const personalNumbers = findCurrentPersonalNumbers(
                //     admissionIds, context.dataRepository.admissionInfo
                // );
                // setStudentPersonalNumbers(personalNumbers);
                const studentItems = createStudentItems(
                    admissionIds, context.dataRepository.admissionInfo,
                    context.dataRepository.studentData
                );
                setStudentItems(studentItems);

                // const newStudentFullNameToStudentNumbers = getStudentNameToStudentNumbers(studentItems);
                // setStudentFullNameToStudentNumbers(newStudentFullNameToStudentNumbers);
            });
    }, [admissionIds]);

    
    const handleMupChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newMupId = event.target.value;
        console.log("newMupId");
        console.log(newMupId);
        setCurrentAdmissionIds(newMupId);
        setSelectedMupId(newMupId);
        // ensure AdmissionInfo for admission Id for each group
        // sho each student from groups
    }

    const handleStudentPassedToggle = (personalNumber: string)=> {
        console.log("handleStudentPassedToggle");
        const newStudentItems = {...studentItems};
        const studentItem = newStudentItems[personalNumber]; 
        if (studentItem.testResult) {
            studentItem.testResult = 0;
        } else {
            studentItem.testResult = 1;
        }
        setStudentItems(newStudentItems);
    }

    const selectStudentsByNameRecords = (nameRecords: TaskResultNameRecord[]) => {
        // for (const personalNumber in studentItems) {
        //     studentItems[personalNumber].testResult = 0;
        // }

        // for (const nameRecord of nameRecords) {
        //     if (studentFullNameToStudentNumbers.hasOwnProperty(nameRecord.fullnameLower)) {
        //         const personalNumbers = studentFullNameToStudentNumbers[nameRecord.fullnameLower];
        //         if (personalNumbers.length === 1) {
        //             studentItems[personalNumbers[0]].testResult = 1;
        //         } else {
        //             for (const personalNumber of personalNumbers) {
        //                 if (studentItems[personalNumber].group.toLocaleLowerCase() === nameRecord.group) {
        //                     studentItems[personalNumbers[0]].testResult = 1;
        //                 }
        //             }
        //         }
        //     }
        // }
        const personalNumbers = Object.keys(studentItems);
        // console.log("studentItems");
        // console.log(studentItems);
        // console.log("personalNumbers");
        // console.log(personalNumbers);
        const surnameToPersonalNumbers = getSurnameToKeys(
            personalNumbers,
            context.dataRepository.studentData
        );
        const newStudentItems = {...studentItems};
        personalNumbers.forEach(pn => newStudentItems[pn].testResult = 0);
        for (const record of nameRecords) {
            if (record.nameParts.length === 0) continue;
            const personalNumber = findPersonalNumber(
                record,
                surnameToPersonalNumbers,
                personalNumbers,
                context.dataRepository.studentData
            )
            if (personalNumber) {
                newStudentItems[personalNumber].testResult = 1;
            }
        }
        setStudentItems(newStudentItems);
    }

    const handleTextAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.target.value;
        const records = getNameRecords(value);
        console.log("records");
        console.log(records);
        setTextAreaValue(value);
        // selectStudentsByNameRecords(records);
        selectStudentsDebounced(records);
    }

    const selectStudentsDebounced = (
        records: TaskResultNameRecord[]
    ) => {
        console.log("Debounce studentSelect");
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }
        timeoutId.current = window.setTimeout(() => {
            
            selectStudentsByNameRecords(records);
        }, DEBOUNCE_MS);
    };

    const renderRows = () => {
    
        const studentPersonalNumbersSorted = Object.keys(studentItems).sort((lhs, rhs) => {
            return studentItems[lhs].name.localeCompare(studentItems[rhs].name);
        });
        return studentPersonalNumbersSorted.map(personalNumber => {
            const studentItem = studentItems[personalNumber];
            const selected = studentItem.testResult !== null && studentItem.testResult > 0;
            return (
                <tr onClick={() => handleStudentPassedToggle(personalNumber)}
                    className={"selectable"}
                    key={personalNumber}
                >
                    <th>{studentItem.group || personalNumber}</th>
                    <th>{studentItem.name}</th>
                    <th>
                        <input type="checkbox" readOnly
                            checked={selected}/>
                    </th>
                </tr>
            );
        })
    }

    const handleRefreshCompetitionGroups = () => {
        // alert("Refresh Students passed Entrance Task");
        refreshAdmissionInfo();
    }

    const handleApply = () => {
        const personalNumberToTaskResult: {[key: string]: number | null} = {};
        for (const personalNumber in studentItems) {
            const studentItem = studentItems[personalNumber];
            personalNumberToTaskResult[personalNumber] = studentItem.testResult;
        }

        props.onApply(admissionIds, personalNumberToTaskResult);
    }

    return (
        <section className="step__container">
            <article>
                <h3>Выберите МУП</h3>
                <select value={selectedMupId} onChange={handleMupChange}>
                    <option key={''} value={''}>{"Не выбран"}</option>
                    {mupIds.map(mupId => <option key={mupId} value={mupId}>{getMupNameById(mupId)}</option>)}
                </select>
                <h3>Вставьте список ФИО студентов, прошедших тестовое или выберите студентов в таблице</h3>
                <textarea value={textAreaValue} onChange={handleTextAreaChange} 
                    rows={8} cols={64}
                />
                <h3>Студенты (активные), прошедшие Тестовое</h3>
                <button className="step__button" onClick={handleRefreshCompetitionGroups}>Обновить</button>
                <section className="table__container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Группа</th>
                                <th>ФИО</th>
                                <th>Прошел тестовое</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderRows()}
                        </tbody>
                    </table>
                </section>
                <button className="step__button" onClick={handleApply}>Применить изменения</button>
            </article>
        </section>
    );
}