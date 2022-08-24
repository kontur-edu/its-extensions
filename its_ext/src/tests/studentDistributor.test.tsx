import {
  IMupData,
  AdmissionInfo,
  CompetitionGroupIdToMupAdmissions,
} from "../common/types";

import {
  IStudentAdmissionDistributionItem,
  IMupDistributionItem,
  tryDistributeMupsByStudentRatingAndAdmissionPriority,
  addRandomMupsForStudentIfNeeded,
} from "../studentAdmission/studentDistributor";

type IPnToStudentItem = {
  [key: string]: IStudentAdmissionDistributionItem;
};
type IMupIdToMupItem = { [key: string]: IMupDistributionItem };

const mupData: IMupData = {
  ids: ["m1", "m2", "m3", "m4", "m5"],
  data: {
    m1: { id: "m1", name: "M1", shortName: "", ze: 3, teacherIds: [] },
    m2: { id: "m2", name: "M2", shortName: "", ze: 6, teacherIds: [] },
    m3: { id: "m3", name: "M3", shortName: "", ze: 3, teacherIds: [] },
    m4: { id: "m4", name: "M4", shortName: "", ze: 3, teacherIds: [] },
    m5: { id: "m5", name: "M5", shortName: "", ze: 3, teacherIds: [] },
  },
};

function cloneObject(obj: object) {
  return JSON.parse(JSON.stringify(obj));
}

describe("fillDistributionByStudentRatingAndAdmissionPriority", () => {
  it("distributes student to mups", () => {
    const competitionGroupIdToZELimit: { [key: number]: number } = {
      0: 9,
      1: 9,
    };
    const personalNumbersSortedByRating: string[] = ["s1", "s2", "s3"];
    const admissionIdToMupId: { [key: number]: string } = {};
    let counter = 1;
    for (const mupId of mupData.ids) {
      admissionIdToMupId[counter++] = mupId;
      admissionIdToMupId[counter++] = mupId;
    }
    const admissionInfo: AdmissionInfo = {
      1: {
        s1: { admissionId: 1, priority: 1, testResult: null, status: 0 },
        s3: { admissionId: 2, priority: 2, testResult: null, status: 0 },
      },
      2: { s2: { admissionId: 2, priority: 1, testResult: null, status: 0 } },
      3: { s1: { admissionId: 3, priority: 2, testResult: null, status: 0 } },
      4: { s2: { admissionId: 4, priority: 2, testResult: 1, status: 0 } },
      5: {
        s1: { admissionId: 5, priority: 1, testResult: null, status: 0 },
        s3: { admissionId: 5, priority: 3, testResult: null, status: 0 },
      },
      6: { s2: { admissionId: 6, priority: 1, testResult: null, status: 0 } },
      7: { s1: { admissionId: 7, priority: 1, testResult: null, status: 0 } },
      8: { s2: { admissionId: 8, priority: 1, testResult: null, status: 0 } },
    };
    const mupIdsWithTestResultRequired: Set<string> = new Set<string>();
    for (const aId in admissionInfo) {
      for (const pn in admissionInfo[aId]) {
        if (admissionInfo[aId][pn]?.testResult) {
          mupIdsWithTestResultRequired.add(admissionIdToMupId[aId]);
        }
      }
    }

    const personalNumberToStudentItem: IPnToStudentItem = {
      s1: {
        currentZE: 0,
        admissionIds: [1, 3, 5, 7],
        selectedAdmissionIds: [],
        competitionGroupId: 0,
      },
      s2: {
        currentZE: 0,
        admissionIds: [2, 4, 6, 8],
        selectedAdmissionIds: [],
        competitionGroupId: 1,
      },
      s3: {
        currentZE: 0,
        admissionIds: [1, 5],
        selectedAdmissionIds: [],
        competitionGroupId: 1,
      },
    };
    const mupIdToMupItem: IMupIdToMupItem = {
      m1: { limit: 2, count: 0 },
      m2: { limit: 2, count: 0 },
      m3: { limit: 2, count: 0 },
      m4: { limit: 2, count: 0 },
    };

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      personalNumberToStudentItem,
      mupIdToMupItem,
      mupIdsWithTestResultRequired,
      competitionGroupIdToZELimit,
      personalNumbersSortedByRating,
      mupData,
      admissionIdToMupId,
      admissionInfo
    );

    expect(personalNumberToStudentItem["s1"].currentZE).toBe(9);
    expect(personalNumberToStudentItem["s2"].currentZE).toBe(9);
    expect(personalNumberToStudentItem["s3"].currentZE).toBe(3);
  });

  it("takes test results into account", () => {
    const mupIdToMupItem: IMupIdToMupItem = {
      m1: { limit: 1, count: 0 },
      m2: { limit: 2, count: 0 },
    };
    const admissionInfo: AdmissionInfo = {
      1: {
        s1: { admissionId: 1, priority: 2, testResult: 1, status: 0 },
        s2: { admissionId: 1, priority: 1, testResult: 0, status: 0 },
      },
      2: {
        s1: { admissionId: 2, priority: 1, testResult: 0, status: 0 },
        s2: { admissionId: 2, priority: 2, testResult: 1, status: 0 },
      },
    };

    const personalNumberToStudentItem: IPnToStudentItem = {
      s1: {
        currentZE: 0,
        admissionIds: [1, 2],
        selectedAdmissionIds: [],
        competitionGroupId: 0,
      },
      s2: {
        currentZE: 0,
        admissionIds: [1, 2],
        selectedAdmissionIds: [],
        competitionGroupId: 0,
      },
    };

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      personalNumberToStudentItem,
      mupIdToMupItem,
      new Set<string>(),
      { 0: 6, 1: 6 },
      ["s1", "s2"],
      mupData,
      { 1: "m1", 2: "m2" },
      admissionInfo
    );

    expect(personalNumberToStudentItem["s1"].currentZE).toBe(3);
    expect(personalNumberToStudentItem["s2"].currentZE).toBe(6);
  });

  it("takes rating into account", () => {
    const mupIdToMupItem: IMupIdToMupItem = {
      m1: { limit: 1, count: 0 },
      m2: { limit: 1, count: 0 },
      m3: { limit: 1, count: 0 },
      m4: { limit: 1, count: 0 },
      m5: { limit: 1, count: 0 },
    };
    const admissionInfo: AdmissionInfo = {
      1: {
        s1: { admissionId: 1, priority: 2, testResult: 0, status: 0 },
        s2: { admissionId: 1, priority: 2, testResult: 0, status: 0 },
      },
      2: {
        s1: { admissionId: 2, priority: 2, testResult: 0, status: 0 },
        s2: { admissionId: 2, priority: 2, testResult: 0, status: 0 },
      },
      3: {
        s1: { admissionId: 3, priority: 1, testResult: 0, status: 0 },
        s2: { admissionId: 3, priority: 1, testResult: 0, status: 0 },
      },
      4: {
        s1: { admissionId: 4, priority: 1, testResult: 0, status: 0 },
        s2: { admissionId: 4, priority: 1, testResult: 0, status: 0 },
      },
    };

    const personalNumberToStudentItem: IPnToStudentItem = {
      s1: {
        currentZE: 0,
        admissionIds: [1, 2, 3, 4],
        selectedAdmissionIds: [],
        competitionGroupId: 0,
      },
      s2: {
        currentZE: 0,
        admissionIds: [1, 2, 3, 4],
        selectedAdmissionIds: [],
        competitionGroupId: 0,
      },
    };

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      personalNumberToStudentItem,
      mupIdToMupItem,
      new Set<string>(),
      { 0: 6, 1: 6 },
      ["s1", "s2"],
      mupData,
      { 1: "m1", 2: "m3", 3: "m4", 4: "m5" },
      admissionInfo
    );

    // console.log(Array.from(mupIdsWithTestResultRequired));
    // console.log(admissionInfo);
    // console.log(admissionIdToMupId);
    // console.log(personalNumberToStudentItem);
    // console.log(mupIdToMupItem);

    expect(personalNumberToStudentItem["s1"].currentZE).toBe(6);
    expect(personalNumberToStudentItem["s2"].currentZE).toBe(6);
    expect(personalNumberToStudentItem["s1"].selectedAdmissionIds).toContain(1);
    expect(personalNumberToStudentItem["s1"].selectedAdmissionIds).toContain(2);
    expect(personalNumberToStudentItem["s2"].selectedAdmissionIds).toContain(3);
    expect(personalNumberToStudentItem["s2"].selectedAdmissionIds).toContain(4);
  });
});

