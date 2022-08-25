import {
  IAdmissionMeta,
  IMup,
  IMupData,
  IStudentAdmission,
  IStudent,
} from "../common/types";
import {
  calcZE,
  createPersonalNumberToStudentItem,
  findMupIdsWithTestResultRequired,
  filterActiveStudentsAndSortByRating,
} from "../studentAdmission/studentDistribution";

const mups: IMup[] = [
  {
    id: "m1",
    name: "M1",
    shortName: "M1",
    ze: 3,
    teacherIds: [],
  },
  {
    id: "m2",
    name: "M2",
    shortName: "M2",
    ze: 3,
    teacherIds: [],
  },
];

const mupData: IMupData = {
  ids: ["m1", "m2"],
  data: {
    m1: mups[0],
    m2: mups[1],
  },
};

describe("calcZE", () => {
  it("finds correct total ze", () => {
    const actualRes = calcZE([1, 2], mupData, { 1: "m1", 2: "m2" });
    expect(actualRes).toBe(6);
  });
});

const admissionMetas: IAdmissionMeta[] = [
  {
    mupId: "m1",
    limit: 2,
    count: 0,
    admissionId: 1,
  },
  {
    mupId: "m1",
    limit: 2,
    count: 0,
    admissionId: 2,
  },
  {
    mupId: "m2",
    limit: 2,
    count: 0,
    admissionId: 3,
  },
  {
    mupId: "m2",
    limit: 2,
    count: 0,
    admissionId: 4,
  },
];

const studentAdmissions: IStudentAdmission[] = [
  {
    admissionId: 1,
    priority: 1,
    testResult: null,
    status: 0,
  },
  {
    admissionId: 2,
    priority: 1,
    testResult: null,
    status: 0,
  },
];

describe("createPersonalNumberToStudentItem", () => {
  it("creates student items", () => {
    const actualRes = createPersonalNumberToStudentItem(
      [1],
      { 1: { m1: admissionMetas[0] } },
      { 1: { pn1: studentAdmissions[0] } }
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(1);
    expect(personalNumbers).toContain("pn1");
    const studentItem = actualRes["pn1"];
    expect(studentItem.currentZE).toBe(0);
    expect(studentItem.admissionIds.length).toBe(1);
    expect(studentItem.admissionIds).toContain(1);
    expect(studentItem.selectedAdmissionIds.length).toBe(0);
    expect(studentItem.competitionGroupId).toBe(1);
  });

  it("creates student items with empty admissions", () => {
    const actualRes = createPersonalNumberToStudentItem(
      [1],
      { 1: { m1: admissionMetas[0] } },
      { 1: { pn1: studentAdmissions[0], pn2: null } }
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(2);
    expect(personalNumbers).toContain("pn2");
    const studentItem = actualRes["pn2"];
    expect(studentItem.currentZE).toBe(0);
    expect(studentItem.admissionIds.length).toBe(0);
    expect(studentItem.selectedAdmissionIds.length).toBe(0);
    expect(studentItem.competitionGroupId).toBe(1);
  });

  it("creates student items with selected admissions", () => {
    const actualRes = createPersonalNumberToStudentItem(
      [1],
      { 1: { m1: admissionMetas[0] } },
      { 1: { pn1: { ...studentAdmissions[0], status: 1 } } }
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(1);
    expect(personalNumbers).toContain("pn1");
    const studentItem = actualRes["pn1"];
    expect(studentItem.currentZE).toBe(0); // NOTE: not set ze in this step
    expect(studentItem.admissionIds.length).toBe(1);
    expect(studentItem.selectedAdmissionIds.length).toBe(1);
    expect(studentItem.competitionGroupId).toBe(1);
  });
});

describe("findMupIdsWithTestResultRequired", () => {
  it("nothing if no test results", () => {
    const actualRes = findMupIdsWithTestResultRequired(
      [1, 2],
      { 1: { m1: admissionMetas[0] }, 2: { m1: admissionMetas[1] } },
      { 1: { pn1: studentAdmissions[0] }, 2: { pn2: studentAdmissions[1] } }
    );

    expect(actualRes.size).toBe(0);
  });

  it("finds if at least one has a test result", () => {
    const actualRes = findMupIdsWithTestResultRequired(
      [1, 2],
      { 1: { m1: admissionMetas[0] }, 2: { m1: admissionMetas[1] } },
      {
        1: { pn1: studentAdmissions[0] },
        2: { pn2: { ...studentAdmissions[1], testResult: 1 } },
      }
    );

    expect(actualRes.size).toBe(1);
    expect(Array.from(actualRes)[0]).toBe("m1");
  });

  it("finds if at least one has a test result (2 mups)", () => {
    const actualRes = findMupIdsWithTestResultRequired(
      [1, 2],
      {
        1: { m1: admissionMetas[0], m2: admissionMetas[2] },
        2: { m1: admissionMetas[1], m2: admissionMetas[3] },
      },
      {
        1: { pn1: studentAdmissions[0] },
        2: { pn2: { ...studentAdmissions[1], testResult: 1 } },
        3: { pn1: { ...studentAdmissions[2], admissionId: 3, testResult: 1 } },
        4: { pn2: { ...studentAdmissions[3], admissionId: 4 } },
      }
    );

    expect(actualRes.size).toBe(2);
    const mupNameArr = Array.from(actualRes);
    expect(mupNameArr).toContain("m1");
    expect(mupNameArr).toContain("m2");
  });
});

describe("filterActiveStudentsAndSortByRating", () => {
  it("filter and sorts", () => {
    const students: IStudent[] = [
      {
        id: "s1",
        personalNumber: "pn1",
        groupName: "g1",
        surname: "s",
        firstname: "f",
        patronymic: "p",
        rating: 1,
        status: "Активный",
        competitionGroupId: 1,
      },
      {
        id: "s2",
        personalNumber: "pn2",
        groupName: "g1",
        surname: "s",
        firstname: "f",
        patronymic: "p",
        rating: 2,
        status: "Активный",
        competitionGroupId: 1,
      },
      {
        id: "s3",
        personalNumber: "pn3",
        groupName: "g3",
        surname: "s",
        firstname: "f",
        patronymic: "p",
        rating: 3,
        status: "Отчислен",
        competitionGroupId: 1,
      },
    ];
    const studentData = {
      ids: ["pn1", "pn2", "pn3"],
      data: {
        pn1: students[0],
        pn2: students[1],
        pn3: students[2],
      },
    };
    const actualRes = filterActiveStudentsAndSortByRating(
      studentData.ids,
      studentData
    );

    expect(actualRes.length).toBe(2);
    expect(actualRes[0]).toBe("pn2");
    expect(actualRes[1]).toBe("pn1");
  });
});
