import { IStudentData } from "../common/types";

export interface TaskResultNameRecord {
  group: string;
  nameParts: string[];
}

function normalizeStudentNames(text: string): string[][] {
  const result: string[][] = [];
  const studentRecords = text.split(/\r?\n/);
  for (const studentRecord of studentRecords) {
    const studentRecordSpaceSeparated = studentRecord
      .replace(/\s?-\s?/g, "-")
      .replace(/[,;.\s]+/g, " ")
      .toLowerCase()
      .replace(/ё/g, "е")
      .trim();
    const parts = studentRecordSpaceSeparated.split(" ");
    result.push(parts);
  }

  return result;
}

export function getNameRecords(text: string): TaskResultNameRecord[] {
  const result: TaskResultNameRecord[] = [];
  const studentRecordParts = normalizeStudentNames(text);
  for (const studentRecordPart of studentRecordParts) {
    const taskResultNameRecord: TaskResultNameRecord = {
      group: "",
      nameParts: [],
    };
    if (studentRecordPart.length === 0) {
      continue;
    }

    for (const part of studentRecordPart) {
      if (!/^[^-0-9_]+$/.test(part)) {
        taskResultNameRecord.group = part;
      } else {
        taskResultNameRecord.nameParts.push(part);
      }
    }

    result.push(taskResultNameRecord);
  }

  return result;
}

// Составить Фамилия -> personalNumber[]
// Если несколько проверить вхождение остальных частей
// Если нет проверить вхождение остальных частей
// имя -> personalNumber[]
// interface IHaveName {
//     surname: string;
//     firstname: string;
//     patronymic: string;
// }

export function getSurnameToKeys(
  personalNumbers: string[],
  studentData: IStudentData
): { [key: string]: string[] } {
  const res: { [key: string]: string[] } = {};
  for (const personalNumber of personalNumbers) {
    const student = studentData.data[personalNumber];
    const surnameLower = student.surname.toLowerCase();
    if (!res.hasOwnProperty(surnameLower)) {
      res[surnameLower] = [];
    }
    res[surnameLower].push(personalNumber);
  }
  return res;
}

function getSurnameIdx(
  nameParts: string[],
  surnameToPersonalNumbers: { [key: string]: string[] }
): number {
  for (let i = 0; i < nameParts.length; i++) {
    if (surnameToPersonalNumbers.hasOwnProperty(nameParts[i])) {
      return i;
    }
  }

  return -1;
}

function tryFindByNameParts(
  nameRecord: TaskResultNameRecord,
  personalNumbers: string[],
  studentData: IStudentData
): string[] {
  const res: string[] = [];
  for (const personalNumber of personalNumbers) {
    const testStudent = studentData.data[personalNumber];
    if (
      nameRecord.group &&
      nameRecord.group.toLowerCase() !== testStudent.groupName.toLowerCase()
    ) {
      // console.log(
      //   `${nameRecord.group.toLowerCase()} !== ${testStudent.groupName.toLowerCase()}`
      // );
      continue;
    }
    const fname = testStudent.firstname.toLowerCase().replace("ё", "e");
    const sname = testStudent.surname.toLowerCase().replace("ё", "e");
    const pname = testStudent.patronymic.toLowerCase().replace("ё", "e");
    const partsFound = nameRecord.nameParts.every(
      (np) => np === fname || np === sname || np === pname
    );
    if (partsFound) {
      res.push(personalNumber);
    }
  }
  return res;
}

export function findPersonalNumber(
  nameRecord: TaskResultNameRecord,
  surnameToPersonalNumbers: { [key: string]: string[] },
  personalNumbers: string[],
  studentData: IStudentData
): string | null {
  const surnameIdx = getSurnameIdx(
    nameRecord.nameParts,
    surnameToPersonalNumbers
  );
  if (surnameIdx >= 0) {
    const surname = nameRecord.nameParts[surnameIdx];
    const personalNumbers = surnameToPersonalNumbers[surname];
    if (personalNumbers.length === 1) {
      return personalNumbers[0];
    }
    const res = tryFindByNameParts(nameRecord, personalNumbers, studentData);
    if (res.length === 1) {
      return res[0];
    } else {
      return null;
    }
  }

  const res = tryFindByNameParts(nameRecord, personalNumbers, studentData);
  if (res.length === 1) {
    return res[0];
  }
  return null;
}
