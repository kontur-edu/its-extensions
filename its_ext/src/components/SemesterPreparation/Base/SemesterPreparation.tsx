import React, {useState, useEffect, useRef, useContext} from "react";
import { MupEditor } from "../MupEditor";
import { ISelectionListItem } from "../../SelectionList/types";
import style from "./SemesterPreparation.module.css";
import { ISemesterPreparationProps } from "./types";
import { IMupDiff, ISubgoupDiffInfo } from "../../../common/types";
import { REQUEST_ERROR_UNAUTHORIZED} from "../../../utils/constants";

// import { context.dataRepository } from "../../../utils/repository";
import { GroupSelect } from "../GroupSelect/GroupSelect";
import { UnionArrays } from "../../../utils/helpers";
// import { AddLoadToPeriod, CheckRemovedMUPs, UpdateSelectionGroups } from "../../../utils/requests";
// import {ApplyMupUpdates} from "../MupEditor/utils";
import {createActions} from "../../../mupUpdater/actionCreater";
import {createSubgroupSelectionActions} from "../../../subgroupUpdater/actionCreator";
import { ITSContext } from "../../../common/Context";
import { ITSAction, ExecuteActions } from "../../../common/actions";
import {IActionResponse} from "../../../utils/ITSApiService";
import { SubgroupSelection } from "../SubgroupSelection";

import { Button } from "@mui/material";
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';

// Получение данных:
// Запросить все Группы выбора
// Запросить МУПы с Лимитами для выбранных Групп выбора
// Найти объединение выбранных МУПов из Групп выбора
// Запросить все Периоды для МУПов из объединения
// Отобрать периоды с годом и типом семестра (весна/осень) таким же как и в первой из выбранных групп выбора (для определения дат)
// Понадобится любой период с заполненными нагрузками, чтобы скопировать нагрузки 
// Вставить дату из первого попавшегося периода
// Определить МУПы с пустыми нагрузками (Tmers)
// Определить какие МУПы есть только в одной из групп
// Определить какие МУПы не имеют подходящего периода
// Проверить, есть ли отличия дат среди выбранных периодов

// Ошибки:
// Нет МУПа в группе -> Добавить МУП в группу ("Примените изменения")
// Лимит не совпадает -> Установить нужный Лимит ("Примените изменения")
// Подходящего периода нет -> создать период с датами и (если есть) вставить нагрузки из любого другого периода ("Примените изменения")
// Нет другого периода с заполненными нагрузками -> дать ссылку на ИТС для заполнения нагрузки, созданному периоду (ссылка)
// Даты (начала/конца выбора) не совпадают -> изменить даты в отобранных периодах ("Примените изменения")


// По кнопке "Применить изменения":
// 1) Добавление МУПов в группы
// 2) Обновление Лимитов
// 3) Создание нужных периодов
// 4) Обновление дат в периодах


// unionMupIds -> mupdsUpdate (request limit);
// mupId -> limit
// AllMups if (limit > 0) new
// mupsUpdate {ids: [], data: {id: {id, limit}}}