describe("addRandomMupsForStudentIfNeeded", () => {
  const baseMupIdToMupItem: IMupIdToMupItem = {
    m1: { limit: 2, count: 1 },
    m2: { limit: 2, count: 2 },
    m3: { limit: 2, count: 1 },
    m4: { limit: 2, count: 1 },
  };

  const competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions = {
    0: {
      m1: { mupId: "m1", limit: 2, count: 1, admissionId: 1 },
      m2: { mupId: "m2", limit: 2, count: 2, admissionId: 2 },
      m3: { mupId: "m3", limit: 2, count: 1, admissionId: 3 },
      m4: { mupId: "m4", limit: 2, count: 1, admissionId: 4 },
    },
  };

  it("excludes already selected mups", () => {
    const mupIdToMupItem = cloneObject(baseMupIdToMupItem);
    const personalNumberToStudentItem: IPnToStudentItem = {
      s1: {
        currentZE: 3,
        admissionIds: [1],
        selectedAdmissionIds: [1],
        competitionGroupId: 0,
      },
    };

    addRandomMupsForStudentIfNeeded(
      ["s1"],
      personalNumberToStudentItem,
      mupIdToMupItem,
      new Set<string>(),
      { 0: 6 },
      {},
      { 1: "m1", 2: "m2", 3: "m3", 4: "m4" },
      mupData,
      competitionGroupIdToMupAdmissions,
      {}
    );

    // console.log(personalNumberToStudentItem);
    const studentItem = personalNumberToStudentItem["s1"];

    expect(studentItem.currentZE).toBe(6);
    expect(studentItem.selectedAdmissionIds).not.toContain(2);
    expect(new Set(studentItem.selectedAdmissionIds).size).toBe(2);
  });

  it("excludes earlier admitted mups", () => {
    const mupIdToMupItem = cloneObject(baseMupIdToMupItem);
    const personalNumberToStudentItem: IPnToStudentItem = {
      s1: {
        currentZE: 0,
        admissionIds: [],
        selectedAdmissionIds: [],
        competitionGroupId: 0,
      },
    };

    addRandomMupsForStudentIfNeeded(
      ["s1"],
      personalNumberToStudentItem,
      mupIdToMupItem,
      new Set<string>(),
      { 0: 6 },
      { s1: new Set<string>(["M1", "M2", "M4"]) },
      { 1: "m1", 2: "m2", 3: "m3", 4: "m4" },
      mupData,
      competitionGroupIdToMupAdmissions,
      {}
    );

    // console.log(personalNumberToStudentItem);
    const studentItem = personalNumberToStudentItem["s1"];

    expect(studentItem.currentZE).toBe(3);
    expect(studentItem.selectedAdmissionIds).not.toContain(1);
    expect(new Set(studentItem.selectedAdmissionIds).size).toBe(1);
  });
});
