import { IITSContext } from "../common/Context";
import { ITSAction, ActionType } from "../common/actions";
import {ISubgoupDiffInfo, ISubgroupData, ISubgroupInfo, SubgroupAndMetaAreSameDiffs} from "../common/types";
import {IActionResponse} from "../utils/ITSApiService";
import {
    CreateSubgroupsAction,
    RefreshSubgroupsAction,
    UpdateSubgroupMetaLoadCountAction,
    UpdateTeacherForSubgroupAction,
} from "./actions";
import {IMupSubgroupDiff} from '../common/types';


/*
function generateUpdateSubgroupMetaLoadCountActions(
    competitionGroupIds: number[],
    subgroupInfo: ISubgoupDiffInfo,
) {
    const actions: ITSAction[] = [];

    const mupNames = Object.keys(subgroupInfo.metaDiffs);
    for (let mupName of mupNames) {
        const metaDiff = subgroupInfo.metaDiffs[mupName];
        if (!metaDiff.hasOwnProperty(competitionGroupIds[0])
                || !metaDiff.hasOwnProperty(competitionGroupIds[1])) {
            continue;
        }

        const first = metaDiff[competitionGroupIds[0]];
        const second = metaDiff[competitionGroupIds[1]];
        const loadSet = new Set<string>([
            ...Object.keys(first),
            ...Object.keys(second)
        ]);
        loadSet.forEach(load => {
            const fHas = first.hasOwnProperty(load);
            const sHas = second.hasOwnProperty(load);

            if (fHas && sHas) {
                const fCount = first[load].count; 
                const sCount = second[load].count; 
                if (fCount !== sCount) {
                    const maxCount = Math.max(fCount, sCount);
                    if (fCount !== maxCount) {
                        actions.push(new UpdateSubgroupMetaLoadCountAction(
                            first[load].id, maxCount, mupName
                        ));
                    } else if (sCount !== maxCount) {
                        actions.push(new UpdateSubgroupMetaLoadCountAction(
                            second[load].id, maxCount, mupName
                        ));
                    }
                }
            }
        });
    }

    return actions;
}*/

function generateCreateSubgroupsActions(
    competitionGroupIds: number[],
) {
    const actions: ITSAction[] = [];

    for (let competitionGroupId of competitionGroupIds) {
        actions.push(new CreateSubgroupsAction(competitionGroupId));
    }

    return actions;
}

function generateRefrshSubgroupsActions(
    competitionGroupIds: number[],
) {
    return [new RefreshSubgroupsAction(competitionGroupIds)];
}

/*
function generateUpdateTeacherForSubgroupActions(
    competitionGroupIds: number[],
    subgroupInfo: ISubgoupDiffInfo,
    subgroupData: ISubgroupData,
) {
    const actions: ITSAction[] = [];

    const mupNames = Object.keys(subgroupInfo.subgroupDiffs);
    for (let mupName of mupNames) {
        const subgroupDiff = subgroupInfo.subgroupDiffs[mupName];
        if (!subgroupDiff.hasOwnProperty(competitionGroupIds[0])
                || !subgroupDiff.hasOwnProperty(competitionGroupIds[1])) {
            continue;
        }

        const first = subgroupDiff[competitionGroupIds[0]];
        const second = subgroupDiff[competitionGroupIds[1]];
        const load_numberSet = new Set<string>([
            ...Object.keys(first),
            ...Object.keys(second)
        ]);
        load_numberSet.forEach(load_number => {
            const fHas = first.hasOwnProperty(load_number);
            const sHas = second.hasOwnProperty(load_number);

            if (fHas && sHas) {
                const fSubgroup = subgroupData.data[first[load_number]];
                const sSubgroup = subgroupData.data[second[load_number]];
                const fHasTeacher = fSubgroup.teacherId !== null && fSubgroup.teacherId !== '';
                const sHasTeacher = sSubgroup.teacherId !== null && sSubgroup.teacherId !== '';
                
                const subgroupInfo: ISubgroupInfo = {
                    mupName: mupName,
                    load: fSubgroup.load,
                    number: fSubgroup.number,
                };
                if (fHasTeacher !== sHasTeacher) {
                    const teacherId = fSubgroup.teacherId || sSubgroup.teacherId;
                    if (teacherId) {
                        if (!fSubgroup.teacherId) {
                            actions.push(new UpdateTeacherForSubgroupAction(
                                competitionGroupIds[0], subgroupInfo, teacherId,
                            ));
                        }
                        if (!sSubgroup.teacherId) {
                            actions.push(new UpdateTeacherForSubgroupAction(
                                competitionGroupIds[1], subgroupInfo, teacherId,
                            ));
                        }
                    }
                }
            } else if (fHas) {
                const fSubgroup = subgroupData.data[first[load_number]];
                const subgroupInfo: ISubgroupInfo = {
                    mupName: mupName,
                    load: fSubgroup.load,
                    number: fSubgroup.number,
                };
                if (fSubgroup.teacherId) {
                    actions.push(new UpdateTeacherForSubgroupAction(
                        competitionGroupIds[1], subgroupInfo, fSubgroup.teacherId,
                    ));
                }
            } else if (sHas) {
                const sSubgroup = subgroupData.data[second[load_number]];
                const subgroupInfo: ISubgroupInfo = {
                    mupName: mupName,
                    load: sSubgroup.load,
                    number: sSubgroup.number,
                };
                if (sSubgroup.teacherId) {
                    actions.push(new UpdateTeacherForSubgroupAction(
                        competitionGroupIds[0], subgroupInfo, sSubgroup.teacherId,
                    ));
                }
            }
        });
    }

    return actions;
}*/


