import React, {useState, useContext, useEffect} from "react";
import { ITSContext } from "../../../common/Context";
import style from "./SubgroupSelection.module.css";
import { ISubgroupSelectionProps } from "./types";
import { COMPETITION_GROUP_URL, COMPETITION_GROUP_SUBGROUP_META_URL } from "../../../utils/constants";
import { ISubgoupDiffInfo, IMupSubgroupDiff } from "../../../common/types";
import { CreateSubgroupDiffInfo, CreateDiffMessages } from "../../../subgroupUpdater/subgroupDifference";
import {REQUEST_ERROR_UNAUTHORIZED} from "../../../utils/constants";
// import {ISubgoupMetaDiff} from "../../../common/types";
// Для выбранных групп выбора получить ID их Конкурсных групп

// Запросить конкурсные группы
// https://its.urfu.ru/MUPItsSubgroupMeta/Index?competitionGroupId=24&_dc=1657456081410&page=1&start=0&limit=300&filter=%5B%7B%22property%22%3A%22title%22%2C%22value%22%3A%22%22%7D%2C%7B%22property%22%3A%22discipline%22%2C%22value%22%3A%22%22%7D%2C%7B%22property%22%3A%22count%22%2C%22value%22%3A%22%22%7D%5D
// https://its.urfu.ru/MUPItsSubgroupMeta/Edit
// id: 421
// groupCount: 1

function checkArraysSame(arr1: any[], arr2: any[]) {
    return arr1.sort().join(',') === arr2.sort().join(',');
}

