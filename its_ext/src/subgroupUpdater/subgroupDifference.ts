import {
    ICompetitionGroupToSubgroupMetas,
    ICompetitionGroupToSubgroupIds,
    ISubgroupData,
    MetaDiffs,
    SubgroupDiffs,
    ISubgoupDiffInfo,
    IMupSubgroupDiff,
    ISubgroupMeta,
    SubgroupAndMetaAreSameDiffs,
} from "../common/types"


function checkIfMetasAndSubgroupsAreSameForMupAndSubgroup(
    mupName: string,
    competitionGroupId: number,
    metaDiffs: MetaDiffs,
    subgroupDiffs: SubgroupDiffs,
    subgroupData: ISubgroupData
) {

    // Find If meta have loads with count > 0 for mupName and competitionGroups
    // if have check subgroups have mupName and competition group
    // Check counts of subgroups for each load
    if (!metaDiffs.hasOwnProperty(mupName)) return true;
    const metaDiff = metaDiffs[mupName];
    if (!metaDiff.hasOwnProperty(competitionGroupId)) return true;
    const loadsToMeta = metaDiff[competitionGroupId];
    const loadsToCounts: {[key: string]: number} = {};
    for (let load in loadsToMeta) {
        if (loadsToMeta[load].count > 0) {
            loadsToCounts[load] = loadsToMeta[load].count;
        }
    }
    if (Object.keys(loadsToCounts).length === 0) {
        return true;
    }
    
    if (!subgroupDiffs.hasOwnProperty(mupName) || !subgroupDiffs[mupName].hasOwnProperty(competitionGroupId)) {
        return false;
    }
    const load_numberToSubgroupId = subgroupDiffs[mupName][competitionGroupId];
    const actualLoadsToCounts: {[key: string]: number} = {};
    for (const load_number in load_numberToSubgroupId) {
        const subgroup = subgroupData.data[load_numberToSubgroupId[load_number]];
        if (!actualLoadsToCounts.hasOwnProperty(subgroup.load)) {
            actualLoadsToCounts[subgroup.load] = 0;
        }
        actualLoadsToCounts[subgroup.load]++;
    }

    for (let load in loadsToCounts) {
        if (!actualLoadsToCounts.hasOwnProperty(load)) {
            return false;
        }
        if (loadsToCounts[load] !== actualLoadsToCounts[load]) {
            return false;
        }
    }
    return true;
}


function createSubgroupAndMetaAreSameDiffs(
    metaDiffs: MetaDiffs,
    subgroupDiffs: SubgroupDiffs,
    competitionGroupIds: number[],
    subgroupData: ISubgroupData
): SubgroupAndMetaAreSameDiffs {
    const res: SubgroupAndMetaAreSameDiffs = {};
    const mupNamesUnionSet = new Set<string>([
        ...Object.keys(metaDiffs),
        ...Object.keys(subgroupDiffs)
    ]);
    const mupNamesUnion = Array.from(mupNamesUnionSet);
    for (let mupName of mupNamesUnion) {
        res[mupName] = {};
        for (let competitionGroupId of competitionGroupIds) {
            const same = checkIfMetasAndSubgroupsAreSameForMupAndSubgroup(
                mupName, competitionGroupId,
                metaDiffs, subgroupDiffs,
                subgroupData
                );
            res[mupName][competitionGroupId] = same;
        }
    }

    return res;
}

