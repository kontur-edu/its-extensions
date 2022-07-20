import React, {useState, useContext, useEffect} from "react";
import { ITSContext } from "../../../common/Context";
import style from "./SubgroupSelection.module.css";
import { ISubgroupSelectionProps } from "./types";
import { COMPETITION_GROUP_URL, COMPETITION_GROUP_SUBGROUP_META_URL, DEBOUNCE_MS } from "../../../utils/constants";
import { ISubgoupDiffInfo, IMupSubgroupDiff } from "../../../common/types";
// import { CreateSubgroupDiffInfo, CreateDiffMessages } from "../../../subgroupUpdater/subgroupDifference";
import {REQUEST_ERROR_UNAUTHORIZED} from "../../../utils/constants";
import { ITSAction } from "../../../common/actions";
import { IActionExecutionLogItem } from "../../../common/actions";

import {CreateActionsByDiffs, GetMupNameActions} from "../../../subgroupUpdater/actionCreator";
import {CreateSubgroupDiffInfo, CreateSubgroupDiffs, CreateMupToDifferenceMessages, CreateTodoMessages} from '../../../subgroupUpdater/subgroupDiffs';

import { CreateDebouncedWrapper } from "../../../utils/helpers";
import { ExecuteActions } from "../../../common/actions";

import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import Link from '@mui/material/Link';
import NorthEastIcon from '@mui/icons-material/NorthEast';
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

const debouncedWrapperForApply = CreateDebouncedWrapper(DEBOUNCE_MS);

