import React, {useEffect, useState} from "react";
import style from "./CompetitionGroupSelect.module.css";
import { ITaskResultsInputProps } from "./types";
import {StepMessages} from "../../../utils/constants";


export function TaskResultsInput(props: ITaskResultsInputProps) {
    // const []
    useEffect(() => {
        // Find mupIds intersection
        // Request Students Admissions
        // 
    }, [props.competitionGroupIds]);

    

    const renderRows = () => {
        // return props.competitionGroupsItems.map(cgItem => {
        //     const selected = selectedCompetitionGroupIds.includes(cgItem.id);
        //     return (
        //         <tr onClick={() => handleCompetitionGroupToggle(cgItem.id)}
        //             className={"selectable " + (selected ? style.row_selected : '')}
        //         >
        //             <th>
        //                 <input type="checkbox" readOnly
        //                     checked={selected}/>
        //             </th>
        //             <th>{cgItem.name}</th>
        //             <th>{cgItem.course}</th>
        //             <th>{cgItem.year}</th>
        //             <th>{cgItem.semesterName}</th>
        //             <th>{cgItem.selectionGroupName}</th>
        //         </tr>
        //     );
        // })
    }

    const handleRefreshCompetitionGroups = () => {
        alert("Refresh Students passed Entrance Task");
    }

    return (
        <section className="step__container">
            <article>
                <h3>Студенты, прошедшие Тестовое</h3>
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
                            {/* {renderRows()} */}
                        </tbody>
                    </table>
                </section>
            </article>
        </section>
    );
}