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
}

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
                                mupName,
                                
                            ));
                        }
                        if (!sSubgroup.teacherId) {
                            actions.push(new UpdateTeacherForSubgroupAction(
                                competitionGroupIds[1], subgroupInfo, teacherId,
                                mupName
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
                        mupName
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
                        mupName
                    ));
                }
            }
        });
    }

    return actions;
}


function findCompetitionGroupsWithMetaAndSubgroupsDifferent(
    competitionGroupIds: number[],
    subgroupAndMetaAreSameDiffs: SubgroupAndMetaAreSameDiffs
): number[] {
    const res: Set<number> = new Set<number>();
    for (const mupName in subgroupAndMetaAreSameDiffs) {
        for (const competitionGroupId of competitionGroupIds) {
            if (!subgroupAndMetaAreSameDiffs[mupName].hasOwnProperty(competitionGroupId)) {
                continue;
            }
            if (!subgroupAndMetaAreSameDiffs[mupName][competitionGroupId]) {
                res.add(competitionGroupId);
            }
        }
    }
    return Array.from(res);
}

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
            const mupName = updateLimitAction.mupName;

            if (!res.hasOwnProperty(mupName)) res[mupName] = [];
            res[mupName].push(action);
        }
    }

    return res;
}