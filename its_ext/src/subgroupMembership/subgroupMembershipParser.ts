import {
  MupToLoadToSubgroupMembership,
  ISubgoupDiffInfo,
  ISubgroupMeta,
  IStudentData,
  IMupData,
  SubgroupDiffs,
  IStudentSubgroupMembership,
} from "../common/types";

// {
// 	"Моделирование динамических процессов: дифференциальные уравнения, анализ и приложения": {
// 		"практические занятия": [
// 			["123123"]
// 		]
// 	}
// }

export function parseSubgroupMembershipFromText(
  text: string
): MupToLoadToSubgroupMembership | null {
  let obj = null;
  try {
    obj = JSON.parse(text);
  } catch (err) {
    return null;
  }
  for (const mupName in obj) {
    for (const load in obj[mupName]) {
      if (!Array.isArray(obj[mupName][load])) {
        return null;
      }
      for (const pns of obj[mupName][load]) {
        if (!Array.isArray(pns)) {
          return null;
        }
      }
    }
  }
  return obj;
}

function checkSubgroupMetaCountsAreSame(
  mupName: string,
  load: string,
  competitionGroupIds: number[],
  subgoupDiffInfo: ISubgoupDiffInfo
) {
  const competitionGroupToLoadToMetas = subgoupDiffInfo.metaDiffs[mupName];
  let groupCount: number | null = null;
  for (const cgId of competitionGroupIds) {
    if (
      !competitionGroupToLoadToMetas.hasOwnProperty(cgId) ||
      !competitionGroupToLoadToMetas[cgId].hasOwnProperty(load)
    ) {
      return true;
    }

    const meta = competitionGroupToLoadToMetas[cgId][load];
    if (groupCount === null) {
      groupCount = meta.count;
    } else if (groupCount !== meta.count) {
      return false;
    }
  }
  return true;
}

function createMupShortNameToFullName(mupData: IMupData) {
  const mupShortNameToFullName: { [key: string]: string } = {};
  for (const mupId in mupData.data) {
    const mup = mupData.data[mupId];
    mupShortNameToFullName[mup.shortName] = mup.name;
  }
  return mupShortNameToFullName;
}

export function trySubstituteMupShortNamesWithFullNames(
  mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
  mupData: IMupData
) {
  const mupShortNameToFullName = createMupShortNameToFullName(mupData);

  const newMupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership = {};

  for (const mupShortName in mupToLoadToSubgroupMembership) {
    let mupName = mupShortName;
    if (mupShortNameToFullName.hasOwnProperty(mupShortName)) {
      mupName = mupShortNameToFullName[mupShortName];
    }

    newMupToLoadToSubgroupMembership[mupName] =
      mupToLoadToSubgroupMembership[mupShortName];
  }

  return newMupToLoadToSubgroupMembership;
}

export function getLoadsForMup(
  mupName: string,
  competitionGroupIds: number[],
  subgoupDiffInfo: ISubgoupDiffInfo
) {
  const competitionGroupToLoadToMetas = subgoupDiffInfo.metaDiffs[mupName];
  const loads = new Set<string>();
  for (const cgId of competitionGroupIds) {
    if (!competitionGroupToLoadToMetas.hasOwnProperty(cgId)) {
      continue;
    }
    for (const load in competitionGroupToLoadToMetas[cgId]) {
      if (competitionGroupToLoadToMetas[cgId][load].count) {
        loads.add(load);
      }
    }
  }
  return Array.from(loads);
}

export function trySubstituteLoadWildcards(
  mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
  competitionGroupIds: number[],
  subgoupDiffInfo: ISubgoupDiffInfo
) {
  const newMupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership = {};

  for (const mupName in mupToLoadToSubgroupMembership) {
    if (!subgoupDiffInfo.metaDiffs.hasOwnProperty(mupName)) {
      newMupToLoadToSubgroupMembership[mupName] =
        mupToLoadToSubgroupMembership[mupName];
      continue;
    }

    const newLoadToSubgroups: { [key: string]: string[][] } = {};

    const loadToSubgroups = mupToLoadToSubgroupMembership[mupName];
    const wildcard = "*";
    const haveWildCard = Object.keys(loadToSubgroups).some(
      (load) => load === wildcard
    );
    if (haveWildCard) {
      const loads = getLoadsForMup(
        mupName,
        competitionGroupIds,
        subgoupDiffInfo
      );
      for (const load of loads) {
        newLoadToSubgroups[load] = loadToSubgroups[wildcard];
      }
    }

    for (const load in loadToSubgroups) {
      if (load === wildcard) {
        continue;
      }
      newLoadToSubgroups[load] = loadToSubgroups[load];
    }

    newMupToLoadToSubgroupMembership[mupName] = newLoadToSubgroups;
  }

  return newMupToLoadToSubgroupMembership;
}

