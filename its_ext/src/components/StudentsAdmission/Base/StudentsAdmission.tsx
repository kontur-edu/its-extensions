import React, {useState, useEffect, useRef, useContext} from "react";

import style from "./StudentsAdmission.module.css";
import { IStudentsAdmissionProps } from "./types";
import { ITSContext } from "../../../common/Context";
import { CompetitionGroupSelect } from "../CompetitionGroupSelect";
import { ICompetitionGroupItem } from "../CompetitionGroupSelect/types";
import {REQUEST_ERROR_UNAUTHORIZED} from "../../../utils/constants";


export function StudentsAdmission(props: IStudentsAdmissionProps) {
    const [competitionGroupItems, setCompetitionGroupItems] = useState<ICompetitionGroupItem[]>([]);
    const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
    const competitionGroupRefreshInProgress = useRef<boolean>(false);
    const context = useContext(ITSContext)!;

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
        </section>
    );
}