

export interface TaskResultNameRecord {
    group: string;
    fullnameLower: string;
}

export function normalizeStudentNames(text: string): string[][] {
    const result: string[][] = [];
    const studentRecords = text.split(/\r?\n/);
    for (const studentRecord of studentRecords) {
        const studentRecordSpaceSeparated = studentRecord
            .replace(/\s?-\s?/g, '-')
            .replace(/[,\s]+/g, ' ')
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
            fullnameLower: ""
        };
        if (studentRecordPart.length === 0) {
            continue;
        }
        let nameIndex = 0;
        if (!/^\w+$/.test(studentRecordPart[0])) {
            nameIndex = 1;
            taskResultNameRecord.group = studentRecordPart[0];
        }

        let nameParts: string[] = [];
        for (let i = nameIndex; i < studentRecordPart.length; i++) {
            nameParts.push(studentRecordPart[i]);
        }
        taskResultNameRecord.fullnameLower = nameParts.join(' ');
        result.push(taskResultNameRecord);
    }

    return result;
}

// function findPersonalNumbersByNameRecord(
//     taskResultNameRecord: TaskResultNameRecord[],
//     personalNumber
// ) {

// }