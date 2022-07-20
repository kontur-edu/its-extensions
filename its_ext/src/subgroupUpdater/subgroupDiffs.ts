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
    ISubgroupInfo,
} from "../common/types"

import {ITSAction} from '../common/actions';

import {
    CreateSubgroupsAction,
    RefreshSubgroupsAction,
    UpdateSubgroupMetaLoadCountAction,
    UpdateTeacherForSubgroupAction,
} from "./actions";


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
        const same1 = checkIfMetasAndSubgroupsAreSameForMupAndSubgroup(
            mupName, competitionGroupIds[0],
            metaDiffs, subgroupDiffs,
            subgroupData
        );
        const same2 = checkIfMetasAndSubgroupsAreSameForMupAndSubgroup(
            mupName, competitionGroupIds[1],
            metaDiffs, subgroupDiffs,
            subgroupData
        );
        res[mupName] = [same1, same2];
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
    if (metaDiff.hasOwnProperty(competitionGroupIds[0]) &&
            metaDiff.hasOwnProperty(competitionGroupIds[1])) {
        const first = metaDiff[competitionGroupIds[0]];
        const second = metaDiff[competitionGroupIds[1]];
        
        const loadSet = new Set<string>([
            ...Object.keys(first),
            ...Object.keys(second)
        ]);
        
        loadSet.forEach(load => {
            const fHas = first.hasOwnProperty(load);
            const sHas = second.hasOwnProperty(load);
            mupSubgroupDiff.loadsToMetas[load] = [
                fHas ? first[load] : null,
                sHas ? second[load] : null
            ];
        });
    }
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
    if (subgroupDiff.hasOwnProperty(competitionGroupIds[0]) &&
            subgroupDiff.hasOwnProperty(competitionGroupIds[1])) {
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
        });
    }
}

export function CreateDiffMessageForMup(
    mupName: string,
    competitionGroupIds: number[],
    subgroupDiffInfo: ISubgoupDiffInfo,
    subgroupData: ISubgroupData,
): IMupSubgroupDiff {
    const mupSubgroupDiff: IMupSubgroupDiff = {
        loadsToMetas: {},
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

    return mupSubgroupDiff;
}


export function CreateSubgroupDiffs(
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
    });
    return res;
}

export function CreateMupToDifferenceMessages(
    mupNames: string[],
    sDiffs: {[key: string]: IMupSubgroupDiff},
    competitionGroupIds: number[],
    subgroupDiffInfo: ISubgoupDiffInfo,
): {[key: string]: string[]} {
    const res: {[key: string]: string[]} = {};
    mupNames.forEach(mupName => {
        if (!sDiffs.hasOwnProperty(mupName)) {
            throw new Error(`${mupName} has no corresponding SubgroupDiff`);
        }
        res[mupName] = CreateDifferenceMessagesForMup(
            mupName,
            sDiffs[mupName],
            competitionGroupIds,
            subgroupDiffInfo,
        );
    });
    return res;
}

export function CreateDifferenceMessagesForMup(
    mupName: string,
    sDiff: IMupSubgroupDiff,
    competitionGroupIds: number[],
    subgroupDiffInfo: ISubgoupDiffInfo,
): string[] {
    const messages: string[] = [];
    messages.push(...CreateDifferenceMessagesForSubgroupDiff(
        sDiff
    ));
    if (subgroupDiffInfo.subgroupAndMetaAreSameDiffs.hasOwnProperty(mupName)) {
        const [same1, same2] = subgroupDiffInfo.subgroupAndMetaAreSameDiffs[mupName];
        if (!same1) {
            messages.push(`Группа 1 имеет количество или состав созданных подгрупп отличный от настройкам подгрупп`);
        }
        if (!same2) {
            messages.push(`Группа 2 имеет количество или состав созданных подгрупп отличный от настройкам подгрупп`);
        }
    }

    if (subgroupDiffInfo.metaDiffs.hasOwnProperty(mupName)) {
        const metaDiff = subgroupDiffInfo.metaDiffs[mupName]; 
        if (!metaDiff.hasOwnProperty(competitionGroupIds[0])) {
            messages.push(`Группа 1 не содержит нагрузок`);
        }
        if (!metaDiff.hasOwnProperty(competitionGroupIds[1])) {
            messages.push(`Группа 2 не содержит нагрузок`);
        }
    }

    if (subgroupDiffInfo.subgroupDiffs.hasOwnProperty(mupName)) {
        const subgroupDiff = subgroupDiffInfo.subgroupDiffs[mupName];
        if (!subgroupDiff.hasOwnProperty(competitionGroupIds[0])) {
            messages.push(`Группа 1 не содержит созданных подгрупп`);
        }
        if (!subgroupDiff.hasOwnProperty(competitionGroupIds[1])) {
            messages.push(`Группа 2 не содержит созданных подгрупп`);
        }
    }

    return messages;
}


export function CreateDifferenceMessagesForSubgroupDiff(
    sDiff: IMupSubgroupDiff,
): string[] {
    const messages: string[] = [];

    const absentLoads: [string[], string[]] = [[], []];
    for (const load in sDiff.loadsToMetas) {
        const [sm1, sm2] = sDiff.loadsToMetas[load];
        if (sm1 === null) {
            absentLoads[0].push(load);
        }
        if (sm2 === null) {
            absentLoads[1].push(load);
        }
        if (sm1 && sm2) {
            if (sm1.count !== sm2.count) {
                messages.push(`Количество групп для нагрузки: ${load} отличается (${sm1.count} != ${sm2.count})`);
            }
        }
    }
    if (absentLoads[0].length > 0) {
        const loadsStr = absentLoads[0].join(', ');
        messages.push(`Группа 1 не содержит нагрузки: ${loadsStr}`);
    }
    if (absentLoads[1].length > 0) {
        const loadsStr = absentLoads[1].join(', ');
        messages.push(`Группа 2 не содержит нагрузки: ${loadsStr}`);
    }

    const load_numberWithAbsentTeachers: [string[], string[]] = [[], []];
    for (const load_number in sDiff.loadToTeachers) {
        const [t1, t2] = sDiff.loadToTeachers[load_number];
        if (!t1) load_numberWithAbsentTeachers[0].push(load_number);
        if (!t2) load_numberWithAbsentTeachers[1].push(load_number);
    }
    if (load_numberWithAbsentTeachers[0].length > 0) {
        const loadsStr = load_numberWithAbsentTeachers[0].join(', ');
        messages.push(`Группа 1 не имеет преподавателя для нагрузок: ${loadsStr}`);
    }

    if (load_numberWithAbsentTeachers[1].length > 0) {
        const loadsStr = load_numberWithAbsentTeachers[1].join(', ');
        messages.push(`Группа 2 не имеет преподавателя для нагрузок: ${loadsStr}`);
    }

    return messages;
}


export function CreateTodoMessages(
    sDiff: IMupSubgroupDiff,
    actions: ITSAction[]
): string[] {
    const messages = actions.map(a => a.getMessageSimple());
    if (Object.keys(sDiff.loadToTeachers).length === 0) {
        messages.push(`Примените изменения, чтобы создать подгруппы`);
    }

    if (Object.keys(sDiff.loadsToMetas).length === 0) {
        messages.push(`Проверьте предыдущий шаг или Вручную заполните наргузки`);
    }
    return messages;
}