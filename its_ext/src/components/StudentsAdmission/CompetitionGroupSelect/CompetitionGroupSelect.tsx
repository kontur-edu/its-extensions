import React, {useContext, useEffect, useState} from "react";
import style from "./CompetitionGroupSelect.module.css";
import { ICompetitionGroupSelectProps } from "./types";
// import {StepMessages} from "../../../utils/constants";
// import { ITSContext } from "../../../common/Context";
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import Checkbox from '@mui/material/Checkbox';

export function CompetitionGroupSelect(props: ICompetitionGroupSelectProps) {
    const [selectedCompetitionGroupIds, setSelectedCompetitionGroupIds] = useState<number[]>([]); 
    // const [competitionGroupIdToSelected, setCompetitionGroupIdToSelected] = useState<{[key: number]: boolean}>({});
    // const context = useContext(ITSContext)!;
    
    // const isSelectionValid = () => {
    //     return selectedCompetitionGroupIds.length === 2;
    // }
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
        props.onSelectionValid(newIds);
        // if (newIds.length === 2) {
        //     props.onSelectionValid(newIds);
        // }
    };

    useEffect(() => {

    },[props.competitionGroupsItems]);

    const renderRows = () => {
        return props.competitionGroupsItems.map(cgItem => {
            const selected = selectedCompetitionGroupIds.includes(cgItem.id);
            return (
                <tr key={cgItem.id} className="selectable" onClick={() => handleCompetitionGroupToggle(cgItem.id)}>
                    <th>
                        <Checkbox readOnly checked={selected} />
                        {/* <input type="checkbox" readOnly
                            checked={selected}/> */}
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

    return (
        <section className="step__container">
            <article>
                <h3>Конкурсные группы</h3>
                {/* <button onClick={doStuff}>DO STUFF</button> */}
                <Button onClick={handleRefreshCompetitionGroups}
                    style={{fontSize: 12, marginBottom: '1em'}}
                    variant='text' startIcon={<RefreshIcon />} >Обновить список</Button>
                {/* <button className="step__button" onClick={handleRefreshCompetitionGroups}>Обновить</button> */}
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
            {/* <article className="step__message_container ">
                <p className={!isSelectionValid() ? "message_error" : ""}>
                    {!isSelectionValid() ?
                        StepMessages.competitionGroupsSelectError :
                        StepMessages.competitionGroupsSelected}
                </p>
            </article> */}
        </section>
    );
}