// Возможно сначала заменить короткие имена на полные, потом "*" на нагрузки

export function validateSubgroupMembership(
  competitionGroupIds: number[],
  mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
  subgoupDiffInfo: ISubgoupDiffInfo,
  studentData: IStudentData
  // mupData: IMupData
): { success: boolean; messages: string[] } {
  const notDeterminedPersonalNumbers = new Set<string>();
  const notDeterminedMupNames: string[] = [];
  const notDeterminedLoadsForMups: { [key: string]: string[] } = {};
  const wrongSubgroupCountForLoadsPerMup: { [key: string]: string[] } = {};
  const subgroupCountsDifferentForMups = new Set<string>();

  for (const mupName in mupToLoadToSubgroupMembership) {
    if (!subgoupDiffInfo.metaDiffs.hasOwnProperty(mupName)) {
      notDeterminedMupNames.push(mupName);
      continue;
    }
    const competitionGroupToLoadToMetas = subgoupDiffInfo.metaDiffs[mupName];

    let loadToMetas: { [key: string]: ISubgroupMeta } = {};
    for (const cgId of competitionGroupIds) {
      if (competitionGroupToLoadToMetas.hasOwnProperty(cgId)) {
        loadToMetas = {
          ...loadToMetas,
          ...competitionGroupToLoadToMetas[cgId],
        };
      }
    }
    const loadToGroupPersonalNumbers = mupToLoadToSubgroupMembership[mupName];
    for (const load in loadToGroupPersonalNumbers) {
      if (load !== "*" && !loadToMetas.hasOwnProperty(load)) {
        if (!notDeterminedLoadsForMups.hasOwnProperty(mupName)) {
          notDeterminedLoadsForMups[mupName] = [];
        }
        notDeterminedLoadsForMups[mupName].push(load);
      }

      if (
        !checkSubgroupMetaCountsAreSame(
          mupName,
          load,
          competitionGroupIds,
          subgoupDiffInfo
        )
      ) {
        subgroupCountsDifferentForMups.add(mupName);
      }

      const personalNumbersPerGroup = loadToGroupPersonalNumbers[load];
      if (loadToMetas.hasOwnProperty(load)) {
        if (personalNumbersPerGroup.length !== loadToMetas[load].count) {
          if (!wrongSubgroupCountForLoadsPerMup.hasOwnProperty(mupName)) {
            wrongSubgroupCountForLoadsPerMup[mupName] = [];
          }
          wrongSubgroupCountForLoadsPerMup[mupName].push(load);
        }
      }

      for (const personalNumbers of personalNumbersPerGroup) {
        for (const personalNumber of personalNumbers) {
          if (!studentData.data.hasOwnProperty(personalNumber)) {
            notDeterminedPersonalNumbers.add(personalNumber);
          }
        }
      }
    }
  }

  const messages: string[] = [];
  if (notDeterminedPersonalNumbers.size > 0) {
    const pnStr = Array.from(notDeterminedPersonalNumbers).join(", ");
    messages.push(`Следующие личные номера студентов не распознаны: ${pnStr}`);
  }

  if (notDeterminedMupNames.length > 0) {
    const aStr = notDeterminedMupNames.join(", ");
    messages.push(`Следующие имена МУПов не распознаны: ${aStr}`);
  }

  for (const mupName in notDeterminedLoadsForMups) {
    if (notDeterminedLoadsForMups[mupName].length > 0) {
      const loadsStr = notDeterminedLoadsForMups[mupName].join(", ");
      messages.push(
        `МУП "${mupName}": Следующие нагрузки не распознаны: ${loadsStr}`
      );
    }
  }

  for (const mupName in wrongSubgroupCountForLoadsPerMup) {
    if (wrongSubgroupCountForLoadsPerMup[mupName].length > 0) {
      const loadsStr = wrongSubgroupCountForLoadsPerMup[mupName].join(", ");
      messages.push(
        `МУП "${mupName}": Следующие нагрузки имеют неверное количество подгрупп: ${loadsStr}`
      );
    }
  }

  if (subgroupCountsDifferentForMups.size > 0) {
    const mupNames = Array.from(subgroupCountsDifferentForMups)
      .map((mupName) => `"${mupName}"`)
      .join(", ");
    messages.push(
      `Количество подгрупп отличается в разных конкурсных группах для МУПов: ${mupNames}`
    );
  }

  return { success: messages.length === 0, messages: messages };
}

