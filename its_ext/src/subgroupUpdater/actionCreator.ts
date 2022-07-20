import { ITSAction, ActionType } from "../common/actions";
import {ISubgoupDiffInfo, ISubgroupData, ISubgroupInfo, SubgroupAndMetaAreSameDiffs} from "../common/types";
import {
    CreateSubgroupsAction,
    RefreshSubgroupsAction,
    UpdateSubgroupMetaLoadCountAction,
    UpdateTeacherForSubgroupAction,
} from "./actions";
import {IMupSubgroupDiff} from '../common/types';



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
    }
    return Array.from(res);
}


export function createActionsByDiffs(
    competitionGroupIds: number[],
    sDiffs: {[key: string]: IMupSubgroupDiff},
    subgroupInfo: ISubgoupDiffInfo,
    // subgroupData: ISubgroupData,
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




export function getMupNameActions(actions: ITSAction[]): {[key: string]: ITSAction[]} {
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