export function CreateSubgroupDiffInfo(
    competitionGroupIds: number[],
    competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas,
    competitionGroupToSubgroupIds: ICompetitionGroupToSubgroupIds,
    subgroupData: ISubgroupData,
): ISubgoupDiffInfo {
    const metaDiffs: MetaDiffs = {};
    for (let competitionGroupId of competitionGroupIds) {
        const subgroupMetas = competitionGroupToSubgroupMetas[competitionGroupId];
        for (let subgroupMeta of subgroupMetas) {
            if (!metaDiffs.hasOwnProperty(subgroupMeta.discipline)) {
                metaDiffs[subgroupMeta.discipline] = {};
            }
            const cgToMeta = metaDiffs[subgroupMeta.discipline];
            if (!cgToMeta.hasOwnProperty(competitionGroupId)) {
                cgToMeta[competitionGroupId] = {};
            }
            const loadToMetas = cgToMeta[competitionGroupId];
            loadToMetas[subgroupMeta.load] = subgroupMeta;
        }
    }

    const subgroupDiffs: SubgroupDiffs = {};
    for (let competitionGroupId of competitionGroupIds) {
        const subgroupIds = competitionGroupToSubgroupIds[competitionGroupId];
        for (let subgroupId of subgroupIds) {
            const subgroup = subgroupData.data[subgroupId];
            if (!subgroupDiffs.hasOwnProperty(subgroup.mupName)) {
                subgroupDiffs[subgroup.mupName] = {};
            }
            const cgToSubgroupInfo = subgroupDiffs[subgroup.mupName];
            if (!cgToSubgroupInfo.hasOwnProperty(competitionGroupId)) {
                cgToSubgroupInfo[competitionGroupId] = {};
            }
            const subgroupNameToId = cgToSubgroupInfo[competitionGroupId];
            const load_number = `${subgroup.load}_${subgroup.number}`;
            subgroupNameToId[load_number] = subgroup.id;
        }
    }

    const subgroupAndMetaAreSameDiffs = createSubgroupAndMetaAreSameDiffs(
        metaDiffs,
        subgroupDiffs,
        competitionGroupIds,
        subgroupData
    );

    return {
        metaDiffs,
        subgroupDiffs,
        subgroupAndMetaAreSameDiffs,
    };
}


function CreateDiffMessageForMupByMeta(
    metaDiff: {
        [key: number]: {
            [key: string]: ISubgroupMeta
        }
    },
    competitionGroupIds: number[],
    mupSubgroupDiff: IMupSubgroupDiff
) {
    // const mupSubgroupDiff: IMupSubgroupDiff = {
    //     differences: [],
    //     todos: [],
    //     addLoadsManualFor: [],
    //     loadsToGroupsNeeded: {},
    //     createSubgroupsFor: [],
    //     subgroupCount: {},
    //     absentSubgroupsForLoad_number: [[], []],
    // }

    let canCompareLoads = true;
    if (!metaDiff.hasOwnProperty(competitionGroupIds[0])) {
        canCompareLoads = false;
        mupSubgroupDiff.addLoadsManualFor.push(0);
    }

    if (!metaDiff.hasOwnProperty(competitionGroupIds[1])) {
        canCompareLoads = false;
        mupSubgroupDiff.addLoadsManualFor.push(1);
    }
    
    if (canCompareLoads) {
        const first = metaDiff[competitionGroupIds[0]];
        const second = metaDiff[competitionGroupIds[1]];
        
        const loadSet = new Set<string>([
            ...Object.keys(first),
            ...Object.keys(second)
        ]);
        
        loadSet.forEach(load => {
            const fHas = first.hasOwnProperty(load);
            const sHas = second.hasOwnProperty(load);
            mupSubgroupDiff.subgroupCount[load] = [
                fHas ? first[load].count : null,
                sHas ? second[load].count : null
            ];
        });
    }

    // return mupSubgroupDiff;
}


