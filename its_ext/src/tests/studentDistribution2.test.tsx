import {
  IAdmissionMeta,
  CompetitionGroupIdToMupAdmissions,
  IStudentData,
  IStudent,
  IMupData,
  IMup,
  AdmissionInfo,
  IStudentAdmission,
} from "../common/types";
import {
  createStudentDistribution,
  IStudentDistributionAlgoInfo,
  IStudentDistributionAdmissionAlgoInfo,
  IMupAlgoInfo,
  createStudentDistributionAlgoInfos,
} from "../studentAdmission/studentDistribution";

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
      admissionsWithPriorityOrTestResult: [
        studentDistributionAdmissionAlgoInfos[0],
      ],
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
          { ...studentDistributionAdmissionAlgoInfos[0], testPassed: false },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn2",
        admissionsWithPriorityOrTestResult: [
          { ...studentDistributionAdmissionAlgoInfos[0], testPassed: true },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn3",
        admissionsWithPriorityOrTestResult: [
          { ...studentDistributionAdmissionAlgoInfos[0], testPassed: false },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn4",
        admissionsWithPriorityOrTestResult: [
          { ...studentDistributionAdmissionAlgoInfos[0], testPassed: true },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn5",
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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
        admissionsWithPriorityOrTestResult: [
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

  it("takes into account already admitted mups from different competition groups", () => {
    const testStudentDistributionAlgoInfos: IStudentDistributionAlgoInfo[] = [
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn1",
        competitionGroupId: 1,
        rating: 100,
        admissionsWithPriorityOrTestResult: [
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
        competitionGroupId: 2,
        rating: 90,
        admissionsWithPriorityOrTestResult: [
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
        competitionGroupId: 1,
        rating: 80,
        admissionsWithPriorityOrTestResult: [
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
        competitionGroupId: 1,
        rating: 70,
        admissionsWithPriorityOrTestResult: [
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
        competitionGroupId: 2,
        rating: 60,
        admissionsWithPriorityOrTestResult: [
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
        2: {
          m1: {
            mupId: "m1",
            limit: 3,
            count: 2,
            admissionId: 6,
          },
          m2: {
            mupId: "m2",
            limit: 4,
            count: 3,
            admissionId: 7,
          },
          m3: {
            mupId: "m3",
            limit: 2,
            count: 1,
            admissionId: 8,
          },
          m4: {
            mupId: "m4",
            limit: 10,
            count: 1,
            admissionId: 9,
          },
          m5: {
            mupId: "m5",
            limit: 20,
            count: 1,
            admissionId: 10,
          },
        },
      };

    const actualRes = createStudentDistribution(
      testStudentDistributionAlgoInfos,
      testMupIdToMupAlgoInfo,
      { 1: 9, 2: 9 },
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
    expect(actualRes["pn2"]).toContain(6);
    expect(actualRes["pn2"]).toContain(7);
    expect(actualRes["pn2"]).toContain(8);
    expect(actualRes["pn3"]).toContain(2);
    expect(actualRes["pn3"]).toContain(4);
    expect(actualRes["pn4"]).toContain(1);
    expect(actualRes["pn4"]).toContain(2);
    expect(actualRes["pn5"]).toContain(10);
    expect(actualRes["pn5"]).toContain(9);
  });
});

describe("createStudentDistributionAlgoInfos", () => {
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
  ];
  const studentData: IStudentData = {
    ids: ["pn1", "pn2"],
    data: {
      pn1: students[0],
      pn2: { ...students[0], id: "s2", personalNumber: "pn2" },
    },
  };
  const mups: IMup[] = [
    {
      id: "m1",
      name: "M1",
      shortName: "MS1",
      ze: 3,
      teacherIds: [],
    },
  ];
  const mupData: IMupData = {
    ids: ["m1", "m2"],
    data: {
      m1: mups[0],
      m2: { ...mups[0], id: "m2", name: "M2" },
    },
  };
  const studentAdmissions: IStudentAdmission[] = [
    {
      admissionId: 1,
      priority: 1,
      testResult: null,
      status: 0,
    },
  ];
  const admissionInfo: AdmissionInfo = {
    1: {
      pn1: studentAdmissions[0],
      pn2: studentAdmissions[0],
    },
    2: {
      pn2: { ...studentAdmissions[0], admissionId: 2 },
    },
  };
  const admissionMetas: IAdmissionMeta[] = [
    {
      mupId: "m1",
      limit: 10,
      count: 0,
      admissionId: 1,
    },
  ];
  const competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions = {
    1: {
      m1: admissionMetas[0],
      m2: { ...admissionMetas[0], mupId: "m2", admissionId: 2 },
    },
  };
  it("creates correct studentDistributionAlgoInfo", () => {
    const actualRes = createStudentDistributionAlgoInfos(
      ["pn1", "pn2"],
      studentData,
      {},
      mupData,
      admissionInfo,
      competitionGroupIdToMupAdmissions
    );

    expect(actualRes.length).toBe(2);
    const studentInfosSorted = actualRes.sort((lhs, rhs) => {
      return lhs.personalNumber.localeCompare(rhs.personalNumber);
    });
    expect(studentInfosSorted[0].personalNumber).toBe("pn1");
    expect(studentInfosSorted[0].rating).toBe(1);
    expect(studentInfosSorted[0].competitionGroupId).toBe(1);
    expect(
      Object.keys(studentInfosSorted[0].mupIdsAdmittedEarlier).length
    ).toBe(0);
    expect(
      studentInfosSorted[0].admissionsWithPriorityOrTestResult.length
    ).toBe(1);
    expect(
      studentInfosSorted[0].admissionsWithPriorityOrTestResult[0].mupId
    ).toBe("m1");
    expect(
      studentInfosSorted[0].admissionsWithPriorityOrTestResult[0].priority
    ).toBe(1);
    expect(
      studentInfosSorted[0].admissionsWithPriorityOrTestResult[0].testPassed
    ).toBeFalsy();
    expect(
      studentInfosSorted[0].admissionsWithPriorityOrTestResult[0].admitted
    ).toBeFalsy();

    expect(studentInfosSorted[1].personalNumber).toBe("pn2");
    expect(studentInfosSorted[1].rating).toBe(1);
    expect(studentInfosSorted[1].competitionGroupId).toBe(1);
    expect(
      Object.keys(studentInfosSorted[0].mupIdsAdmittedEarlier).length
    ).toBe(0);
    expect(
      studentInfosSorted[1].admissionsWithPriorityOrTestResult.length
    ).toBe(2);
  });
});
