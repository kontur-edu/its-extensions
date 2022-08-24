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
          { ...studentDistributionAdmissionAlgoInfos[0], mupId: "m1", priority: 1 },
          { ...studentDistributionAdmissionAlgoInfos[0], mupId: "m2", priority: 2 },
          { ...studentDistributionAdmissionAlgoInfos[0], mupId: "m3", priority: 1 },
          { ...studentDistributionAdmissionAlgoInfos[0], mupId: "m4", priority: 2 },
        ],
      },
      {
        ...studentDistributionAlgoInfos[0],
        personalNumber: "pn2",
        admissions: [
          { ...studentDistributionAdmissionAlgoInfos[0], mupId: "m1", priority: 2 },
          { ...studentDistributionAdmissionAlgoInfos[0], mupId: "m2", priority: 1 },
          { ...studentDistributionAdmissionAlgoInfos[0], mupId: "m3", priority: 2 },
          { ...studentDistributionAdmissionAlgoInfos[0], mupId: "m4", priority: 1 },
        ],
      },
    ]; 
    const testMupIdToMupAlgoInfo: { [key: string]: IMupAlgoInfo } = {
      m1: { ze: 6, testResultRequired: false },
      m2: { ze: 6, testResultRequired: false },
      m3: { ze: 3, testResultRequired: false },
      m4: { ze: 3, testResultRequired: false },
    };
    const testCompetitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions = {
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
          limit: 1,
          count: 0,
          admissionId: 3,
        },
        m4: {
          mupId: "m4",
          limit: 1,
          count: 0,
          admissionId: 4,
        },
      },
    };

    const actualRes = createStudentDistribution(
      testStudentDistributionAlgoInfos,
      testMupIdToMupAlgoInfo,
      { 1: 9 },
      testCompetitionGroupIdToMupAdmissions,
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
});
