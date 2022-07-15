import React, {useState, useEffect, useRef, useContext} from "react";

import style from "./StudentsAdmission.module.css";
import { IStudentsAdmissionProps } from "./types";
import { ITSContext } from "../../../common/Context";
import { CompetitionGroupSelect } from "../CompetitionGroupSelect";
import { ICompetitionGroupItem } from "../CompetitionGroupSelect/types";
import {REQUEST_ERROR_UNAUTHORIZED} from "../../../utils/constants";
import { TaskResultsInput } from "../TaskResultsInput";

import { ITSAction, ExecuteActions } from "../../../common/actions";
import {IActionResponse} from "../../../utils/ITSApiService";
import { createTaskResultActions } from "../../../taskResultUpdater/actionCreator";


export function StudentsAdmission(props: IStudentsAdmissionProps) {
    const [competitionGroupItems, setCompetitionGroupItems] = useState<ICompetitionGroupItem[]>([]);
    const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
    const competitionGroupRefreshInProgress = useRef<boolean>(false);
    const context = useContext(ITSContext)!;
    const [taskResultsActions, setTaskResultsActions] = useState<ITSAction[]>([]);
    const [taskResultsActionResults, setTaskResultsActionResults] = useState<IActionResponse[]>([]);

    // const requestCompetitionGroupsInProgress = useRef(false);
    
    const refreshCompetitionGroups = () => {
        if (props.isUnauthorized || competitionGroupRefreshInProgress.current) {
            return;
        }
        competitionGroupRefreshInProgress.current = true;
        context.dataRepository.UpdateCompetitionGroupData()
        .then(() => {
            competitionGroupRefreshInProgress.current = false;
            const newCompetitionGroupItems = context.dataRepository.competitionGroupData.ids
                .map(cgId => {
                    const competitionGroup = context.dataRepository.competitionGroupData.data[cgId];
                    const selectionGroups = competitionGroup.selectionGroupNames.join(', ');
                    const cgItem: ICompetitionGroupItem = {
                        id: competitionGroup.id,
                        name: competitionGroup.name,
                        course: competitionGroup.course,
                        year: competitionGroup.year,
                        semesterName: competitionGroup.semesterName,
                        selectionGroupName: selectionGroups,
                    };
        
                    return cgItem;
                })
            setCompetitionGroupItems(newCompetitionGroupItems);
        }).catch(err => {
            competitionGroupRefreshInProgress.current = false;
            if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
                props.onUnauthorized();
                return;
            }
            throw err;
        });
    };
    
    useEffect(() => {
        refreshCompetitionGroups();

    }, []);

    const handleCompetitionGroupsSelect = (newCompetitionGroupIds: number[]) => {
        setCompetitionGroupIds(newCompetitionGroupIds);
    }

    const handleTaskResultsInputApply = (admissionIds: number[], personalNumberToTaskResult: {[key: string]: number | null}) => {
        alert(`Применение изменений`);
        const actions = createTaskResultActions(
            admissionIds,
            personalNumberToTaskResult,
            context.dataRepository.admissionInfo,
            context.dataRepository.studentData
        );
        setTaskResultsActions(actions);
    }

    const handleTaskResultsInputApplyReal = () => {
        alert(`Настоящее применение изменений`);
        return;
        ExecuteActions(taskResultsActions, context)
            .then(actionResults => {
                setTaskResultsActionResults(actionResults);
            });
    }

    const renderTaskResultsInput = () => {
        return (
            <React.Fragment>
                <article className="step">
                    <div className="step__bage">2</div>
                    <span className="step__header">Ввод результатов отборочных заданий</span>
                </article>

                <TaskResultsInput
                    competitionGroupIds={competitionGroupIds}
                    onApply={handleTaskResultsInputApply}
                    onUnauthorized={props.onUnauthorized}
                />
                <ul>
                    {taskResultsActions.map((a: ITSAction, index: number) => <li key={index}>{a.getMessage()}</li>)}
                </ul>
                <button className="step__button" onClick={handleTaskResultsInputApplyReal}>Настоящее применение</button>
                <ul>
                    {taskResultsActionResults.map((ar: IActionResponse, index: number) =>
                        <li key={index} className={ar.success ? "message_success" : "message_error"}>{ar.message}</li>
                    )}
                </ul>
            </React.Fragment>
        );
    };

    return (
        <section className="page">
            <h2 className="action_header">Зачисление студентов</h2>
            <article className="step">
                <div className="step__bage">1</div>
                <span className="step__header">Выберите конкурсные группы для 3-го и 4-го курсов</span>
            </article>

            <CompetitionGroupSelect
                competitionGroupsItems={competitionGroupItems}
                onRefresh={refreshCompetitionGroups}
                onSelectionValid={handleCompetitionGroupsSelect}
            />

            {competitionGroupIds.length === 2 ? renderTaskResultsInput() : null}
        </section>
    );
}