export function SubgroupSelection(props: ISubgroupSelectionProps) {
    const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
    const [mupIds, setMupIds] = useState<string[]>([]);
    const [mupIdsSame, setMupIdsSame] = useState<boolean>(true);
    const [subgroupDiffInfo, setSubgroupDiffInfo] = useState<ISubgoupDiffInfo | null>(null);
    const [mupToDiffs, setMupToDiffs] = useState<{[key: string]: IMupSubgroupDiff}>({});
    const [mupToDifferenceTodoMessages, setMupToDifferenceTodoMessages] = useState<{[key: string]: [string[], string[]]}>({});
    
    const [subgroupSelectionActions, setSubgroupSelectionActions] = useState<ITSAction[]>([]);
    const [subgroupSelectionActionsResults, setSubgroupSelectionActionsResults] = useState<IActionExecutionLogItem[]>([]);

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
            
            const newSubgoupDiffInfo: ISubgoupDiffInfo = CreateSubgroupDiffInfo(
                newCompetitionGroupIds,
                context.dataRepository.competitionGroupToSubgroupMetas,
                context.dataRepository.competitionGroupToSubgroupIds,
                context.dataRepository.subgroupData,
            );
            console.log("subgoupDiffInfo");
            console.log(newSubgoupDiffInfo);
            setSubgroupDiffInfo(newSubgoupDiffInfo);

            const newMupToDiffs: {[key: string]: IMupSubgroupDiff} = CreateSubgroupDiffs(
                mupNames,
                newCompetitionGroupIds,
                newSubgoupDiffInfo,
                context.dataRepository.subgroupData
            );
            console.log("newMupToDiffs");
            console.log(newMupToDiffs);
            setMupToDiffs(newMupToDiffs);
            
            const newMupToDifferenceMessages = CreateMupToDifferenceMessages(
                mupNames,
                newMupToDiffs,
                newCompetitionGroupIds,
                newSubgoupDiffInfo
            );
            console.log("newMupToDifferenceMessages");
            console.log(newMupToDifferenceMessages);
            // setMupToDifferenceTodoMessages(newMupToDifferenceMessages);

            const newActions = CreateActionsByDiffs(
                newCompetitionGroupIds,
                newMupToDiffs,
                newSubgoupDiffInfo,
                context.dataRepository.subgroupData
            );

            alert(`${newActions.length} actions created`);
            
            setSubgroupSelectionActions(newActions);

            const mupNameToActions = GetMupNameActions(newActions);
            
            const mupToDifferenceTodoMessages: {[key: string]: [string[], string[]]} = {};
            for (const mupName of mupNames) {
                let mupActions: ITSAction[] = [];
                if (mupNameToActions.hasOwnProperty(mupName)) {
                    mupActions = mupNameToActions[mupName];
                }
                if (!newMupToDiffs.hasOwnProperty(mupName)) {
                    throw new Error(`${mupName} has no corresponding newMupToDiffs`);
                }
                const todoMessages = CreateTodoMessages(
                    newMupToDiffs[mupName],
                    mupActions,
                );
                mupToDifferenceTodoMessages[mupName] = [
                    newMupToDifferenceMessages[mupName],
                    todoMessages
                ];
                // if (subgoupDiffInfo.subgroupAndMetaAreSameDiffs.hasOwnProperty(mupName)) {
                //     const [s1, s2] = subgoupDiffInfo.subgroupAndMetaAreSameDiffs[mupName];
                //     if (!s1 || !s2) {
                //     }
                // }
            }

            setMupToDifferenceTodoMessages(mupToDifferenceTodoMessages);
        } else {
            setMupIdsSame(false);
        }
    }


    const refreshData = () => {
        return context.dataRepository.UpdateSelectionGroupData()
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

    const refreshDataDebounced = () => {
        debouncedWrapperForApply(() => {
            refreshData();
            // .then(() => handleApply());
        });
    }

    useEffect(() => {
        if (!props.dataIsPrepared || props.selectionGroupIds.length !== 2) {
            return;
        }
        prepareData();
        // handleApply();
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
                <ul className={style.list}>
                    {selectionGroupNamesWithoutCompetitionGroups.map((name: string, index: number) =>
                        <li key={index}>{name}</li>)}
                </ul>
                <p>
                    Создайте недостающие Конкрусные группы и укажите Группы
                        выбора <Link href={COMPETITION_GROUP_URL} rel="noreferrer" target="_blank"
                                style={{textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: 16}} >
                                    <NorthEastIcon />в ИТС
                            </Link>
                        
                        {/* <a href={COMPETITION_GROUP_URL} rel="noreferrer" target="_blank">тут -	&#62; its.urfu.ru</a> */}
                </p>
                
            </div>
        );
    }

    const renderCompetitionGroupSubgroupMetaLinks = () => {
        if (competitionGroupIds.length !== 2) return null;
        return (
            <React.Fragment>
                <h3>Заполните подгруппы для одной Конкурсной группы Групп выбора:</h3>
                <ul className={style.list}>
                    {props.selectionGroupIds.map(sgId => {
                        const selectionGroup = context.dataRepository.selectionGroupData.data[sgId];
                        const competitionGroupName = selectionGroup.competitionGroupName;
                        const link = COMPETITION_GROUP_SUBGROUP_META_URL + selectionGroup.competitionGroupId;
                        return <li key={sgId}>
                            <Link href={link} rel="noreferrer" target="_blank"
                                style={{textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: 16}} >
                                    <NorthEastIcon />{competitionGroupName}
                            </Link>
                            {/* <a href={link}  rel="noreferrer" target="_blank">
                                {competitionGroupName}
                            </a> */}
                        </li>
                    })}
                </ul>
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
            const mup = context.dataRepository.mupData.data[mupId];
            
            if (!mupToDifferenceTodoMessages.hasOwnProperty(mup.name)) {
                throw new Error(`${mup.name} has no corresponding mupToDifferenceTodoMessages`);
            }
            const diffTodoMessages = mupToDifferenceTodoMessages[mup.name];

            return (
                <tr key={mupId}>
                    <td>{mup.name}</td>
                    <td>
                        <ul className={style.list}>
                            {diffTodoMessages[0].map((val, index) => <li key={index}>{val}</li>)}
                        </ul>
                    </td>
                    <td>
                        <ul className={style.list}>
                            {diffTodoMessages[1].map((val, index) => <li key={index}>{val}</li>)}
                        </ul>
                    </td>
                </tr>
            );
        });
    }
    
    // const setUpDiffMessagesByActions = (
    //     actions: ITSAction[],
    // ) => {
    //     const mupToActions = GetMupNameActions(actions);

    //     const newDiffMessages = {...diffMessages};
    //     console.log("newDiffMessages");
    //     console.log(newDiffMessages);

    //     let needToCreateSubgroups = false;
    //     for (const action of actions) {
    //         if (action.actionType === ActionType.CreateSubgroups) {
    //             needToCreateSubgroups = true;
    //             break;
    //         }
    //     }

        // for (const mupName in newDiffMessages) {
        //     newDiffMessages[mupName].todos = [];
        //     if (needToCreateSubgroups) {
        //         newDiffMessages[mupName].todos.push(`Примените изменения для создания подгрупп`);
        //     }
        // }

        // for (const mupName in mupToActions) {
        //     console.log(`mupName: ${mupName}`);
        //     if (newDiffMessages.hasOwnProperty(mupName)) {
        //         newDiffMessages[mupName].todos.push(
        //             ...mupToActions[mupName].map(a => a.getMessageSimple())
        //         );
        //     }
        // }

        // setDiffMessages(newDiffMessages);
    // }

    // const handleApply = () => {
    //     if (subgroupDiffInfo) {
    //         const actions = CreateActionsByDiffs(
    //             competitionGroupIds,
    //             subgroupDiffInfo,
    //             context.dataRepository.subgroupData
    //         );
    //         // alert(actions.length);
    //         setSubgroupSelectionActions(actions);

    //         setUpDiffMessagesByActions(actions);
    //         // props.onApply(competitionGroupIds, subgroupDiffInfo);
    //     } else {
    //         // alert("subgroupDiffInfo is null");
    //     }
    // }

    const handleApplyReal = () => {
        ExecuteActions(subgroupSelectionActions, context)
            .then(results => setSubgroupSelectionActionsResults(results))
            .then(() => alert("Изменения применены"))
            .then(() => refreshDataDebounced())
            .catch(err => {
                if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
                    props.onUnauthorized();
                    return;
                }
                throw err;
            });
    }

    return (
        <section className="step__container">
            <article>
                <Button onClick={refreshDataDebounced}
                    style={{fontSize: 12}}
                    variant='text' startIcon={<RefreshIcon />} >Обновить список</Button>
                {/* <button className="step__button" onClick={refreshData}>Обновить</button> */}
                {competitionGroupIds.length !== 2 && renderCompetitionGroupIsMissingMessage()}
                {renderCompetitionGroupSubgroupMetaLinks()}
                {renderMupsAreDifferent()}
                <section className="table__container">
                    <table className="table table_vertical_borders">
                        <thead>
                            <tr>
                                <th>МУП</th>
                                <th>Отличия</th>
                                <th>Действие</th>
                            </tr>
                        </thead>
                        <tbody>
                            {competitionGroupIds.length === 2 && renderRows()}
                        </tbody>
                    </table>
                </section>

                <ul>
                    {subgroupSelectionActions.map((a: ITSAction, index: number) => <li key={index}>{a.getMessage()}</li>)}
                </ul>

                <Button onClick={handleApplyReal}
                    variant="contained" style={{marginRight: '1em'}}
                    >Применение изменений</Button>
                {/* <button className="step__button" onClick={handleSubgroupSelectionApplyReal}>Настоящее применение</button> */}
                <ul>
                    {subgroupSelectionActionsResults.map((logItem: IActionExecutionLogItem, index: number) =>
                        <li key={index}>{logItem.actionMessage}
                            <ul>{logItem.actionResults.map((ar, arIdx) => 
                                    <li key={arIdx} className={ar.success ? "message_success" : "message_error"}>
                                        {ar.message}
                                    </li>
                                )}
                            </ul>
                        </li>
                    )}
                    {/* {subgroupSelectionActionsResults.map((ar: IActionResponse, index: number) =>
                        <li key={index} className={ar.success ? "message_success" : "message_error"}>{ar.message}</li>
                    )} */}
                </ul>
                
                {/* <button className="step__button" onClick={handleApply}>Применить действия</button> */}
            </article>
        </section>
    );
}