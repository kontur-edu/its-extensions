import React, {useState, useEffect, useContext} from "react";
import { MupsList } from "../../MupsList";
import style from "./MupEditor.module.css";
import { IMupEditorProps } from "./types";
import { IMupEdit, IMupDiff } from "../../../common/types";

import {REQUEST_ERROR_UNAUTHORIZED} from "../../../utils/constants";

import {
    CreateDiffForMup,
    UpdateMupDiffDateInfo,
    UpdateMupEditMessage,
} from "../../../mupUpdater/mupDifference";

import { ITSContext } from "../../../common/Context";

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
const findInitDates = (initDiffs: {[key: string]: IMupDiff}): [string, string] => {
    const dates: [string, string] = ['', ''];
    for (let mupId of Object.keys(initDiffs)) {
        for (let currentPeriod of Object.values(initDiffs[mupId].courseToCurrentPeriod)) {
            if (currentPeriod.selectionBegin) {
                dates[0] = currentPeriod.selectionBegin;
            }
            if (currentPeriod.selectionDeadline) {
                dates[1] = currentPeriod.selectionDeadline;
            }
            if (dates[0] && dates[1]) {
                return dates;
            }
        }
    }
    return dates;
}

export function MupEditor(props: IMupEditorProps) {
    const [mupEdits, setMupEdits] = useState<{[key: string]: IMupEdit}>({});
    const [mupDiffs, setMupDiffs] = useState<{[key: string]: IMupDiff}>({});
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const context = useContext(ITSContext)!;

    const onStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const dateFormatted = event.target.value;
        // const dateFormatted = formatDate(newDate);

        // Update Diff info
        const newMupDiffs = {...mupDiffs};
        const newMupEdits = {...mupEdits};
        for (let mupId in newMupDiffs) {
            UpdateMupDiffDateInfo(newMupDiffs[mupId], [dateFormatted, endDate]);
            UpdateMupEditMessage(newMupEdits[mupId], newMupDiffs[mupId])
        }
        // Object.keys(newMupDiffs).forEach(mupId => UpdateMupDiffDateInfo(newMupDiffs[mupId], [dateFormatted, endDate]));
        setMupDiffs(newMupDiffs);
        setMupEdits(newMupEdits);

        setStartDate(dateFormatted);
        console.log(`new start date: ${dateFormatted}`);
    };

    const onEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const dateFormatted = event.target.value;

        // Update Diff info
        const newMupDiffs = {...mupDiffs};
        const newMupEdits = {...mupEdits};
        for (let mupId in newMupDiffs) {
            UpdateMupDiffDateInfo(newMupDiffs[mupId], [startDate, dateFormatted]);
            UpdateMupEditMessage(newMupEdits[mupId], newMupDiffs[mupId])
        }
        // Object.keys(newMupDiffs).forEach(mupId => UpdateMupDiffDateInfo(newMupDiffs[mupId], [startDate, dateFormatted]));
        setMupDiffs(newMupDiffs);
        setMupEdits(newMupEdits);

        setEndDate(dateFormatted);
        console.log(`new end date: ${dateFormatted}`);
    };

    const setUpInitDiffsAndDates = (selectedMupIdsSet: Set<string>)  => {
        const newMupEdits: {[key: string]: IMupEdit} = {};
        const newMupDiffs: {[key: string]: IMupDiff} = {};
        context.dataRepository.mupData.ids.forEach(mupId => {
            const selected = selectedMupIdsSet.has(mupId);
            let limit = 0;
            let mupDiff: IMupDiff | null = null;
            if (selected) {
                mupDiff = CreateDiffForMup(
                    mupId, props.selectionGroupIds, [startDate, endDate],
                    context.dataRepository.selectionGroupToMupsData,
                    context.dataRepository.selectionGroupData,
                    context.dataRepository.mupToPeriods);
                newMupDiffs[mupId] = mupDiff;
                for (let initLimit of mupDiff.initLimits) {
                    if (initLimit && initLimit > 0) {
                        limit = initLimit;
                    }
                }
            }

            const mupEdit: IMupEdit = {
                selected: selected,
                limit: limit,
                messages: [],
            };

            
            if (mupDiff) {
                console.log("initMupDiff");
                console.log(mupDiff);
                UpdateMupEditMessage(mupEdit, mupDiff);
            }

            newMupEdits[mupId] = mupEdit;
        });

        const initDates = findInitDates(newMupDiffs);
        if (initDates[0] || initDates[1]) {
            for (let mupId in newMupDiffs) {
                UpdateMupDiffDateInfo(newMupDiffs[mupId], initDates);
                UpdateMupEditMessage(newMupEdits[mupId], newMupDiffs[mupId])
            }
        }
        initDates[0] && setStartDate(initDates[0]);
        initDates[1] && setEndDate(initDates[1]);

        setMupDiffs(newMupDiffs);
        setMupEdits(newMupEdits);
    }

    

    useEffect(() => {
        if (!props.dataIsPrepared) return;

        let mupIdUnionArr: string[][] = [];
        for (let sgId of props.selectionGroupIds) {
            mupIdUnionArr.push(context.dataRepository.selectionGroupToMupsData.data[sgId].ids);
        }
        const mupIdUnion = new Set(mupIdUnionArr.flat());
        setUpInitDiffsAndDates(mupIdUnion);

    }, [props.dataIsPrepared, props.selectionGroupIds]);

    const handleMupToggle = (mupId: string) => {
        // update diff
        // if not selected and was not selected, remove diff
        context.dataRepository.EnsurePeriodInfoFor(mupId).then(() => {
            let mupDiffsToCompareWith = mupDiffs;
            if (!mupDiffs.hasOwnProperty(mupId) || !mupDiffs[mupId]) {
                const newInitDiff = CreateDiffForMup(
                    mupId, props.selectionGroupIds, [startDate, endDate],
                    context.dataRepository.selectionGroupToMupsData, context.dataRepository.selectionGroupData,
                    context.dataRepository.mupToPeriods);
                const newMupDiffs = {...mupDiffs, [mupId]: newInitDiff};
                mupDiffsToCompareWith = newMupDiffs;
                console.log("newInitDiff");
                console.log(newInitDiff);
                setMupDiffs(newMupDiffs);
            }
            const newMupEdits = {...mupEdits};
            // if (!mupDiffsToCompareWith[mupId].canBeDeleted) {
            //     newMupEdits[mupId].selected = true;
            // }
            newMupEdits[mupId].selected = !newMupEdits[mupId].selected;
            
            if (!newMupEdits[mupId].selected && mupDiffsToCompareWith[mupId].presentInGroups.length === 0) {
                newMupEdits[mupId].messages = [];
                // return;
            } else {
                UpdateMupEditMessage(newMupEdits[mupId], mupDiffsToCompareWith[mupId]);
            }
            
            setMupEdits(newMupEdits);
        });
    };

    const handleMupLimitChange = (mupId: string, newLimit: number) => {
        if (newLimit !== mupEdits[mupId].limit) {
            const newEdits = {...mupEdits, [mupId]: {...mupEdits[mupId], limit: newLimit}};
            UpdateMupEditMessage(newEdits[mupId], mupDiffs[mupId]);
            setMupEdits(newEdits);
        }
    };

    const handleRefresh = () => {
        let mupIdsToRefresh: string[] = Object.keys(mupDiffs);
        let selectedMupIds: Set<string> = new Set<string>();
        for (let mupId of mupIdsToRefresh) {
            if (mupEdits[mupId].selected || !mupDiffs[mupId].canBeDeleted) {
                selectedMupIds.add(mupId);
            }
        }
        const updateSelectionGroupsThenSubgroupsPromise =
            context.dataRepository.UpdateSelectionGroupData()
            .then(() => {
                const competitionGroupIds: number[] = [];
                props.selectionGroupIds.forEach(sgId => {
                    const cgId = context.dataRepository.selectionGroupData.data[sgId].competitionGroupId;
                    if (cgId !== null && cgId !== undefined) {
                        competitionGroupIds.push(cgId);
                    }
                });
                return context.dataRepository.UpdateSubgroups(competitionGroupIds);
            });
        Promise.all([
            updateSelectionGroupsThenSubgroupsPromise,
            context.dataRepository.UpdateMupData(),
            context.dataRepository.UpdateSelectionGroupToMupsData(props.selectionGroupIds),
            context.dataRepository.UpdatePeriods(mupIdsToRefresh),
        ])
        .then(() => setUpInitDiffsAndDates(selectedMupIds))
        .catch(err => {
            if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
                props.onUnauthorized();
                return;
            }
            throw err;
        });
    };

    const handleApply = () => {
        const selectedMupIds: string[] = [];
        const mupLimits: {[key: string]: number} = {};
        for (let mupId of Object.keys(mupEdits)) {
            if (mupEdits[mupId].selected ||
                    (mupDiffs.hasOwnProperty(mupId) && !mupDiffs[mupId].canBeDeleted)) {
                mupLimits[mupId] = mupEdits[mupId].limit;
                selectedMupIds.push(mupId);
            }
        }
        
        props.onApply(selectedMupIds, mupDiffs, [startDate, endDate], mupLimits);
    }

    return props.selectionGroupIds.length !== 2 ? null : (
        <section className="step__container">
            <article className={style.mups_select}>
                <button className="step__button" onClick={handleRefresh}>Обновить</button>
                <MupsList 
                    mupData={context.dataRepository.mupData}
                    mupEdits={mupEdits}
                    onMupToggle={handleMupToggle}
                    onMupLimitChange={handleMupLimitChange}
                />
                
                <div className={style.mups__period}>
                    <label>С 
                        <input className={style.period__input} type="date"
                            value={startDate} onChange={onStartDateChange}/>
                    </label>
                    <label>по 
                        <input className={style.period__input} type="date"
                            value={endDate} onChange={onEndDateChange}/>
                    </label>
                </div>
                <button className="step__button" onClick={handleApply}>Применить изменения</button>
            </article>
        </section>
    );
}