export function SubgroupSelection(props: ISubgroupSelectionProps) {
    const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
    const [mupIds, setMupIds] = useState<string[]>([]);
    const [mupIdsSame, setMupIdsSame] = useState<boolean>(true);
    const [subgroupDiffInfo, setSubgroupDiffInfo] = useState<ISubgoupDiffInfo | null>(null);
    const [diffMessages, setDiffMessages] = useState<{[key: string]: IMupSubgroupDiff}>({});
    const context = useContext(ITSContext)!;


    const extractCompetitionGroupIds = (selectionGroupIds: number[]) => {
        const newCompetitionGroupIds: number[] = [];
        selectionGroupIds.forEach(sgId => {
            const cgId = context.dataRepository.selectionGroupData.data[sgId].competitionGroupId;
            if (cgId !== null && cgId !== undefined) {
                newCompetitionGroupIds.push(cgId);
            }
        });
        return newCompetitionGroupIds;
    }

    const prepareData = () => {
        const newCompetitionGroupIds = extractCompetitionGroupIds(props.selectionGroupIds);
        setCompetitionGroupIds(newCompetitionGroupIds);

        const sgMupIds: string[][] = [];
        for (let sgId of props.selectionGroupIds) {
            sgMupIds.push(
                context.dataRepository.selectionGroupToMupsData.data[sgId].ids
            );
        }
        if (checkArraysSame(sgMupIds[0], sgMupIds[1])) {
            setMupIdsSame(true);
            setMupIds(sgMupIds[0]);
            const mupNames: string[] = [];

            for (let mupId of sgMupIds[0]) {
                const mup = context.dataRepository.mupData.data[mupId];
                mupNames.push(mup.name);
            }
            console.log("creating subgoupDiffInfo");
            const subgoupDiffInfo: ISubgoupDiffInfo = CreateSubgroupDiffInfo(
                newCompetitionGroupIds,
                context.dataRepository.competitionGroupToSubgroupMetas,
                context.dataRepository.competitionGroupToSubgroupIds,
                context.dataRepository.subgroupData,
            );
            console.log("subgoupDiffInfo");
            console.log(subgoupDiffInfo);
            setSubgroupDiffInfo(subgoupDiffInfo);

            const diffMessages = CreateDiffMessages(
                mupNames,
                newCompetitionGroupIds,
                subgoupDiffInfo,
                context.dataRepository.subgroupData
            );
            setDiffMessages(diffMessages);
        } else {
            setMupIdsSame(false);
        }
    }


    const refreshData = () => {
        context.dataRepository.UpdateSelectionGroupData()
            .then(() => extractCompetitionGroupIds(props.selectionGroupIds))
            .then(newCompetitionGroupIds => {
                return Promise.allSettled([
                    context.dataRepository.UpdateSubgroupMetas(newCompetitionGroupIds),
                    context.dataRepository.UpdateSubgroups(newCompetitionGroupIds),
                ])
            })
            .then(() => prepareData())
            .catch(err => {
                if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
                    props.onUnauthorized();
                    return;
                }
                throw err;
            });
    }

    useEffect(() => {
        if (!props.dataIsPrepared || props.selectionGroupIds.length !== 2) {
            return;
        }
        prepareData();
    }, [props.dataIsPrepared, props.selectionGroupIds]);

    const renderCompetitionGroupIsMissingMessage = () => {
        const selectionGroupNamesWithoutCompetitionGroups: string[] = [];
        props.selectionGroupIds.forEach(sgId => {
            const selectionGroup = context.dataRepository.selectionGroupData.data[sgId];
            if (selectionGroup.competitionGroupId === null ||
                selectionGroup.competitionGroupId === undefined) {                    
                
                selectionGroupNamesWithoutCompetitionGroups.push(selectionGroup.name);
            }
        }); 
        if (selectionGroupNamesWithoutCompetitionGroups.length === 0) return null;
        return (
            <div className="message_error">
                <p>Конкурсная группа отсутствует для следующих Групп выбора:</p>
                <ul>
                    {selectionGroupNamesWithoutCompetitionGroups.map((name: string, index: number) =>
                        <li key={index}>{name}</li>)}
                </ul>
                <p>
                    Создайте недостающие Конкрусные группы и укажите Группы выбора 
                    <a href={COMPETITION_GROUP_URL} rel="noreferrer" target="_blank">{"тут -> its.urfu.ru"}</a>
                </p>
                
            </div>
        );
    }

    const renderCompetitionGroupSubgroupMetaLinks = () => {
        if (competitionGroupIds.length !== 2) return null;
        return (
            <React.Fragment>
                <h3>Заполните подгруппы для одной Конкурсной группы Групп выбора:</h3>
                <ol>
                    {props.selectionGroupIds.map(sgId => {
                        const selectionGroup = context.dataRepository.selectionGroupData.data[sgId];
                        const competitionGroupName = selectionGroup.competitionGroupName;
                        const link = COMPETITION_GROUP_SUBGROUP_META_URL + selectionGroup.competitionGroupId;
                        return <li key={sgId}>
                            <a href={link}  rel="noreferrer" target="_blank">
                                {competitionGroupName}
                            </a>
                        </li>
                    })}
                </ol>
            </React.Fragment>
        );
    }

    const renderMupsAreDifferent = () => {
        if (mupIdsSame) return null;
        return (
            <h3 className="message_error">
                Состав МУПов в выбранных группах отличается, настройте МУПы на предыдущем шаге
            </h3>
        );
    }

    const renderRows = () => {
        if (!subgroupDiffInfo) return null;

        return mupIds.map(mupId => {
            let differences: string[] = [];
            let todos: string[] = [];
            
            const mup = context.dataRepository.mupData.data[mupId];
            if (diffMessages.hasOwnProperty(mup.name)) {
                differences = diffMessages[mup.name].differences;
                todos = diffMessages[mup.name].todos;
            }

            return (
                <tr key={mupId}>
                    <td>{mup.name}</td>
                    <td>
                        {differences.map((val, index) => <li key={index}>{val}</li>)}
                    </td>
                    <td>
                        {todos.map((val, index) => <li key={index}>{val}</li>)}
                    </td>
                </tr>
            );
        });
    }
    
    const handleApply = () => {
        if (subgroupDiffInfo) {
            props.onApply(competitionGroupIds, subgroupDiffInfo);
        } else {
            alert("subgroupDiffInfo is null");
        }
    }

    return (
        <section className="step__container">
            <article>
                <button className="step__button" onClick={refreshData}>Обновить</button>
                {renderCompetitionGroupIsMissingMessage()}
                {renderCompetitionGroupSubgroupMetaLinks()}
                {renderMupsAreDifferent()}
                <section className="table__container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>МУП</th>
                                <th>Отличия</th>
                                <th>Действие</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderRows()}
                        </tbody>
                    </table>
                </section>

                <button className="step__button" onClick={handleApply}>Применить действия</button>
            </article>
        </section>
    );
}