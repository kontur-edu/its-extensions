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
    competitionGroupIds: number[]
) {
    const mupSubgroupDiff: IMupSubgroupDiff = {
        differences: [],
        todos: []
    }

    let canCompareLoads = true;
    if (!metaDiff.hasOwnProperty(competitionGroupIds[0])) {
        canCompareLoads = false;
        mupSubgroupDiff.differences.push(`Группа 1 не содержит нагрузок`);
        mupSubgroupDiff.todos.push(`Добавить нагрузки в Период для Группу 1`);
    }

    if (!metaDiff.hasOwnProperty(competitionGroupIds[1])) {
        canCompareLoads = false;
        mupSubgroupDiff.differences.push(`Группа 2 не содержит нагрузок`);
        mupSubgroupDiff.todos.push(`Добавить нагрузки в Период для Группу 2`);
    }
    
    if (canCompareLoads) {
        const first = metaDiff[competitionGroupIds[0]];
        const second = metaDiff[competitionGroupIds[1]];
        
        const loadSet = new Set<string>([
            ...Object.keys(first),
            ...Object.keys(second)
        ]);
        
        let loadsAreSame = true;
        
        loadSet.forEach(load => {
            const fHas = first.hasOwnProperty(load);
            const sHas = second.hasOwnProperty(load);
            loadsAreSame &&= fHas && sHas;
            if (fHas && sHas) {
                const fCount = first[load].count; 
                const sCount = second[load].count; 
                if (fCount !== sCount) {
                    mupSubgroupDiff.differences.push(
                        `Нагрузка ${load} имеет различное количество групп (${fCount} <> ${sCount})`
                    );

                    mupSubgroupDiff.todos.push(`Использовать большее число`);
                }
            } else if (!fHas) {
                mupSubgroupDiff.differences.push(
                    `Нагрузка ${load} отсутствует в Группе 1`
                );
            } else if (!sHas) {
                mupSubgroupDiff.differences.push(
                    `Нагрузка ${load} отсутствует в Группе 2`
                );
            }
        });

        if (!loadsAreSame) {
            mupSubgroupDiff.todos.push(
                `Проверить нагрузки Периодов (шаг 2 или вручную)`
            );
        }
    }

    return mupSubgroupDiff;
}


function CreateDiffMessageForMupBySubgroups(
    subgroupDiff: {
        [key: number]: {
            [key: string]: number
        }
    },
    competitionGroupIds: number[],
    subgroupData: ISubgroupData
) {
    const mupSubgroupDiff: IMupSubgroupDiff = {
        differences: [],
        todos: []
    }

    let canCompareLoads = true;
    if (!subgroupDiff.hasOwnProperty(competitionGroupIds[0])) {
        canCompareLoads = false;
        mupSubgroupDiff.differences.push(`Группа 1 не содержит созданных подгрупп`);
        mupSubgroupDiff.todos.push(`Создать подгруппы для Группы 1`);
    }

    if (!subgroupDiff.hasOwnProperty(competitionGroupIds[1])) {
        canCompareLoads = false;
        mupSubgroupDiff.differences.push(`Группа 2 не содержит созданных подгрупп`);
        mupSubgroupDiff.todos.push(`Создать подгруппы для Группы 2`);
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
            if (fHas && sHas) {
                const fSubgroup = subgroupData.data[first[load_number]];
                const sSubgroup = subgroupData.data[second[load_number]];
                const fHasNoTeacher = fSubgroup.teacherId === null || fSubgroup.teacherId === '';
                const sHasNoTeacher = sSubgroup.teacherId === null || sSubgroup.teacherId === '';

                if (fHasNoTeacher) {
                    mupSubgroupDiff.differences.push(
                        `Группа 1 не имеет преподавателя для подгруппы ${load_number}`
                    );
                }
                if (sHasNoTeacher) {
                    mupSubgroupDiff.differences.push(
                        `Группа 2 не имеет преподавателя для подгруппы ${load_number}`
                    );
                }
                if (fHasNoTeacher !== sHasNoTeacher) {
                    mupSubgroupDiff.todos.push(
                        `Скопировать преподавателя из заполненной подгруппы ${load_number}`
                    );
                } else if (fHasNoTeacher && sHasNoTeacher) {
                    mupSubgroupDiff.todos.push(
                        `Вручную указать преподавателя для одной из подгрупп ${load_number}`
                    );
                }
            } else if (!fHas) {
                mupSubgroupDiff.differences.push(
                    `Группе 1 не имеет подгруппы ${load_number}`
                );
            } else if (!sHas) {
                mupSubgroupDiff.differences.push(
                    `Группе 2 не имеет подгруппы ${load_number}`
                );
            }
        });
    }

    return mupSubgroupDiff;
}


export function CreateDiffMessageForMup(
    mupName: string,
    competitionGroupIds: number[],
    subgroupDiffInfo: ISubgoupDiffInfo,
    subgroupData: ISubgroupData,
): IMupSubgroupDiff {
    const mupSubgroupDiff: IMupSubgroupDiff = {
        differences: [],
        todos: []
    }
    if (subgroupDiffInfo.metaDiffs.hasOwnProperty(mupName)) {
        const metaDiff = subgroupDiffInfo.metaDiffs[mupName];

        const mupSubgroupDiffByMeta = CreateDiffMessageForMupByMeta(metaDiff, competitionGroupIds);
        mupSubgroupDiff.differences.push(...mupSubgroupDiffByMeta.differences);
        mupSubgroupDiff.todos.push(...mupSubgroupDiffByMeta.todos);
    }

    if (subgroupDiffInfo.subgroupDiffs.hasOwnProperty(mupName)) {
        const subgroupDiff = subgroupDiffInfo.subgroupDiffs[mupName];
        
        const mupSubgroupDiffBySubgroup = CreateDiffMessageForMupBySubgroups(
            subgroupDiff, competitionGroupIds, subgroupData);
        mupSubgroupDiff.differences.push(...mupSubgroupDiffBySubgroup.differences);
        mupSubgroupDiff.todos.push(...mupSubgroupDiffBySubgroup.todos);
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
            mupSubgroupDiff.todos.push(`Применить изменения, чтобы создать подгруппы по указанной информации о подгруппах`);
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

