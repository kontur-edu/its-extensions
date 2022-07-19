
import {
    IMup,
    ISelectionGroupMup,
    ISelectionGroup,
    IMupData,
    ISelectionGroupData,
    ISelectionGroupMupData,
    ISelectionGroupToMupsData,
    // IMupToPeriods,
    ICompetitionGroup,
    ICompetitionGroupData,
} from "../common/types";


export function PrepareSelectionGroupData(selectionGroups: ISelectionGroup[]): ISelectionGroupData {
    const result: ISelectionGroupData = {
        ids: [],
        data: {},
    };
    selectionGroups.forEach(selectionGroup => {
        result.ids.push(selectionGroup.id);
        result.data[selectionGroup.id] = selectionGroup;
    });
    return result;
}


export function PrepareMupData(mups: IMup[]): IMupData {
    const result: IMupData = {
        ids: [],
        data: {},
    };
    mups.forEach(mup => {
        result.ids.push(mup.id);
        result.data[mup.id] = mup;
    });
    return result;
}

export function PrepareCompetitionGroupData(competitionGroups: ICompetitionGroup[]): ICompetitionGroupData {
    const result: ICompetitionGroupData = {
        ids: [],
        data: {},
    };
    competitionGroups.forEach(cg => {
        result.ids.push(cg.id);
        result.data[cg.id] = cg;
    });
    return result;
}

export function PrepareSelectionGroupMupData(selectionGroupMups: ISelectionGroupMup[]): ISelectionGroupMupData {
    const result: ISelectionGroupMupData = {
        ids: [],
        data: {},
    };
    selectionGroupMups.forEach(selectionGroupMup => {
        result.ids.push(selectionGroupMup.mupId);
        result.data[selectionGroupMup.mupId] = selectionGroupMup;
    });
    return result;
}


export function PrepareSelectionGroupToMupsData(
    selectionGroupIdToSelectionGroupMups: {[key: number]: ISelectionGroupMupData}
): ISelectionGroupToMupsData {
    const result: ISelectionGroupToMupsData = {
        ids: [],
        data: {},
    };
    for (let selectionGroupId in selectionGroupIdToSelectionGroupMups) {
        const id = Number(selectionGroupId);
        result.ids.push(id);
        result.data[id] = selectionGroupIdToSelectionGroupMups[selectionGroupId];
    }
    
    return result;
}


export function UnionArrays<T>(arr1: T[], arr2: T[]): T[] {
    const result: T[] = [];
    const unionSet = new Set<T>([...arr1, ...arr2]);
    unionSet.forEach(item => result.push(item));
    return result;
}

export function MupExistsInAnySelectionGroups(mupId: number, selectionGroupIds: number[], selectionGroupToMupsData: ISelectionGroupToMupsData) {
    for (let selectionGroupId of selectionGroupIds) {
        if (selectionGroupToMupsData.data[selectionGroupId].data.hasOwnProperty(mupId)) {
            return true;
        }
    }
    return false;
}



// export function formatDate(date: Date) {
//     let mm = date.getMonth() + 1;
//     let dd = date.getDate();
  
//     return [
//         date.getFullYear(), (mm > 9 ? '' : '0') + mm, (dd > 9 ? '' : '0') + dd
//     ].join('-');
// };

export function formatDate(date: Date) {
    let mm = date.getMonth() + 1;
    let dd = date.getDate();
  
    return [
        date.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd,
    ].join('-');
};

export function reformatItsDate(itsDate: string) {
    if (!itsDate) return "";
    const dateParts = itsDate.split('.');
    if (dateParts.length !== 3) return "";
    const date = new Date([dateParts[1], dateParts[0], dateParts[2]].join(' '));
    let mm = date.getMonth() + 1;
    let dd = date.getDate();
  
    return [
        date.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd,
    ].join('-');
};


// export function formatDateForITS(date: Date) {
//     let mm = date.getMonth() + 1;
//     let dd = date.getDate();
  
//     return [
//         (dd > 9 ? '' : '0') + dd,
//         (mm > 9 ? '' : '0') + mm,
//         date.getFullYear(),
//     ].join('-');
// };

// dd.mm.yyyy
// export function parseDate(dateStr: string) {
//     return new Date(dateStr.split('.').reverse().join(' '));
// }

export function CheckDateIsLess(dateStr: string, timeStamp: number) {
    // return parseDate(dateStr).getTime() < timeStamp;
    if (!dateStr) return false;
    return (new Date(dateStr)).getTime() < timeStamp;
}

// export function CompareDates(dateStr1: string, dateStr2: string) {
//     const d1 = dateStr1.split('.').reverse().join(".");
//     const d2 = dateStr2.split('.').reverse().join(".");
//     if (d1 < d2) return -1;
//     if (d1 > d2) return 1;
//     return 0;
// }



export function CreateDebouncedWrapper(ms: number) {
    let timeoutId: number | null = null;

    return (func: () => any, newMs?: number) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
            func();
            timeoutId = null;
        }, newMs || ms);
    };
}