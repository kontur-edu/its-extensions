import { IStudentData } from "../common/types";


export interface TaskResultNameRecord {
    group: string;
    nameParts: string[];
}

export function normalizeStudentNames(text: string): string[][] {
    const result: string[][] = [];
    const studentRecords = text.split(/\r?\n/);
    for (const studentRecord of studentRecords) {
        const studentRecordSpaceSeparated = studentRecord
            .replace(/\s?-\s?/g, '-')
            .replace(/[,\s]+/g, ' ')
            .trim()
            .toLowerCase();
        const parts = studentRecordSpaceSeparated.split(' ');
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
            nameParts: []
        };
        if (studentRecordPart.length === 0) {
            continue;
        }

        let nameIndex = 0;
        if (!/^[^-0-9_]+$/.test(studentRecordPart[0])) {
            nameIndex = 1;
            taskResultNameRecord.group = studentRecordPart[0];
        }

        for (let i = nameIndex; i < studentRecordPart.length; i++) {
            taskResultNameRecord.nameParts.push(studentRecordPart[i]);
        }
        result.push(taskResultNameRecord);
    }

    return result;
}


export function getStudentNameToStudentNumbers(
    personalNumberToStudentItem: {[key: string]: {name: string, group: string}}
): {[key: string]: string[]} {
    const res: {[key: string]: string[]} = {};
    for (const personalNumber in personalNumberToStudentItem) {
        const nameLower = personalNumberToStudentItem[personalNumber].name.toLowerCase();
        if (!res.hasOwnProperty(nameLower)) {
            res[nameLower] = [];
        }
        res[nameLower].push(personalNumber);
    }

    return res;
}


// Определить фамилию по окончанию
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
    studentData: IStudentData,
): {[key: string]: string[]} {
    const res: {[key: string]: string[]} = {};
    for (const personalNumber of personalNumbers) {
        console.log("personalNumber");
        console.log(personalNumber);
        const student = studentData.data[personalNumber];
        const surnameLower = student.surname.toLowerCase(); 
        if (!res.hasOwnProperty(surnameLower)) {
            res[surnameLower] = [];
        } 
        res[surnameLower].push(personalNumber);
    }
    return res;
}

export function getSurnameIdx(
    nameParts: string[],
    surnameToPersonalNumbers: {[key: string]: string[]}
): number {
    for (let i = 0; i < nameParts.length; i++) {
        if (surnameToPersonalNumbers.hasOwnProperty(nameParts[i])) {
            return i;
        }
    }

    return -1;
}

export function tryFindByNameParts(
    nameRecord: TaskResultNameRecord,
    personalNumbers: string[],
    studentData: IStudentData,
): string | null {
    for (const personalNumber of personalNumbers) {
        const testStudent = studentData.data[personalNumber];
        if (nameRecord.group && nameRecord.group !== testStudent.groupName.toLowerCase()) {
            continue;
        }
        const partsFound = nameRecord.nameParts.every(
            np => np === testStudent.firstname.toLowerCase() ||
                    np === testStudent.surname.toLowerCase() ||
                    np === testStudent.patronymic.toLowerCase());
        if (partsFound) {
            return personalNumber;
        }
    }
    return null;
}

export function findPersonalNumber(
    nameRecord: TaskResultNameRecord,
    surnameToPersonalNumbers: {[key: string]: string[]},
    personalNumbers: string[],
    studentData: IStudentData,
) : string | null {
    console.log("findPersonalNumber");
    console.log("nameRecord");
    console.log(nameRecord);
    const surnameIdx = getSurnameIdx(nameRecord.nameParts, surnameToPersonalNumbers);
    if (surnameIdx >= 0) {
        console.log(`surname = ${nameRecord.nameParts[surnameIdx]}`);
        const surname = nameRecord.nameParts[surnameIdx];
        const personalNumbers = surnameToPersonalNumbers[surname];
        console.log(`surname -> personalNumbers`);
        console.log(personalNumbers);
        if (personalNumbers.length === 1) {
            return personalNumbers[0];
        }
        const res = tryFindByNameParts(nameRecord, personalNumbers, studentData);
        console.log(`tryFindByNameParts`);
        console.log(res);
        if (res) {
            return res;
        }
        for (const personalNumber of personalNumbers) {
            const testStudent = studentData.data[personalNumber];
            if (nameRecord.group && nameRecord.group !== testStudent.groupName.toLowerCase()) {
                continue;
            }
            const partsFound = nameRecord.nameParts.every(
                np => np === testStudent.firstname ||
                        np === testStudent.surname ||
                        np === testStudent.patronymic);
            if (partsFound) {
                return personalNumber;
            }
        }
    }

    const res = tryFindByNameParts(
        nameRecord,
        personalNumbers,
        studentData
    );
    console.log(`tryFindByNameParts all personalNumbers`);
    console.log(res);
    return res;
}
// Найти список фамилий 
// Вытащить фамилии из входных данных по этому списку