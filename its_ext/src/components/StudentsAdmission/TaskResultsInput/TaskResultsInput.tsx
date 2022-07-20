import React, {useContext, useEffect, useRef, useState} from "react";
import style from "./TaskResultsInput.module.css";
import { ITaskResultsInputProps } from "./types";
import {DEBOUNCE_MS} from "../../../utils/constants";
import { ITSContext } from "../../../common/Context";
import { CompetitionGroupIdToMupAdmissions, AdmissionInfo, IStudentData } from "../../../common/types";

import {
    findPersonalNumber,
    getNameRecords,
    getSurnameToKeys,
    TaskResultNameRecord
} from "../../../taskResultUpdater/studentNamesParser";

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { IActionExecutionLogItem, ITSAction, ExecuteActions } from "../../../common/actions";
import { createTaskResultActions } from "../../../taskResultUpdater/actionCreator";
import { CreateDebouncedWrapper } from "../../../utils/helpers";

import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';



const debouncedWrapperForApply = CreateDebouncedWrapper(DEBOUNCE_MS);


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
    const [taskResultsActions, setTaskResultsActions] = useState<ITSAction[]>([]);
    const [taskResultsActionResults, setTaskResultsActionResults] = useState<IActionExecutionLogItem[]>([]);
    const [textAreaValue, setTextAreaValue] = useState<string>('');
    const [invalidStudentRows, setInvalidStudentRows] = useState<number[]>([])
    // const timeoutId = useRef<number | null>(null);

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
        const newMupIds = getMupIdsToChoseFrom(
            props.competitionGroupIds,
            context.dataRepository.competitionGroupIdToMupAdmissions
        );
        setMupIds(newMupIds);

        // request admission metas
        await context.dataRepository.UpdateAdmissionMetas(props.competitionGroupIds);
        
        setCurrentAdmissionIds(selectedMupId);
    }
    
    useEffect(() => {
        if (props.competitionGroupIds.length !== 2) return;
        refreshAdmissionInfo();
    }, [props.competitionGroupIds]);

    useEffect(() => {
        // const need
        // if (context.dataRepository.admissionInfo.hasOwnProperty())
        context.dataRepository.UpdateStudentAdmissionsAndStudentData(admissionIds)
            .then(() => {
                const newStudentItems = createStudentItems(
                    admissionIds, context.dataRepository.admissionInfo,
                    context.dataRepository.studentData
                );
                setStudentItems(newStudentItems);
                return newStudentItems;
            })
            .then(newStudentItems => handleApplyDebounced(newStudentItems));
    }, [admissionIds]);


    const handleMupChange = (event: SelectChangeEvent) => {
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

        handleApplyDebounced(newStudentItems);
    }

    const selectStudentsByNameRecords = (
        nameRecords: TaskResultNameRecord[]
    ): { [x: string]: IStudentItem; } => {
        const personalNumbers = Object.keys(studentItems);

        const surnameToPersonalNumbers = getSurnameToKeys(
            personalNumbers,
            context.dataRepository.studentData
        );

        const newStudentItems = {...studentItems};
        personalNumbers.forEach(pn => newStudentItems[pn].testResult = 0);
        const newInvalidStudentRows: number[] = [];
        for (let i = 0; i < nameRecords.length; i++) {
            const record = nameRecords[i];
            if (record.nameParts.length === 0) continue;
            const personalNumber = findPersonalNumber(
                record,
                surnameToPersonalNumbers,
                personalNumbers,
                context.dataRepository.studentData
            )
            if (personalNumber) {
                newStudentItems[personalNumber].testResult = 1;
            } else {
                newInvalidStudentRows.push(i);
            }
        }

        setStudentItems(newStudentItems);
        setInvalidStudentRows(newInvalidStudentRows);
        return newStudentItems;
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
        debouncedWrapperForApply(() => {
            const newStudentItems = selectStudentsByNameRecords(records);
            handleApply(newStudentItems);
        });
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

    const handleRefreshAdmissionInfo = () => {
        // alert("Refresh Students passed Entrance Task");
        refreshAdmissionInfo();
    }

    const handleApply = (newStudentItems: {[key: string]: IStudentItem}) => {
        if (admissionIds.length !== 2) return;
        const personalNumberToTaskResult: {[key: string]: number | null} = {};
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
    }

    const handleApplyDebounced = (newStudentItems: {[key: string]: IStudentItem}) =>
        debouncedWrapperForApply(() => handleApply(newStudentItems));

    const handleRealApply = () => {
        alert(`Настоящее применение изменений`);
        ExecuteActions(taskResultsActions, context)
            .then(actionResults => {
                setTaskResultsActionResults(actionResults);
            });
    }

    const handleRealApplyDebounced = () => debouncedWrapperForApply(handleRealApply);

    const renderInvalidStudentRows = () => {
        const rows = textAreaValue.split('\n');
        const res: JSX.Element[] = [];
        for (const rowIdx of invalidStudentRows) {
            if (rowIdx < rows.length) {
                res.push(<li key={rowIdx}>{rows[rowIdx]}</li>);
            }
        }
        return (
            <article className="warning">
                <h4 className={style.not_parsed_rows__header}>Не получилось однозначно найти студентов по строкам:</h4>
                <ul className={style.list}>
                    {res}
                </ul>
            </article>);
    }

    return (
        <section className="step__container">
            <article>
                <h3 className={style.mup_select__header}>Выберите МУП: 

                <FormControl sx={{ minWidth: 120, marginLeft: '1em' }}>
                    <InputLabel id="task-results-mup-select-label">МУП</InputLabel>
                    <Select
                        labelId="task-results-mup-select-label"
                        value={selectedMupId}
                        label="МУП"
                        onChange={handleMupChange}
                    >
                        <MenuItem key={''} value={''}>Не выбран</MenuItem>
                        {mupIds.map(mupId => <MenuItem key={mupId} value={mupId}>{getMupNameById(mupId)}</MenuItem>)}
                    </Select>
                </FormControl></h3>
                
                <h3>Вставьте список ФИО студентов, прошедших тестовое или выберите студентов в таблице</h3>
                <textarea value={textAreaValue} onChange={handleTextAreaChange} 
                    rows={8} cols={64}
                />
                {invalidStudentRows.length > 0 && renderInvalidStudentRows()}
                <h3>Студенты (активные), прошедшие Тестовое</h3>

                <Button onClick={handleRefreshAdmissionInfo}
                    style={{fontSize: 12, marginBottom: '1em'}}
                    variant='text' startIcon={<RefreshIcon />} >Обновить список</Button>
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

                <ul>
                    {taskResultsActions.map((a: ITSAction, index: number) => <li key={index}>{a.getMessage()}</li>)}
                </ul> 

                <Button onClick={handleRealApplyDebounced}
                    variant="contained" style={{marginRight: '1em'}}
                    >Применение изменений</Button>
                <ul>
                    {taskResultsActionResults.map((logItem: IActionExecutionLogItem, index: number) =>
                        <li key={index}>{logItem.actionMessage}
                            <ul>{logItem.actionResults.map((ar, arIdx) => 
                                    <li key={arIdx} className={ar.success ? "message_success" : "message_error"}>
                                        {ar.message}
                                    </li>
                                )}
                            </ul>
                        </li>
                    )}
                </ul>

            </article>
        </section>
    );
}