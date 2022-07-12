import {
    IMupLoad, IMupDiff, IPeriod, IMupEdit,
    ISelectionGroupToMupsData, ISelectionGroupData
} from "../common/types";

import { CheckDateIsLess } from "../utils/helpers";

import {createResultLoads, findLoadsToAdd} from "./actionCreater";



function findInitLimits(
    mupId: string,
    selectionGroupIds: number[],
    selectionGroupToMupsData: ISelectionGroupToMupsData
): (number | null)[] {
    const limits: (number | null)[] = [];
    selectionGroupIds.forEach(sgId => {
        const groupMupsData = selectionGroupToMupsData.data[sgId]; 
        if (groupMupsData.data.hasOwnProperty(mupId)) {
            const limit = groupMupsData.data[mupId].limit;
            limits.push(limit);
        } else {
            limits.push(null);
        }
    });

    return limits;
}

function findCourseToCurrentPeriod(
    year: number, semesterId: number,
    periods: IPeriod[]
): {[key: number]: IPeriod} {
    let courseToCurrentPeriod: {[key: number]: IPeriod} = {};
    for (let period of periods) {
        if (period.year === year &&
                period.semesterId === semesterId) {
            courseToCurrentPeriod[period.course] = period;
        }
    }

    return courseToCurrentPeriod;
}

function CheckIfNeedChangeDates(
    courseToCurrentPeriod: {[key: number]: IPeriod},
    dates: [string, string]
): boolean {
    let changeDates = false;

    for (let course of [3, 4]) {
        if (courseToCurrentPeriod.hasOwnProperty(course) && courseToCurrentPeriod[course]) {
            const currentPeriod = courseToCurrentPeriod[course];

            if (currentPeriod.selectionBegin !== dates[0] ||
                currentPeriod.selectionDeadline !== dates[1]) {

                changeDates = true; 
            }
        }
    }
    return changeDates;

    // if (courseToCurrentPeriod.hasOwnProperty(3) && courseToCurrentPeriod.hasOwnProperty(4)) {
    //     const periodFor3 = courseToCurrentPeriod[3];
    //     const periodFor4 = courseToCurrentPeriod[4];
    //     if (periodFor3.selectionBegin === dates[0] && periodFor3.selectionDeadline === dates[1] &&
    //                 periodFor4.selectionBegin === dates[0] && periodFor4.selectionDeadline === dates[1]) {
    //         return false;
    //     }
    // }
    // return true;
}

function CheckIfCanBeDeleted(
    courseToCurrentPeriod: {[key: number]: IPeriod},
    dates: [string, string]
): boolean {
    let canBeDeleted = true;

    for (let course of [3, 4]) {
        if (courseToCurrentPeriod.hasOwnProperty(course) && courseToCurrentPeriod[course]) {
            const currentPeriod = courseToCurrentPeriod[course];

            if (currentPeriod.selectionBegin &&
                    CheckDateIsLess(currentPeriod.selectionBegin, Date.now())) {
                canBeDeleted = false;
            }
        }
    }
    return canBeDeleted;
}


export function CreateDiffForMup(
    mupId: string,
    selectionGroupIds: number[],
    dates: [string, string],
    selectionGroupToMupsData: ISelectionGroupToMupsData,
    selectionGroupData: ISelectionGroupData,
    mupToPeriods: {[key: string]: IPeriod[]}
): IMupDiff {
    let periods: IPeriod[] = [];
    if (mupToPeriods.hasOwnProperty(mupId)) {
        periods = mupToPeriods[mupId];
    }
    
    const limits = findInitLimits(mupId, selectionGroupIds, selectionGroupToMupsData);
    const presentInGroups: number[] = [];
    for (let i = 0; i < limits.length; i++) {
        if (limits[i] !== null) {
            presentInGroups.push(selectionGroupIds[i]);
        }
    }
    
    let courseToCurrentPeriod: {[key: number]: IPeriod} = {};
    if (selectionGroupIds.length > 0 && 
            selectionGroupData.data.hasOwnProperty(selectionGroupIds[0])) {
        const selectionGroup = selectionGroupData.data[selectionGroupIds[0]];
        courseToCurrentPeriod = findCourseToCurrentPeriod(
            selectionGroup.year, selectionGroup.semesterId, periods
        );
    }

    let loads: IMupLoad[] = [];
    for (let period of periods) {
        if (period.loads.length > 0) {
            loads = period.loads;
            break;
        }
    }
    
    const needToChangeDates = CheckIfNeedChangeDates(courseToCurrentPeriod, dates);

    const canBeDeleted = CheckIfCanBeDeleted(courseToCurrentPeriod, dates);
    
    const mupDiff: IMupDiff = {
        presentInGroups: presentInGroups,
        addLoadsManual: loads.length === 0,
        courseToCurrentPeriod: courseToCurrentPeriod,
        changeDates: needToChangeDates,
        initLimits: limits,
        canBeDeleted: canBeDeleted
    };

    return mupDiff;
}