function CreateDiffMessageForMupBySubgroups(
    subgroupDiff: {
        [key: number]: {
            [key: string]: number
        }
    },
    competitionGroupIds: number[],
    subgroupData: ISubgroupData,
    mupSubgroupDiff: IMupSubgroupDiff
) {
    // const mupSubgroupDiff: IMupSubgroupDiff = {
    //     differences: [],
    //     todos: [],
    //     addLoadsManualFor: [],
    //     loadsToGroupsNeeded: {},
    //     createSubgroupsFor: [],
    //     subgroupCount: {},
    //     absentSubgroupsForLoad_number: [[], []],
    //     loadToTeachers: {},
    // }

    let canCompareLoads = true;
    if (!subgroupDiff.hasOwnProperty(competitionGroupIds[0])) {
        canCompareLoads = false;
        mupSubgroupDiff.createSubgroupsFor.push(0);
    }

    if (!subgroupDiff.hasOwnProperty(competitionGroupIds[1])) {
        canCompareLoads = false;
        mupSubgroupDiff.createSubgroupsFor.push(1);
    }

    if (canCompareLoads) {
        const first = subgroupDiff[competitionGroupIds[0]];
        const second = subgroupDiff[competitionGroupIds[1]];
        
        const load_numberSet = new Set<string>([
            ...Object.keys(first),
            ...Object.keys(second)
        ]);
        
        load_numberSet.forEach(load_number => {
            const fHas = first.hasOwnProperty(load_number);
            const sHas = second.hasOwnProperty(load_number);

            let fTeacher: string | null = null;
            let sTeacher: string | null = null;

            if (fHas) {
                const fSubgroup = subgroupData.data[first[load_number]];
                if (fSubgroup.teacherId) {
                    fTeacher = fSubgroup.teacherId;
                }
            }
            if (sHas) {
                const sSubgroup = subgroupData.data[second[load_number]];
                if (sSubgroup.teacherId) {
                    sTeacher = sSubgroup.teacherId;
                }
            }
            mupSubgroupDiff.loadToTeachers[load_number] = [
                fTeacher, sTeacher
            ];

            if (!fHas) {
                mupSubgroupDiff.absentSubgroupsForLoad_number[0].push(
                    load_number);
            } else if (!sHas) {
                mupSubgroupDiff.absentSubgroupsForLoad_number[1].push(
                    load_number);
            }
        });
    }

    // return mupSubgroupDiff;
}


export function CreateDiffMessageForMup(
    mupName: string,
    competitionGroupIds: number[],
    subgroupDiffInfo: ISubgoupDiffInfo,
    subgroupData: ISubgroupData,
): IMupSubgroupDiff {
    const mupSubgroupDiff: IMupSubgroupDiff = {
        differences: [],
        todos: [],
        addLoadsManualFor: [],
        loadsToGroupsNeeded: {},
        createSubgroupsFor: [],
        subgroupCount: {},
        absentSubgroupsForLoad_number: [[], []],
        loadToTeachers: {},
    }
    if (subgroupDiffInfo.metaDiffs.hasOwnProperty(mupName)) {
        const metaDiff = subgroupDiffInfo.metaDiffs[mupName];

        CreateDiffMessageForMupByMeta(
            metaDiff, competitionGroupIds,
            mupSubgroupDiff);
    }

    if (subgroupDiffInfo.subgroupDiffs.hasOwnProperty(mupName)) {
        const subgroupDiff = subgroupDiffInfo.subgroupDiffs[mupName];
        
        CreateDiffMessageForMupBySubgroups(
            subgroupDiff, competitionGroupIds, subgroupData,
            mupSubgroupDiff);
    }

    if (subgroupDiffInfo.subgroupAndMetaAreSameDiffs.hasOwnProperty(mupName)) {
        const subgroupAndMetaDiffs = subgroupDiffInfo.subgroupAndMetaAreSameDiffs[mupName];
        const firstGroupId = competitionGroupIds[0];
        const secondGroupId = competitionGroupIds[1];
        const groupsWithSubgroupAndMetaDiffs: number[] = [];
        if (subgroupAndMetaDiffs.hasOwnProperty(firstGroupId) &&
                !subgroupAndMetaDiffs[firstGroupId]) {
            groupsWithSubgroupAndMetaDiffs.push(1);
        }

        if (subgroupAndMetaDiffs.hasOwnProperty(secondGroupId) &&
                !subgroupAndMetaDiffs[secondGroupId]) {
            groupsWithSubgroupAndMetaDiffs.push(2);
            
        }
        if (groupsWithSubgroupAndMetaDiffs.length > 0) {
            const groupsStr = groupsWithSubgroupAndMetaDiffs.join(', ');
            mupSubgroupDiff.differences.push(`Информация о подгруппах и созданные подгруппы отличаются для Групп: ${groupsStr}`);
        }
    }


    return mupSubgroupDiff;
}


export function CreateDiffMessages(
    mupNames: string[],
    competitionGroupIds: number[],
    subgroupDiffInfo: ISubgoupDiffInfo,
    subgroupData: ISubgroupData,
): {[key: string]: IMupSubgroupDiff} {
    const res: {[key: string]: IMupSubgroupDiff} = {};
    mupNames.forEach(mupName => {
        res[mupName] = CreateDiffMessageForMup(
            mupName,
            competitionGroupIds,
            subgroupDiffInfo,
            subgroupData,
        );
    })
    return res;
}


