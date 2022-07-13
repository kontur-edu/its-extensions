import React, {useContext, useEffect, useState} from "react";
import style from "./CompetitionGroupSelect.module.css";
import { ICompetitionGroupSelectProps } from "./types";
import {StepMessages} from "../../../utils/constants";
import { ITSContext } from "../../../common/Context";


export function CompetitionGroupSelect(props: ICompetitionGroupSelectProps) {
    const [selectedCompetitionGroupIds, setSelectedCompetitionGroupIds] = useState<number[]>([]); 
    // const [competitionGroupIdToSelected, setCompetitionGroupIdToSelected] = useState<{[key: number]: boolean}>({});
    const context = useContext(ITSContext)!;
    
    const isSelectionValid = () => {
        return selectedCompetitionGroupIds.length === 2;
    }
    const handleRefreshCompetitionGroups = () => {
        props.onRefresh();
    };

    const handleCompetitionGroupToggle = (id: number) => {
        // const newCompetitionGroupToSelected = {
        //     ...competitionGroupIdToSelected,
        //     [id]: !competitionGroupIdToSelected[id]
        // } 
        // setCompetitionGroupIdToSelected(newCompetitionGroupToSelected);
        let newIds = [];
        if (selectedCompetitionGroupIds.includes(id)) {
            newIds = selectedCompetitionGroupIds.filter(i => i !== id);
        } else {
            newIds = [...selectedCompetitionGroupIds, id];
        }
        
        setSelectedCompetitionGroupIds(newIds);
        if (newIds.length === 2) {
            props.onSelectionValid(newIds);
        }
    };

    useEffect(() => {

    },[props.competitionGroupsItems]);

    const renderRows = () => {
        return props.competitionGroupsItems.map(cgItem => {
            const selected = selectedCompetitionGroupIds.includes(cgItem.id);
            return (
                <tr onClick={() => handleCompetitionGroupToggle(cgItem.id)}
                    className={"selectable " + (selected ? style.row_selected : '')}
                >
                    <th>
                        <input type="checkbox" readOnly
                            checked={selected}/>
                    </th>
                    <th>{cgItem.name}</th>
                    <th>{cgItem.course}</th>
                    <th>{cgItem.year}</th>
                    <th>{cgItem.semesterName}</th>
                    <th>{cgItem.selectionGroupName}</th>
                </tr>
            );
        })
    }

    const doStuff = () => {
        const data = {"a": 1, "b": 2};
        const headers = {
            "Content-Type": "application/json",
            "x-redirect": "manual",
            "Accept": "*/*",
            // "x-body": "json",
        };
        const options: any = {
            method: "POST",
            headers: headers,
            body: data,
            'credentials': 'include',
            withCredentials: true,
        };
        fetch("https://functions.yandexcloud.net/d4eiimn6mlk4iokiparv", options)
        .then(res => console.log(res));
    }

    return (
        <section className="step__container">
            <article className={style.selectionGroup_select}>
                <h3>Конкурсные группы</h3>
                <button onClick={doStuff}>DO STUFF</button>
                <button className="step__button" onClick={handleRefreshCompetitionGroups}>Обновить</button>
                <section className="table__container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Выбр</th>
                                <th>Конкурсная группа</th>
                                <th>Курс</th>
                                <th>Год</th>
                                <th>Семестр</th>
                                <th>Группа выбора</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderRows()}
                        </tbody>
                    </table>
                </section>
            </article>
            <article className="step__message_container ">
                <p className={!isSelectionValid() ? "message_error" : ""}>
                    {!isSelectionValid() ?
                        StepMessages.competitionGroupsSelectError :
                        StepMessages.competitionGroupsSelected}
                </p>
            </article>
        </section>
    );
}