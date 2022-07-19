import React from 'react';
import {
    getNameRecords,
    getSurnameToKeys,
    findPersonalNumber,
    TaskResultNameRecord,
} from '../taskResultUpdater/studentNamesParser';
import {
    IStudentData
} from '../common/types';

describe("getNameRecords", () => {
    it('extracts groups and names, ignores spaces and commas', () => {
        const text = `МЕН-490810	Слово Слово Слово 
        МЕН-490810	  Слово    Слово	
        МЕН-490810	Слово,Слово, Слово 
        Слово Слово`;
        const actualNameRecords = getNameRecords(text);
        expect(actualNameRecords.length).toBe(4);
        for (let i = 0; i < actualNameRecords.length - 1; i++) {
            expect(actualNameRecords[i].group).toBe('мен-490810');
        }
        expect(actualNameRecords[actualNameRecords.length - 1].group).toBe('');
        expect(actualNameRecords[0].nameParts.length).toBe(3);
        expect(actualNameRecords[1].nameParts.length).toBe(2);
        expect(actualNameRecords[2].nameParts.length).toBe(3);
        expect(actualNameRecords[3].nameParts.length).toBe(2);
        for (let i = 0; i < actualNameRecords.length - 1; i++) {
            for (let namePart of actualNameRecords[i].nameParts) {
                expect(namePart).toBe('слово');
            }
        }
    });
});



describe("findPersonalNumber", () => {
    const personalNumbers: string[] = ['1', '2', '3'];
    const studentData: IStudentData = {
        ids: personalNumbers, data: {
            [personalNumbers[0]]: {
                id: 's0', personalNumber: personalNumbers[0], groupName: 'МЕН-490809',
                surname: 'Фа', firstname: 'Иа', patronymic: 'Оа', rating: 1, status: 'Активен'
            },
            [personalNumbers[1]]: {
                id: 's1', personalNumber: personalNumbers[1], groupName: 'МЕН-490809',
                surname: 'Фб', firstname: 'Иб', patronymic: 'Об', rating: 1, status: 'Активен'
            },
            [personalNumbers[2]]: {
                id: 's2', personalNumber: personalNumbers[2], groupName: 'МЕН-490810',
                surname: 'Фа', firstname: 'Иа', patronymic: 'Оа', rating: 1, status: 'Активен'
            },
        }
    };
    const nameRecords: TaskResultNameRecord[] = [
        {group: 'мен-490809', nameParts: ['фа', 'иа', 'оа']}, // full match
        {group: 'мен-490810', nameParts: ['оа', 'иа', 'фа']}, // full match parts not in order
        {group: 'мен-490809', nameParts: ['иа', 'фа']}, // group, name, surname, definitely match
        {group: '', nameParts: ['иб', 'фб']}, // name, surname definitely match
        {group: '', nameParts: ['иб', 'об']}, // name, patronomic definitely match
        {group: 'мен-490809', nameParts: ['оа', 'иа']}, // group, patronomic, name definitely match
        {group: '', nameParts: ['иа']}, // name cant definitely match, take any?
    ];

    const surnameToPersonalNumbers = getSurnameToKeys(
        personalNumbers, studentData
    );
    

    it('finds personalNumber by fullname and group', () => {
        const actual = findPersonalNumber(
            nameRecords[0],
            surnameToPersonalNumbers,
            personalNumbers,
            studentData
        );
        expect(actual).toBe(personalNumbers[0]);
    });

    it('finds personalNumber by fullname and group when match parts not in order', () => {
        const actual = findPersonalNumber(
            nameRecords[1],
            surnameToPersonalNumbers,
            personalNumbers,
            studentData
        );

        expect(actual).toBe(personalNumbers[2]);
    });

    it('finds personalNumber by group, name and surname', () => {
        const actual = findPersonalNumber(
            nameRecords[2],
            surnameToPersonalNumbers,
            personalNumbers,
            studentData
        );

        expect(actual).toBe(personalNumbers[0]);
    });

    it('finds personalNumber by name, surname', () => {
        const actual = findPersonalNumber(
            nameRecords[3],
            surnameToPersonalNumbers,
            personalNumbers,
            studentData
        );

        expect(actual).toBe(personalNumbers[1]);
    });

    it('finds personalNumber matches any if have several people', () => {
        const actual = findPersonalNumber(
            nameRecords[6],
            surnameToPersonalNumbers,
            personalNumbers,
            studentData
        );

        expect(actual).toBeTruthy();
    });
});
