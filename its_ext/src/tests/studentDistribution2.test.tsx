import {
  IAdmissionMeta,
  IMup,
  IMupData,
  IStudentAdmission,
  AdmissionInfo,
  CompetitionGroupIdToMupAdmissions,
  IStudent,
} from "../common/types";
import {
  calcZE,
  createPersonalNumberToStudentItem,
  IStudentAdmissionDistributionItem,
  findMupIdsWithTestResultRequired,
  IMupDistributionItem,
  filterActiveStudentsAndSortByRating,
  createStudentDistribution,
  IStudentDistributionAlgoInfo,
  IStudentDistributionAdmissionAlgoInfo,
  IMupAlgoInfo,
} from "../studentAdmission/studentDistributor";
import { cloneObject } from "../utils/helpers";

describe("createStudentDistribution", () => {
  const studentDistributionAdmissionAlgoInfos: IStudentDistributionAdmissionAlgoInfo[] =
    [
      {
        mupId: "m1",
        testPassed: false,
        priority: 1,
        admitted: false,
      },
    ];

  const studentDistributionAlgoInfos: IStudentDistributionAlgoInfo[] = [
    {
      personalNumber: "pn1",
      rating: 1,
      competitionGroupId: 1,
      admissions: [studentDistributionAdmissionAlgoInfos[0]],
      mupIdsAdmittedEarlier: new Set<string>(),
    },
  ];

  const mupAdmissionMetas: IAdmissionMeta[] = [
    {
      mupId: "m1",
      limit: 2,
      count: 0,
      admissionId: 1,
    },
  ];

  it("distributes students if have priorities and have enough zet and limits", () => {
    const actualRes = createStudentDistribution(
      [
        studentDistributionAlgoInfos[0],
        { ...studentDistributionAlgoInfos[0], personalNumber: "pn2" },
      ],
      { m1: { ze: 3, testResultRequired: false } },
      { 1: 6 },
      { 1: { m1: mupAdmissionMetas[0] } }
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(2);
    expect(personalNumbers).toContain("pn1");
    expect(personalNumbers).toContain("pn2");
    expect(actualRes["pn1"]).toContain(1);
    expect(actualRes["pn2"]).toContain(1);
  });

  it("takes into account student ze Limit while no priorities (simple)", () => {
    const actualRes = createStudentDistribution(
      [
        studentDistributionAlgoInfos[0],
        { ...studentDistributionAlgoInfos[0], personalNumber: "pn2" },
      ],
      {
        m1: { ze: 6, testResultRequired: false },
        m2: { ze: 3, testResultRequired: false },
      },
      { 1: 3 },
      {
        1: {
          m1: mupAdmissionMetas[0],
          m2: { ...mupAdmissionMetas[0], mupId: "m2", admissionId: 2 },
        },
      }
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(2);
    expect(personalNumbers).toContain("pn1");
    expect(personalNumbers).toContain("pn2");
    expect(actualRes["pn1"].size).toBe(1);
    expect(actualRes["pn2"].size).toBe(1);
    expect(actualRes["pn1"]).toContain(2);
    expect(actualRes["pn2"]).toContain(2);
  });

  it("takes into account ze limit while have admissions", () => {
    const testStudentDistributionAlgoInfos: IStudentDistributionAlgoInfo[] = [
      {
        ...studentDistributionAlgoInfos[0],
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m1",
            priority: 1,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m2",
            priority: 2,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m3",
            priority: 1,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m4",
            priority: 2,
          },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn2",
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m1",
            priority: 2,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m2",
            priority: 1,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m3",
            priority: 2,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m4",
            priority: 1,
          },
        ],
      },
    ];
    const testMupIdToMupAlgoInfo: { [key: string]: IMupAlgoInfo } = {
      m1: { ze: 6, testResultRequired: false },
      m2: { ze: 6, testResultRequired: false },
      m3: { ze: 3, testResultRequired: false },
      m4: { ze: 3, testResultRequired: false },
    };
    const testCompetitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions =
      {
        1: {
          m1: {
            mupId: "m1",
            limit: 2,
            count: 0,
            admissionId: 1,
          },
          m2: {
            mupId: "m2",
            limit: 2,
            count: 0,
            admissionId: 2,
          },
          m3: {
            mupId: "m3",
            limit: 2,
            count: 0,
            admissionId: 3,
          },
          m4: {
            mupId: "m4",
            limit: 2,
            count: 0,
            admissionId: 4,
          },
        },
      };

    const actualRes = createStudentDistribution(
      testStudentDistributionAlgoInfos,
      testMupIdToMupAlgoInfo,
      { 1: 9 },
      testCompetitionGroupIdToMupAdmissions
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(2);
    expect(personalNumbers).toContain("pn1");
    expect(personalNumbers).toContain("pn2");
    expect(actualRes["pn1"].size).toBe(2);
    expect(actualRes["pn2"].size).toBe(2);
    expect(actualRes["pn1"]).toContain(1);
    expect(actualRes["pn1"]).toContain(3);
    expect(actualRes["pn2"]).toContain(2);
    expect(actualRes["pn2"]).toContain(4);
  });

  it("takes into account mup limit and student rating", () => {
    const testStudentDistributionAlgoInfos: IStudentDistributionAlgoInfo[] = [
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn1",
        rating: 10,
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn2",
        rating: 20,
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn3",
        rating: 5,
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn4",
        rating: 100,
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn5",
        rating: 75,
      },
    ]; // pn4 pn5 pn2 pn1 pn3
    const testMupIdToMupAlgoInfo: { [key: string]: IMupAlgoInfo } = {
      m1: { ze: 3, testResultRequired: false },
    };
    const testCompetitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions =
      {
        1: {
          m1: {
            mupId: "m1",
            limit: 3,
            count: 0,
            admissionId: 1,
          },
        },
      };

    const actualRes = createStudentDistribution(
      testStudentDistributionAlgoInfos,
      testMupIdToMupAlgoInfo,
      { 1: 9 },
      testCompetitionGroupIdToMupAdmissions
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(5);
    expect(actualRes["pn4"].size).toBe(1);
    expect(actualRes["pn5"].size).toBe(1);
    expect(actualRes["pn2"].size).toBe(1);
    expect(actualRes["pn3"].size).toBe(0);
    expect(actualRes["pn1"].size).toBe(0);
    expect(actualRes["pn4"]).toContain(1);
    expect(actualRes["pn5"]).toContain(1);
    expect(actualRes["pn2"]).toContain(1);
  });

  it("not allow students without test result be admitted if test result required", () => {
    const testStudentDistributionAlgoInfos: IStudentDistributionAlgoInfo[] = [
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn1",
        admissions: [
          { ...studentDistributionAdmissionAlgoInfos[0], testPassed: false },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn2",
        admissions: [
          { ...studentDistributionAdmissionAlgoInfos[0], testPassed: true },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn3",
        admissions: [
          { ...studentDistributionAdmissionAlgoInfos[0], testPassed: false },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn4",
        admissions: [
          { ...studentDistributionAdmissionAlgoInfos[0], testPassed: true },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn5",
        admissions: [
          { ...studentDistributionAdmissionAlgoInfos[0], testPassed: false },
        ],
      },
    ]; // pn4 pn2
    const testMupIdToMupAlgoInfo: { [key: string]: IMupAlgoInfo } = {
      m1: { ze: 3, testResultRequired: true },
    };
    const testCompetitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions =
      {
        1: {
          m1: {
            mupId: "m1",
            limit: 20,
            count: 0,
            admissionId: 1,
          },
        },
      };

    const actualRes = createStudentDistribution(
      testStudentDistributionAlgoInfos,
      testMupIdToMupAlgoInfo,
      { 1: 9 },
      testCompetitionGroupIdToMupAdmissions
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(5);
    expect(actualRes["pn4"].size).toBe(1);
    expect(actualRes["pn2"].size).toBe(1);
    expect(actualRes["pn5"].size).toBe(0);
    expect(actualRes["pn3"].size).toBe(0);
    expect(actualRes["pn1"].size).toBe(0);
    expect(actualRes["pn4"]).toContain(1);
    expect(actualRes["pn2"]).toContain(1);
  });

  it("allow random admit for student if no priority but with test result if required", () => {
    const testStudentDistributionAlgoInfos: IStudentDistributionAlgoInfo[] = [
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn1",
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            testPassed: false,
            priority: null,
          },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn2",
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            testPassed: true,
            priority: null,
          },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn3",
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            testPassed: false,
            priority: 1,
          },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn4",
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            testPassed: true,
            priority: 1,
          },
        ],
      },
    ]; // pn4 pn2
    const testMupIdToMupAlgoInfo: { [key: string]: IMupAlgoInfo } = {
      m1: { ze: 3, testResultRequired: true },
    };
    const testCompetitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions =
      {
        1: {
          m1: {
            mupId: "m1",
            limit: 20,
            count: 0,
            admissionId: 1,
          },
        },
      };

    const actualRes = createStudentDistribution(
      testStudentDistributionAlgoInfos,
      testMupIdToMupAlgoInfo,
      { 1: 9 },
      testCompetitionGroupIdToMupAdmissions
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(4);
    expect(actualRes["pn4"].size).toBe(1);
    expect(actualRes["pn2"].size).toBe(1);
    expect(actualRes["pn3"].size).toBe(0);
    expect(actualRes["pn1"].size).toBe(0);
    expect(actualRes["pn4"]).toContain(1);
    expect(actualRes["pn2"]).toContain(1);
  });

  it("takes into account already admitted mups", () => {
    const testStudentDistributionAlgoInfos: IStudentDistributionAlgoInfo[] = [
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn1",
        rating: 100,
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m1",
            priority: 1,
            admitted: true,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m2",
            priority: 1,
            admitted: true,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m3",
            priority: 1,
            admitted: true,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m4",
            priority: 2,
          },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn2",
        rating: 90,
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m1",
            priority: 1,
            admitted: true,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m2",
            priority: 1,
            admitted: true,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m4",
            priority: 1,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m3",
            priority: 2,
          },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn3",
        rating: 80,
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m1",
            priority: 1,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m2",
            priority: 1,
            admitted: true,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m3",
            priority: 2,
          },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn4",
        rating: 70,
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m1",
            priority: 1,
            admitted: true,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m2",
            priority: 1,
            admitted: true,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m4",
            priority: 2,
          },
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m5",
            priority: 3,
          },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn5",
        rating: 60,
        admissions: [
          {
            ...studentDistributionAdmissionAlgoInfos[0],
            mupId: "m5",
            priority: 1,
            testPassed: true,
          },
        ],
      },
    ]; // pn4 pn2
    const testMupIdToMupAlgoInfo: { [key: string]: IMupAlgoInfo } = {
      m1: { ze: 3, testResultRequired: false },
      m2: { ze: 3, testResultRequired: false },
      m3: { ze: 3, testResultRequired: false },
      m4: { ze: 6, testResultRequired: false },
      m5: { ze: 3, testResultRequired: true },
    };
    const testCompetitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions =
      {
        1: {
          m1: {
            mupId: "m1",
            limit: 3,
            count: 2,
            admissionId: 1,
          },
          m2: {
            mupId: "m2",
            limit: 4,
            count: 3,
            admissionId: 2,
          },
          m3: {
            mupId: "m3",
            limit: 2,
            count: 1,
            admissionId: 3,
          },
          m4: {
            mupId: "m4",
            limit: 10,
            count: 1,
            admissionId: 4,
          },
          m5: {
            mupId: "m5",
            limit: 20,
            count: 1,
            admissionId: 5,
          },
        },
      };

    const actualRes = createStudentDistribution(
      testStudentDistributionAlgoInfos,
      testMupIdToMupAlgoInfo,
      { 1: 9 },
      testCompetitionGroupIdToMupAdmissions
    );

    const personalNumbers = Object.keys(actualRes);
    expect(personalNumbers.length).toBe(5);
    expect(actualRes["pn1"].size).toBe(3);
    expect(actualRes["pn2"].size).toBe(3);
    expect(actualRes["pn3"].size).toBe(2);
    expect(actualRes["pn4"].size).toBe(2);
    expect(actualRes["pn5"].size).toBe(2);
    expect(actualRes["pn1"]).toContain(1);
    expect(actualRes["pn1"]).toContain(2);
    expect(actualRes["pn1"]).toContain(3);
    expect(actualRes["pn2"]).toContain(1);
    expect(actualRes["pn2"]).toContain(2);
    expect(actualRes["pn2"]).toContain(3);
    expect(actualRes["pn3"]).toContain(2);
    expect(actualRes["pn3"]).toContain(4);
    expect(actualRes["pn4"]).toContain(1);
    expect(actualRes["pn4"]).toContain(2);
    expect(actualRes["pn5"]).toContain(5);
    expect(actualRes["pn5"]).toContain(4);
  });
});
