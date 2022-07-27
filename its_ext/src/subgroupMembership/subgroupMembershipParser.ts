import {
  MupToLoadToSubgroupMembership,
  ISubgoupDiffInfo,
  ISubgroupMeta,
  IStudentData,
} from "../common/types";

// {
// 	"Моделирование динамических процессов: дифференциальные уравнения, анализ и приложения": {
// 		"практические занятия": [
// 			["56904306"]
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

export function validateSubgroupMembership(
  mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
  subgoupDiffInfo: ISubgoupDiffInfo,
  studentData: IStudentData
): { success: boolean; messages: string[] } {
  const notDeterminedPersonalNumbers = new Set<string>();
  const notDeterminedMupNames: string[] = [];
  const notDeterminedLoadsForMups: { [key: string]: string[] } = {};
  const wrongSubgroupCountForLoadsPerMup: { [key: string]: string[] } = {};

  for (const mupName in mupToLoadToSubgroupMembership) {
    if (!subgoupDiffInfo.metaDiffs.hasOwnProperty(mupName)) {
      notDeterminedMupNames.push(mupName);
      continue;
    }
    const competitionGroupToLoadToMetas = subgoupDiffInfo.metaDiffs[mupName];

    let loadToMetas: { [key: string]: ISubgroupMeta } = {};
    // TODO: check if it works
    for (const cgId in competitionGroupToLoadToMetas) {
      loadToMetas = { ...loadToMetas, ...competitionGroupToLoadToMetas[cgId] };
    }
    const loadToGroupPersonalNumbers = mupToLoadToSubgroupMembership[mupName];
    for (const load in loadToGroupPersonalNumbers) {
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
        `МУП ${mupName}: Следующие нагрузки не распознаны: ${loadsStr}`
      );
    }
  }

  for (const mupName in wrongSubgroupCountForLoadsPerMup) {
    if (wrongSubgroupCountForLoadsPerMup[mupName].length > 0) {
      const loadsStr = wrongSubgroupCountForLoadsPerMup[mupName].join(", ");
      messages.push(
        `МУП ${mupName}: Следующие нагрузки имеют неверное количество подгрупп: ${loadsStr}`
      );
    }
  }

  return { success: messages.length === 0, messages: messages };
}