// export function GetInitDiff(
//     mupId: string, selectionGroupIds: number[], dates: [string, string],
//     selectionGroupToMupsData: ISelectionGroupToMupsData,
//     selectionGroupData: ISelectionGroupData,
//     mupToPeriods: {[key: string]: IPeriod[]}
// ): IMupDiff {
//     const limits: (number | null)[] = [];
//     let presentInGroups: number[] = [];
//     selectionGroupIds.forEach(sgId => {
//         if (selectionGroupToMupsData.data[sgId].data.hasOwnProperty(mupId)) {
//             const limit = selectionGroupToMupsData.data[sgId].data[mupId].limit;
//             limits.push(limit);
//             presentInGroups.push(sgId)
//         } else {
//             limits.push(null);
//         }
//     });

//     const selectionGroup = selectionGroupData.data[selectionGroupIds[0]];
//     const currentYear = selectionGroup.year;
//     const currentSemesterId = selectionGroup.semesterId;

//     let loads: IMupLoad[] | undefined = undefined;
//     let courseToCurrentPeriod: {[key: number]: IPeriod} = {};
//     if (mupToPeriods.hasOwnProperty(mupId)) {
//         for (let period of mupToPeriods[mupId]) {
//             if (!loads && period.loads.length > 0) {
//                 loads = period.loads;
//             }
//             if (period.semesterId === currentSemesterId && period.year === currentYear) {
//                 courseToCurrentPeriod[period.course] = period;
//             }
//         }
//     }

//     let canBeDeleted = true;
//     let changeDates = false;
    
//     for (let course of [3, 4]) {
//         if (courseToCurrentPeriod.hasOwnProperty(course) && courseToCurrentPeriod[course]) {
//             const currentPeriod = courseToCurrentPeriod[course];
//             if (currentPeriod.selectionBegin &&
//                     CheckDateIsLess(currentPeriod.selectionBegin, Date.now())) {
//                 canBeDeleted = false;
//             }

//             if (currentPeriod.selectionBegin !== dates[0] ||
//                 currentPeriod.selectionDeadline !== dates[1]) {

//                 changeDates = true; 
//             }
//         }
//     }

//     const mupDiff: IMupDiff = {
//         presentInGroups: presentInGroups,
//         addLoadsManual: loads !== undefined,
//         courseToCurrentPeriod: courseToCurrentPeriod,
//         changeDates: changeDates,
//         initLimits: limits,
//         canBeDeleted: canBeDeleted,
//     };

//     return mupDiff;
// }

export function UpdateMupDiffDateInfo(mupDiff: IMupDiff, dates: [string, string]) {
    let needToChangeDates = false;
    for (let course of [3, 4]) {
        if (mupDiff.courseToCurrentPeriod.hasOwnProperty(course) &&
            mupDiff.courseToCurrentPeriod[course]) {
            
            const period = mupDiff.courseToCurrentPeriod[course];
            if (period.selectionBegin !== dates[0] ||
                period.selectionDeadline !== dates[1]) {
                
                needToChangeDates = true;
            }
        }
    }
    console.log(needToChangeDates ? "CHANGE DATE" : "NOT CHANGE DATE");
    mupDiff.changeDates = needToChangeDates;
}

export function UpdateMupEditMessage(mupEdit: IMupEdit, mupDiff: IMupDiff) {
    let messageParts: string[] = [];

    if (mupEdit.selected && mupDiff.presentInGroups.length !== 2) {
        messageParts.push("Добавить МУП в группы");
    }

    if (!mupEdit.selected && mupDiff.presentInGroups.length !== 0) {
        if (!mupDiff.canBeDeleted) {
            messageParts.push("Не может быть удален, так как период выбора начался!!!")    
        } else {
            messageParts.push("Удалить МУП из групп");
        }
        mupEdit.messages = messageParts;
        return;
    }

    let needLimitUpdate = false;
    for (let initLimit of mupDiff.initLimits) {
        if (initLimit !== mupEdit.limit) {
            needLimitUpdate = true;
            break;
        }
    }
    if (needLimitUpdate) {
        messageParts.push("Обновить Лимит");
    }

    const havePeriodFor3 = mupDiff.courseToCurrentPeriod.hasOwnProperty(3) && mupDiff.courseToCurrentPeriod[3];
    const havePeriodFor4 = mupDiff.courseToCurrentPeriod.hasOwnProperty(4) && mupDiff.courseToCurrentPeriod[4];
    if (!havePeriodFor3 || !havePeriodFor4) {
        let message = "Создать период для курсов: ";
        if (!havePeriodFor3) message += '3 ';
        if (!havePeriodFor4) message += '4 ';
        messageParts.push(message);
    }

    if (mupDiff.changeDates) {
        messageParts.push("Обновить дату");
    }

    if (mupDiff.addLoadsManual) {
        messageParts.push("(Вручную) создать нагрузки");
    }

    const resulLoads = Object.values(createResultLoads(mupDiff));
    for (let course of [3, 4]) {
        if (mupDiff.courseToCurrentPeriod.hasOwnProperty(course)) {
            const currentPeriod = mupDiff.courseToCurrentPeriod[course];
            const loadsToAdd: IMupLoad[] = findLoadsToAdd(currentPeriod, resulLoads);
            if (loadsToAdd.length > 0) {
                messageParts.push("Скопировать недостающие нагрузки в периоды");
                break;
            }
        }
    }
    // const kmerToLoad: {[key: string]: IMupLoad} = {};
    // for (const load of currentPeriod.loads) {
    //     kmerToLoad[load.kmer] = load;
    // }
    mupEdit.messages = messageParts;
}