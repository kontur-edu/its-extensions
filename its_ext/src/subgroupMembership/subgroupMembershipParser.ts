import {
  MupToLoadToSubgroupMembership,
  ISubgoupDiffInfo,
  ISubgroupMeta,
  IStudentData,
  IMupData,
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

export function validateSubgroupMembership(
  competitionGroupIds: number[],
  mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
  subgoupDiffInfo: ISubgoupDiffInfo,
  studentData: IStudentData,
  mupData: IMupData
): { success: boolean; messages: string[] } {
  const notDeterminedPersonalNumbers = new Set<string>();
  const notDeterminedMupNames: string[] = [];
  const notDeterminedLoadsForMups: { [key: string]: string[] } = {};
  const wrongSubgroupCountForLoadsPerMup: { [key: string]: string[] } = {};
  const subgroupCountsDifferentForMups = new Set<string>();

  const mupShortNameToFullName = createMupShortNameToFullName(mupData);

  for (const mupShortName in mupToLoadToSubgroupMembership) {
    let mupName = mupShortName;

    if (mupShortNameToFullName.hasOwnProperty(mupShortName)) {
      mupName = mupShortNameToFullName[mupShortName];
    }

    if (!subgoupDiffInfo.metaDiffs.hasOwnProperty(mupName)) {
      notDeterminedMupNames.push(mupName);
      continue;
    }
    const competitionGroupToLoadToMetas = subgoupDiffInfo.metaDiffs[mupName];

    let loadToMetas: { [key: string]: ISubgroupMeta } = {};
    // TODO: check if it works
    for (const cgId of competitionGroupIds) {
      loadToMetas = { ...loadToMetas, ...competitionGroupToLoadToMetas[cgId] };
    }
    const loadToGroupPersonalNumbers = mupToLoadToSubgroupMembership[mupName];
    for (const load in loadToGroupPersonalNumbers) {
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
      if (!loadToMetas.hasOwnProperty(load)) {
        if (!notDeterminedLoadsForMups.hasOwnProperty(mupName)) {
          notDeterminedLoadsForMups[mupName] = [];
        }
        notDeterminedLoadsForMups[mupName].push(load);
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

// export function checkCompetitionGroupsHaveSameSubgroups(
//   competitionGroupIds: number[],
//   subgoupDiffInfo: ISubgoupDiffInfo
// ) {
//   const allLoad_number = new Set<string>();
//   for (const mupName in subgoupDiffInfo.subgroupDiffs) {
//     const cgIdToSubgroups = subgoupDiffInfo.subgroupDiffs[mupName];
//     for (const competitionGroupId of competitionGroupIds) {
//       if (cgIdToSubgroups.hasOwnProperty(competitionGroupId)) {
//         for (const load_number in cgIdToSubgroups[competitionGroupId]) {
//           allLoad_number.add()
//         }
//       }
//     }
//   }
// }