export function SemesterPreparation(props: ISemesterPreparationProps) {
    // TODO: вынести в отдельный компонент
    const [selectionGroupsListItems, setSelectionGroupsListItems] = useState<ISelectionListItem[]>([]); 
    const [selectionGroupsIds, setSelectionGroupsIds] = useState<number[]>([]);
    // const [mupsUpdates, setMupUpdates] = useState<{[key: string]: IMupUpdate}>({});
    // const [selectedMupIds, setSelectedMupIds] = useState<string[]>([]);
    // const [mupData, setMupData] = useState<IMupData | null>(null);
    // const [mupToPerionds, setMupToPerionds] = useState<IMupToPeriods | null>(null);
    const [editorDataPrepared, setEditorDataPrepared] = useState<boolean>(false);
    const requestSelectionGroupsInProgress = useRef(false);
    const [mupEditorActions, setMupEditorActions] = useState<ITSAction[]>([]);
    const [mupEditorActionResults, setMupEditorActionResults] = useState<IActionResponse[]>([]);
    const [subgroupSelectionActions, setSubgroupSelectionActions] = useState<ITSAction[]>([]);
    const [subgroupSelectionActionsResults, setSubgroupSelectionActionsResults] = useState<IActionResponse[]>([]);

    const stepTwoRef = useRef<HTMLElement | null>(null);
    const context = useContext(ITSContext)!;

    const refreshSelectionGroups = () => {
        if (props.isUnauthorized) {
            return;
        }
        if (!requestSelectionGroupsInProgress.current) {
            requestSelectionGroupsInProgress.current = true;
            context.dataRepository.UpdateSelectionGroupData().then(() => {
                requestSelectionGroupsInProgress.current = false;
                setSelectionGroupsListItems(
                    context.dataRepository.selectionGroupData.ids
                        .map(sgId => {
                            return {
                                id: sgId,
                                name: context.dataRepository.selectionGroupData.data[sgId].name
                            }
                        })
                    );
            }).catch(err => {
                requestSelectionGroupsInProgress.current = false;
                if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
                    props.onUnauthorized();
                    return;
                }
                throw err;
            });
        }
    };

    const refreshSelectionGroupMups = async (ids: number[]) => {
        console.log(`refreshSelectionGroupMups`);
        console.log(ids);
        await context.dataRepository.UpdateSelectionGroupToMupsData(ids);
        let newChosenMups: string[] = [];
        if (ids.length === 2) {
            const firstSGId = ids[0];
            const secondSGId = ids[1];
            if (context.dataRepository.selectionGroupToMupsData.data.hasOwnProperty(firstSGId) &&
                context.dataRepository.selectionGroupToMupsData.data.hasOwnProperty(secondSGId)) {
                newChosenMups = UnionArrays(
                    context.dataRepository.selectionGroupToMupsData.data[firstSGId].ids,
                    context.dataRepository.selectionGroupToMupsData.data[secondSGId].ids,
                );
                // setSelectedMupIds(newChosenMups);
            } else {
                throw Error("ERROR: Data for chosen SelectionGroups is absent!!!");
            }
        }
        return newChosenMups;
    };

    const refreshMupData = async () => {
        console.log(`refreshMupData`);
        await context.dataRepository.UpdateMupData();
        // setMupData(context.dataRepository.mupData);
    }

    const refreshPeriods = async (mupIds: string[]) => {
        console.log(`refreshPeriods`);
        console.log(mupIds);
        await context.dataRepository.UpdatePeriods(mupIds);
        // setMupToPerionds(context.dataRepository.mupToPeriods);
    }

    const refreshSubgroupMetasAndSubgroups = async (selectionGroupIds: number[]) => {
        console.log(`refreshSubgroupMetasAndSubgroups`);
        const competitionGroupIds: number[] = [];
        for (let selectionGroupId of selectionGroupIds) {
            const selectionGroup = context.dataRepository.selectionGroupData.data[selectionGroupId];
            const competitionGroupId = selectionGroup.competitionGroupId;
            if (competitionGroupId !== null && competitionGroupId !== undefined) {
                competitionGroupIds.push(competitionGroupId);
            }
        }
        return Promise.allSettled([
            context.dataRepository.UpdateSubgroupMetas(competitionGroupIds),
            context.dataRepository.UpdateSubgroups(competitionGroupIds)
        ]);
        // return context.dataRepository.UpdateSubgroupMetas(competitionGroupIds)
        //     .then(() => context.dataRepository.UpdateSubgroups(competitionGroupIds));
    }

    const prepareDataForSelectionGroups = async (selectionGroupIds: number[]) => {
        const ensureMupDataPromise = 
            context.dataRepository.mupData.ids.length === 0 ?
                refreshMupData() : Promise.resolve();
        const refreshGroupMupsThenPeriodsPromise = 
            refreshSelectionGroupMups(selectionGroupIds)
            .then(mupIds => refreshPeriods(mupIds));
        const refreshSubgroupMetasAndSubgroupsPromise =
            refreshSubgroupMetasAndSubgroups(selectionGroupIds);
        return Promise.all([
            ensureMupDataPromise,
            refreshGroupMupsThenPeriodsPromise,
            refreshSubgroupMetasAndSubgroupsPromise,
        ]);
    }

    // selectionGroupMups, SubgroupGroupMetas, Subgroups 
    const handleSelectionGroupValid = (selectionGroupIds: number[]) => {
        setEditorDataPrepared(false);
        console.log("handleSelectionGroupValid");
        // remember chosen selectionGroup ids
        setSelectionGroupsIds(selectionGroupIds);
        // request mups for chosen selectionGroups
        // find union of mupIds in chosen selectionGroups
        // const groupMupsRefreshPromise = refreshSelectionGroupMups(selectionGroupIds);
        prepareDataForSelectionGroups(selectionGroupIds)
        .then(() => setEditorDataPrepared(true))
        .catch(err => {
            if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
                props.onUnauthorized();
                return;
            }
            throw err;
        });
    }

    const handleGroupSelectButton = () => {
        stepTwoRef.current?.scrollIntoView({behavior: 'smooth'});
    }

    const handleMupEditorApply = (
        selectedMupsIds: string[],
        mupDiffs: {[key: string]: IMupDiff},
        newDates: [string, string],
        mupLimits: {[key: string]: number},
    ) => {
        alert(`Применение изменений`);
        const actions = createActions(
            selectionGroupsIds,
            selectedMupsIds,
            mupDiffs,
            newDates,
            mupLimits,
            context
        );
        setMupEditorActions(actions);
    }

    const handleMupEditorApplyReal = () => {
        // return; // TODO: Delete this;
        setMupEditorActionResults([]);
        ExecuteActions(mupEditorActions, context)
                .then(results => setMupEditorActionResults(results))
                .then(() => alert("Изменения применены"))
                .catch(err => {
                    if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
                        props.onUnauthorized();
                        return;
                    }
                    throw err;
                });

        setMupEditorActions([]);
        prepareDataForSelectionGroups(selectionGroupsIds)
            .then(() => setSelectionGroupsIds([...selectionGroupsIds]))
            .catch(err => {
                if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
                    props.onUnauthorized();
                    return;
                }
                throw err;
            });
    }


    const handleSubgroupSelectionApply = (
        competitionGroupIds: number[],
        subgroupInfo: ISubgoupDiffInfo
    ) => {
        alert(`Применение изменений`);
        const actions = createSubgroupSelectionActions(
            competitionGroupIds,
            subgroupInfo,
            context.dataRepository.subgroupData
        );
        console.log("handleSubgroupSelectionApply");
        console.log(actions);
        setSubgroupSelectionActions(actions);
    }

    const handleSubgroupSelectionApplyReal = () => {
        // return; // TODO: Delete this;
        setMupEditorActionResults([]);
        ExecuteActions(subgroupSelectionActions, context)
                .then(results => setSubgroupSelectionActionsResults(results))
                .then(() => alert("Изменения применены"));

        setSubgroupSelectionActions([]);
        prepareDataForSelectionGroups(selectionGroupsIds)
        .then(() => setSelectionGroupsIds([...selectionGroupsIds]))
        .catch(err => {
            if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
                props.onUnauthorized();
                return;
            }
            throw err;
        });
    }

    useEffect(() => {
        refreshSelectionGroups();
        return () => {};
    }, [props.isUnauthorized]);

    const renderStep2 = () => {
        return (
            <article className="step" ref={stepTwoRef}>
                <span className="step__header">2. Выберите МУПы и назначьте лимиты</span>

                <MupEditor
                    selectionGroupIds={selectionGroupsIds}
                    dataIsPrepared={editorDataPrepared}
                    onApply={handleMupEditorApply}
                    onUnauthorized={props.onUnauthorized}
                />
                <ul>
                    {mupEditorActions.map((a: ITSAction, index: number) => <li key={index}>{a.getMessage()}</li>)}
                </ul>
                <button className="step__button" onClick={handleMupEditorApplyReal}>Настоящее применение</button>
                <ul>
                    {mupEditorActionResults.map((ar: IActionResponse, index: number) =>
                        <li key={index} className={ar.success ? "message_success" : "message_error"}>{ar.message}</li>
                    )}
                </ul>
            </article>
        );
    }

    const renderStep3 = () => {
        console.log("renderStep3");
        console.log("editorDataPrepared");
        console.log(editorDataPrepared);
        return (
            // <React.Fragment>
            <article className="step">
                    {/* <div className="step__bage">3</div> */}
                    <span className="step__header">Определите количество подгрупп для МУПов и выберите преподавателей</span>
                {/* </article> */}

                <SubgroupSelection
                    selectionGroupIds={selectionGroupsIds}
                    dataIsPrepared={editorDataPrepared}
                    onApply={handleSubgroupSelectionApply}
                    onUnauthorized={props.onUnauthorized}
                />
                <ul>
                    {subgroupSelectionActions.map((a: ITSAction, index: number) => <li key={index}>{a.getMessage()}</li>)}
                </ul>
                <button className="step__button" onClick={handleSubgroupSelectionApplyReal}>Настоящее применение</button>
                <ul>
                    {subgroupSelectionActionsResults.map((ar: IActionResponse, index: number) =>
                        <li key={index} className={ar.success ? "message_success" : "message_error"}>{ar.message}</li>
                    )}
                </ul>
            </article>
        );
    }
    
    return (
        <section className="page">
            <h2 className="action_header">Подготовка семестра</h2>
            <article className="step">
                {/* <article className="step"> */}
                    <span className="step__header">1. Выберите группы выбора: для 3-го и 4-го курсов</span>
                {/* </article> */}

                <GroupSelect
                    selectionGroupsList={selectionGroupsListItems}
                    onRefresh={refreshSelectionGroups}
                    onSelectionValid={handleSelectionGroupValid}
                />

                <div className={style.next_step__container}>
                    <Button onClick={handleGroupSelectButton}
                        variant="contained" style={{marginRight: '1em'}}
                        endIcon={<SystemUpdateAltIcon />}
                        >К следующему шагу</Button>
                    <p className={style.next_step__message}>
                        {selectionGroupsIds.length !== 2 ? "Выберите две группы для перехода к следующему шагу" : null}
                    </p>
                </div>
                
            </article>

            {selectionGroupsIds.length === 2 ? renderStep2() : null}

            {selectionGroupsIds.length === 2 && editorDataPrepared ? renderStep3() : null}
            
        </section>
    );
}