function findCompetitionGroupsWithMetaAndSubgroupsDifferent(
    competitionGroupIds: number[],
    subgroupAndMetaAreSameDiffs: SubgroupAndMetaAreSameDiffs
): number[] {
    console.log("subgroupAndMetaAreSameDiffs");
    console.log(subgroupAndMetaAreSameDiffs);
    console.log("competitionGroupIds");
    console.log(competitionGroupIds);
    const res: Set<number> = new Set<number>();
    for (const mupName in subgroupAndMetaAreSameDiffs) {
        const [s1, s2] = subgroupAndMetaAreSameDiffs[mupName];
        if (!s1) {
            res.add(competitionGroupIds[0]);
        }
        if (!s2) {
            res.add(competitionGroupIds[1]);
        }
        // for (const competitionGroupId of competitionGroupIds) {
        //     if (!subgroupAndMetaAreSameDiffs[mupName].hasOwnProperty(competitionGroupId)) {
        //         continue;
        //         res.add(competitionGroupId);
        //     }
        //     if (!subgroupAndMetaAreSameDiffs[mupName][competitionGroupId]) {
        //         res.add(competitionGroupId);
        //     }
        // }
    }
    return Array.from(res);
}

/*
export function createSubgroupSelectionActions(
    competitionGroupIds: number[],
    subgroupInfo: ISubgoupDiffInfo,
    subgroupData: ISubgroupData
): ITSAction[] {
    const actions: ITSAction[] = [];
    
    if (competitionGroupIds.length !== 2) {
        throw Error(`competitionGroupIds must have length 2, but got ${competitionGroupIds.length}`);
    }

    actions.push(...generateUpdateSubgroupMetaLoadCountActions(
        competitionGroupIds, subgroupInfo
    ));

    const subgroupIdsToCreateSubgroups: number[] = findCompetitionGroupsWithMetaAndSubgroupsDifferent(
        competitionGroupIds, subgroupInfo.subgroupAndMetaAreSameDiffs
    );
    actions.push(...generateCreateSubgroupsActions(
        subgroupIdsToCreateSubgroups
    ));
    if (subgroupIdsToCreateSubgroups.length > 0) {
        actions.push(...generateRefrshSubgroupsActions(
            competitionGroupIds
        ));
    }

    actions.push(...generateUpdateTeacherForSubgroupActions(
        competitionGroupIds, subgroupInfo, subgroupData
    ));


    return actions;
}*/
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------



export function CreateActionsByDiffs(
    competitionGroupIds: number[],
    sDiffs: {[key: string]: IMupSubgroupDiff},
    subgroupInfo: ISubgoupDiffInfo,
    subgroupData: ISubgroupData,
): ITSAction[] {
    const actions: ITSAction[] = [];

    for (const mupName in sDiffs) {
        const sDiff = sDiffs[mupName];

        actions.push(...CreateUpdateSubgroupMetaLoadCountBySubgroupDiff(
            mupName, sDiff
        ));
    }

    const subgroupIdsToCreateSubgroups: number[] = findCompetitionGroupsWithMetaAndSubgroupsDifferent(
        competitionGroupIds, subgroupInfo.subgroupAndMetaAreSameDiffs
    );
    console.log("subgroupIdsToCreateSubgroups");
    console.log(subgroupIdsToCreateSubgroups);
    actions.push(...generateCreateSubgroupsActions(
        subgroupIdsToCreateSubgroups
    ));
    if (subgroupIdsToCreateSubgroups.length > 0) {
        actions.push(...generateRefrshSubgroupsActions(
            competitionGroupIds
        ));
    }

    for (const mupName in sDiffs) {
        const sDiff = sDiffs[mupName];
    
        actions.push(...CreateUpdateTeacherActionsBySubgroupDiff( // TODO: lowercase
            mupName, sDiff, competitionGroupIds,
            // subgroupInfo,
            // subgroupData
        ));
    }

    return actions;
}