function prepareMupToLoadToSubgroupMembership(
  competitionGroupIds: number[],
  subgoupDiffInfo: ISubgoupDiffInfo
) {
  const res: MupToLoadToSubgroupMembership = {};
  for (const mupName in subgoupDiffInfo.subgroupDiffs) {
    res[mupName] = {};
    const cgIdToMeta = subgoupDiffInfo.metaDiffs[mupName];
    for (const competitionGroupId of competitionGroupIds) {
      for (const load in cgIdToMeta[competitionGroupId]) {
        const meta = cgIdToMeta[competitionGroupId][load];
        // console.log("meta");
        // console.log(meta);
        if (res[mupName].hasOwnProperty(load)) {
          if (res[mupName][load].length !== meta.count) {
            throw Error(
              `Mup: ${mupName}, load: ${load} have different counts for competition groups ${competitionGroupIds}`
            );
          }
          continue;
        } else {
          res[mupName][load] = [];
        }
        for (let i = 0; i < meta.count; i++) {
          res[mupName][load].push([]);
        }
      }
    }
  }
  return res;
}

// function getIncludedStudentPersonalNumbers() {

// }

export function createMupToLoadToSubgroupMembership(
  competitionGroupIds: number[],
  subgoupDiffInfo: ISubgoupDiffInfo,
  subgroupIdToStudentSubgroupMembership: {
    [key: number]: IStudentSubgroupMembership[];
  },
  studentIdToPersonalNumber: { [key: string]: string } = {}
): MupToLoadToSubgroupMembership {
  const res = prepareMupToLoadToSubgroupMembership(
    competitionGroupIds,
    subgoupDiffInfo
  );
  for (const mupName in subgoupDiffInfo.subgroupDiffs) {
    for (const competitionGroupId of competitionGroupIds) {
      if (
        !subgoupDiffInfo.subgroupDiffs[mupName].hasOwnProperty(
          competitionGroupId
        )
      ) {
        continue;
      }
      const load_numberToSubgroupId =
        subgoupDiffInfo.subgroupDiffs[mupName][competitionGroupId];
      const loadToSubgroups: { [key: string]: number[] } = {};
      for (const load_number in load_numberToSubgroupId) {
        const subgroupId = load_numberToSubgroupId[load_number];
        const loadAndNumber = load_number.split("_");
        if (
          loadAndNumber.length !== 2 ||
          (loadAndNumber.length === 2 && !isFinite(Number(loadAndNumber[1])))
        ) {
          throw Error(
            `createupToLoadToSubgroupMembership: load_number: ${load_number} has incorrectFormat`
          );
        }
        const [load, numberStr] = loadAndNumber;
        if (!loadToSubgroups.hasOwnProperty(load)) {
          loadToSubgroups[load] = [];
        }
        const number = Number(numberStr) - 1;
        const studentIds: string[] = [];
        if (
          subgroupIdToStudentSubgroupMembership.hasOwnProperty(subgroupId) &&
          subgroupIdToStudentSubgroupMembership[subgroupId]
        ) {
          for (const membership of subgroupIdToStudentSubgroupMembership[
            subgroupId
          ]) {
            if (membership && membership.included) {
              const personalNumber =
                studentIdToPersonalNumber[membership.studentId];
              studentIds.push(personalNumber);
            }
          }
        }
        for (const studentId of studentIds) {
          res[mupName][loadAndNumber[0]][number].push(studentId);
        }
      }
    }
  }

  return res;
}