export function CreateUpdateSubgroupMetaLoadCountBySubgroupDiff(
    mupName: string,
    sDiff: IMupSubgroupDiff,
): ITSAction[] {
    const actions: ITSAction[] = [];

    const loads = Object.keys(sDiff.loadsToMetas);

    loads.forEach(load => {
        const [sm1, sm2] = sDiff.loadsToMetas[load];

        if (sm1 !== null && sm2 !== null) {
            if (sm1.count !== sm2.count && (!sm1.count || !sm2.count)) {
                const maxCount = Math.max(sm1.count, sm2.count);
                if (sm1.count !== maxCount) { // change c1
                    actions.push(new UpdateSubgroupMetaLoadCountAction(
                        sm1.id, maxCount, mupName
                    ));
                } else if (sm2.count !== maxCount) { // change c2
                    actions.push(new UpdateSubgroupMetaLoadCountAction(
                        sm2.id, maxCount, mupName
                    ));
                }
            }
        }
    });

    return actions;
}


export function CreateUpdateTeacherActionsBySubgroupDiff(
    mupName: string,
    sDiff: IMupSubgroupDiff,
    competitionGroupIds: number[],
    // subgroupInfo: ISubgoupDiffInfo,
    // subgroupData: ISubgroupData,
): ITSAction[] {
    const actions: ITSAction[] = [];
    // if (!subgroupInfo.subgroupDiffs.hasOwnProperty(mupName)) return actions;

    // const subgroupDiff = subgroupInfo.subgroupDiffs[mupName];
    // if (!subgroupDiff.hasOwnProperty(competitionGroupIds[0])
    //         || !subgroupDiff.hasOwnProperty(competitionGroupIds[1])) {
    //     return [];
    // }

    // const firstSubgroup = subgroupDiff[competitionGroupIds[0]];
    for (const load_number in sDiff.loadToTeachers) {
        const [t1, t2] = sDiff.loadToTeachers[load_number];

        const load_number_parts = load_number.split('_');
        const load: string = load_number_parts[0];
        const number: number = Number(load_number_parts[1]);
        if (t1 || t2) {
            // const fSubgroup = subgroupData.data[firstSubgroup[load_number]];
            // const subgroupInfo: ISubgroupInfo = {
            //     mupName: mupName,
            //     load: fSubgroup.load,
            //     number: fSubgroup.number,
            // };
            const subgroupInfo: ISubgroupInfo = {
                mupName: mupName,
                load: load,
                number: number,
            };
            const teacherId = t1 || t2;
            if (teacherId && !t1 && t2) { // t1 not set, copy t2
                actions.push(new UpdateTeacherForSubgroupAction(
                    competitionGroupIds[0], subgroupInfo, teacherId,
                ));
            } else if (teacherId && !t2 && t1) { // t2 not set, t2
                actions.push(new UpdateTeacherForSubgroupAction(
                    competitionGroupIds[1], subgroupInfo, teacherId,
                ));
            }
        }
    }

    return actions;
}




export function GetMupNameActions(actions: ITSAction[]): {[key: string]: ITSAction[]} {
    const res: {[key: string]: ITSAction[]} = {};
    for (const action of actions) {
        if (action.actionType === ActionType.UpdateSubgroupMetaLoadCount) {
            const updateLimitAction = action as UpdateSubgroupMetaLoadCountAction;
            const mupName = updateLimitAction.mupName;

            if (!res.hasOwnProperty(mupName)) res[mupName] = [];
            res[mupName].push(action);
        } else if (action.actionType === ActionType.UpdateTeacherForSubgroup) {
            const updateLimitAction = action as UpdateTeacherForSubgroupAction;
            const mupName = updateLimitAction.subgroupInfo.mupName;

            if (!res.hasOwnProperty(mupName)) res[mupName] = [];
            res[mupName].push(action);
        }
    }

    return res;
}