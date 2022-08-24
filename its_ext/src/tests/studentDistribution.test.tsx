import {
  IAdmissionMeta,
  IMup,
  IMupData,
  IStudentAdmission,
  // AdmissionInfo,
  // CompetitionGroupIdToMupAdmissions,
  IStudent,
} from "../common/types";
import {
  calcZE,
  // createMupIdToMupItemByStudentItems,
  createPersonalNumberToStudentItem,
  // IStudentAdmissionDistributionItem,
  findMupIdsWithTestResultRequired,
  // tryDistributeMupsByStudentRatingAndAdmissionPriority,
  // IMupDistributionItem,
  // addRandomMupsForStudentIfNeeded,
  filterActiveStudentsAndSortByRating,
} from "../studentAdmission/studentDistributor";
// import { cloneObject } from "../utils/helpers";

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

// const studentItems: IStudentAdmissionDistributionItem[] = [
//   {
//     currentZE: 3,
//     admissionIds: [1],
//     selectedAdmissionIds: [1],
//     competitionGroupId: 1,
//   },
//   {
//     currentZE: 3,
//     admissionIds: [2],
//     selectedAdmissionIds: [2],
//     competitionGroupId: 2,
//   },
// ];

// describe("createMupIdToMupItemByStudentItems", () => {
//   it("creates mup items", () => {
//     const actualRes = createMupIdToMupItemByStudentItems(
//       { pn: studentItems[0] },
//       [1],
//       { 1: { m1: admissionMetas[0] } },
//       { 1: "m1" }
//     );

//     expect(Object.keys(actualRes)).toContain("m1");
//     expect(actualRes["m1"].count).toBe(1);
//     expect(actualRes["m1"].limit).toBe(2);
//     expect(actualRes["m1"].valid).toBe(true);
//   });

//   it("creates mup items with 2 competition groups", () => {
//     const actualRes = createMupIdToMupItemByStudentItems(
//       { pn1: studentItems[0], pn2: studentItems[1] },
//       [1, 2],
//       { 1: { m1: admissionMetas[0] }, 2: { m1: admissionMetas[1] } },
//       { 1: "m1", 2: "m1" }
//     );

//     expect(Object.keys(actualRes)).toContain("m1");
//     expect(actualRes["m1"].count).toBe(2);
//     expect(actualRes["m1"].limit).toBe(2);
//     expect(actualRes["m1"].valid).toBe(true);
//   });

//   it("creates mup items with 2 competition groups adds count", () => {
//     const actualRes = createMupIdToMupItemByStudentItems(
//       { pn1: studentItems[0], pn2: studentItems[1] },
//       [1, 2],
//       {
//         1: { m1: { ...admissionMetas[0], count: 1 } },
//         2: { m1: { ...admissionMetas[1], count: 1 } },
//       },
//       { 1: "m1", 2: "m1" }
//     );

//     expect(Object.keys(actualRes)).toContain("m1");
//     expect(actualRes["m1"].count).toBe(2);
//     expect(actualRes["m1"].limit).toBe(2);
//     expect(actualRes["m1"].valid).toBe(true);
//   });
// });

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
/*
const personalNumberToStudentItem: {
  [key: string]: IStudentAdmissionDistributionItem;
} = {
  pn1: {
    currentZE: 0,
    admissionIds: [1, 2],
    selectedAdmissionIds: [],
    competitionGroupId: 1,
  },
  pn2: {
    currentZE: 0,
    admissionIds: [1, 2],
    selectedAdmissionIds: [],
    competitionGroupId: 1,
  },
};
const mupIdToMupItem: { [key: string]: IMupDistributionItem } = {
  m1: {
    limit: 2,
    count: 0,
  },
  m2: {
    limit: 2,
    count: 0,
  },
};
const mupIdsWithTestResultRequired: Set<string> = new Set<string>();
const competitionGroupIdToZELimit: { [key: number]: number } = {
  1: 6,
};
const personalNumbersSortedByRating: string[] = ["pn1", "pn2"];
const admissionIdToMupId: { [key: number]: string } = {
  1: "m1",
  2: "m2",
};
const admissionInfo: AdmissionInfo = {
  1: {
    pn1: {
      admissionId: 1,
      priority: 1,
      testResult: null,
      status: 0,
    },
    pn2: {
      admissionId: 1,
      priority: 1,
      testResult: null,
      status: 0,
    },
  },
  2: {
    pn1: {
      admissionId: 2,
      priority: 1,
      testResult: null,
      status: 0,
    },
    pn2: {
      admissionId: 2,
      priority: 1,
      testResult: null,
      status: 0,
    },
  },
};


describe("tryDistributeMupsByStudentRatingAndAdmissionPriority", () => {
  it("distributes", () => {
    const testPersonalNumberToStudentItem = cloneObject(
      personalNumberToStudentItem
    );
    const testMupIdToMupItem = cloneObject(mupIdToMupItem);

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      testPersonalNumberToStudentItem,
      testMupIdToMupItem,
      mupIdsWithTestResultRequired,
      competitionGroupIdToZELimit,
      personalNumbersSortedByRating,
      mupData,
      admissionIdToMupId,
      admissionInfo
    );

    for (const pn of ["pn1", "pn2"]) {
      expect(testPersonalNumberToStudentItem[pn].currentZE).toBe(6);
      expect(testPersonalNumberToStudentItem[pn].admissionIds).toContain(1);
      expect(testPersonalNumberToStudentItem[pn].admissionIds).toContain(2);
      expect(
        testPersonalNumberToStudentItem[pn].selectedAdmissionIds
      ).toContain(1);
      expect(
        testPersonalNumberToStudentItem[pn].selectedAdmissionIds
      ).toContain(2);
    }

    for (const mId of ["m1", "m2"]) {
      expect(testMupIdToMupItem[mId].count).toBe(2);
      expect(testMupIdToMupItem[mId].limit).toBe(2);
    }
  });

  it("takes into account mup limits", () => {
    const testPersonalNumberToStudentItem = cloneObject(
      personalNumberToStudentItem
    );
    const testMupIdToMupItem = cloneObject(mupIdToMupItem);
    testMupIdToMupItem["m1"].limit = 1;

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      testPersonalNumberToStudentItem,
      testMupIdToMupItem,
      mupIdsWithTestResultRequired,
      competitionGroupIdToZELimit,
      personalNumbersSortedByRating,
      mupData,
      admissionIdToMupId,
      admissionInfo
    );

    const pn1 = "pn1";
    const pn2 = "pn2";

    expect(testPersonalNumberToStudentItem[pn1].currentZE).toBe(6);
    expect(testPersonalNumberToStudentItem[pn1].selectedAdmissionIds).toContain(
      1
    );
    expect(testPersonalNumberToStudentItem[pn1].selectedAdmissionIds).toContain(
      2
    );

    expect(testPersonalNumberToStudentItem[pn2].currentZE).toBe(3);
    expect(
      testPersonalNumberToStudentItem[pn2].selectedAdmissionIds.length
    ).toBe(1);
    expect(testPersonalNumberToStudentItem[pn2].selectedAdmissionIds).toContain(
      2
    );
  });

  it("takes into account student ze", () => {
    const testPersonalNumberToStudentItem = cloneObject(
      personalNumberToStudentItem
    );
    testPersonalNumberToStudentItem["pn1"].currentZE = 3;
    const testMupIdToMupItem = cloneObject(mupIdToMupItem);

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      testPersonalNumberToStudentItem,
      testMupIdToMupItem,
      mupIdsWithTestResultRequired,
      competitionGroupIdToZELimit,
      personalNumbersSortedByRating,
      mupData,
      admissionIdToMupId,
      admissionInfo
    );

    const pn1 = "pn1";
    const pn2 = "pn2";

    expect(testPersonalNumberToStudentItem[pn1].currentZE).toBe(6);
    expect(testPersonalNumberToStudentItem[pn1].selectedAdmissionIds).toContain(
      1
    );

    expect(testPersonalNumberToStudentItem[pn2].currentZE).toBe(6);
    expect(
      testPersonalNumberToStudentItem[pn2].selectedAdmissionIds.length
    ).toBe(2);
    expect(testPersonalNumberToStudentItem[pn2].selectedAdmissionIds).toContain(
      1
    );
    expect(testPersonalNumberToStudentItem[pn2].selectedAdmissionIds).toContain(
      2
    );

    expect(testMupIdToMupItem["m1"].count).toBe(2);
    expect(testMupIdToMupItem["m2"].count).toBe(1);
  });

  it("takes into account student order", () => {
    const testPersonalNumberToStudentItem = cloneObject(
      personalNumberToStudentItem
    );
    const testMupIdToMupItem = cloneObject(mupIdToMupItem);
    testMupIdToMupItem["m1"].limit = 1;

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      testPersonalNumberToStudentItem,
      testMupIdToMupItem,
      mupIdsWithTestResultRequired,
      competitionGroupIdToZELimit,
      ["pn2", "pn1"],
      mupData,
      admissionIdToMupId,
      admissionInfo
    );

    const pn1 = "pn1";
    const pn2 = "pn2";

    expect(testPersonalNumberToStudentItem[pn2].currentZE).toBe(6);
    expect(testPersonalNumberToStudentItem[pn1].currentZE).toBe(3);
    expect(
      testPersonalNumberToStudentItem[pn2].selectedAdmissionIds.length
    ).toBe(2);
    expect(
      testPersonalNumberToStudentItem[pn1].selectedAdmissionIds.length
    ).toBe(1);
  });

  it("takes into account priority", () => {
    const testPersonalNumberToStudentItem = cloneObject(
      personalNumberToStudentItem
    );
    testPersonalNumberToStudentItem["pn1"].admissionIds = [2, 1];
    testPersonalNumberToStudentItem["pn2"].admissionIds = [1, 2];
    const testMupIdToMupItem = cloneObject(mupIdToMupItem);
    testMupIdToMupItem["m1"].limit = 1;
    testMupIdToMupItem["m2"].limit = 1;

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      testPersonalNumberToStudentItem,
      testMupIdToMupItem,
      mupIdsWithTestResultRequired,
      { 1: 3 },
      personalNumbersSortedByRating,
      mupData,
      admissionIdToMupId,
      admissionInfo
    );

    const pn1 = "pn1";
    const pn2 = "pn2";

    expect(testPersonalNumberToStudentItem[pn1].currentZE).toBe(3);
    expect(testPersonalNumberToStudentItem[pn2].currentZE).toBe(3);
    expect(
      testPersonalNumberToStudentItem[pn1].selectedAdmissionIds.length
    ).toBe(1);
    expect(
      testPersonalNumberToStudentItem[pn2].selectedAdmissionIds.length
    ).toBe(1);
    expect(testPersonalNumberToStudentItem[pn1].selectedAdmissionIds).toContain(
      2
    );
    expect(testPersonalNumberToStudentItem[pn2].selectedAdmissionIds).toContain(
      1
    );
  });

  it("takes into account test result required", () => {
    const testPersonalNumberToStudentItem = cloneObject(
      personalNumberToStudentItem
    );
    const testMupIdToMupItem = cloneObject(mupIdToMupItem);
    const testAdmissionInfo = cloneObject(admissionInfo);
    testAdmissionInfo[1]["pn1"]!.testResult = 1;

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      testPersonalNumberToStudentItem,
      testMupIdToMupItem,
      new Set<string>(["m1"]),
      competitionGroupIdToZELimit,
      personalNumbersSortedByRating,
      mupData,
      admissionIdToMupId,
      testAdmissionInfo
    );

    const pn1 = "pn1";
    const pn2 = "pn2";

    expect(testPersonalNumberToStudentItem[pn1].currentZE).toBe(6);
    expect(testPersonalNumberToStudentItem[pn2].currentZE).toBe(3);
    expect(testPersonalNumberToStudentItem[pn1].selectedAdmissionIds).toContain(
      1
    );
    expect(testPersonalNumberToStudentItem[pn1].selectedAdmissionIds).toContain(
      2
    );
    expect(
      testPersonalNumberToStudentItem[pn2].selectedAdmissionIds.length
    ).toBe(1);
    expect(testPersonalNumberToStudentItem[pn1].selectedAdmissionIds).toContain(
      2
    );
  });

  it("distributes students from different competition groups", () => {
    const testPersonalNumberToStudentItem: {
      [key: string]: IStudentAdmissionDistributionItem;
    } = {
      pn1: {
        currentZE: 0,
        admissionIds: [1, 2],
        selectedAdmissionIds: [],
        competitionGroupId: 1,
      },
      pn2: {
        currentZE: 0,
        admissionIds: [3, 4],
        selectedAdmissionIds: [],
        competitionGroupId: 2,
      },
    };
    const testMupIdToMupItem: { [key: string]: IMupDistributionItem } = {
      m1: {
        limit: 2,
        count: 0,
      },
      m2: {
        limit: 2,
        count: 0,
      },
    };
    const testMupIdsWithTestResultRequired: Set<string> = new Set<string>();
    const testCompetitionGroupIdToZELimit: { [key: number]: number } = {
      1: 6,
      2: 6,
    };
    const testPersonalNumbersSortedByRating: string[] = ["pn1", "pn2"];
    const testAdmissionIdToMupId: { [key: number]: string } = {
      1: "m1",
      2: "m2",
      3: "m1",
      4: "m2",
    };
    const testAdmissionInfo: AdmissionInfo = {
      1: {
        pn1: {
          admissionId: 1,
          priority: 1,
          testResult: null,
          status: 0,
        },
      },
      2: {
        pn1: {
          admissionId: 2,
          priority: 1,
          testResult: null,
          status: 0,
        },
      },
      3: {
        pn2: {
          admissionId: 3,
          priority: 1,
          testResult: null,
          status: 0,
        },
      },
      4: {
        pn2: {
          admissionId: 2,
          priority: 1,
          testResult: null,
          status: 0,
        },
      },
    };

    tryDistributeMupsByStudentRatingAndAdmissionPriority(
      testPersonalNumberToStudentItem,
      testMupIdToMupItem,
      testMupIdsWithTestResultRequired,
      testCompetitionGroupIdToZELimit,
      testPersonalNumbersSortedByRating,
      mupData,
      testAdmissionIdToMupId,
      testAdmissionInfo
    );

    expect(testPersonalNumberToStudentItem["pn1"].currentZE).toBe(6);
    expect(testPersonalNumberToStudentItem["pn2"].currentZE).toBe(6);
    expect(
      testPersonalNumberToStudentItem["pn1"].selectedAdmissionIds
    ).toContain(1);
    expect(
      testPersonalNumberToStudentItem["pn1"].selectedAdmissionIds
    ).toContain(2);
    expect(
      testPersonalNumberToStudentItem["pn2"].selectedAdmissionIds
    ).toContain(3);
    expect(
      testPersonalNumberToStudentItem["pn2"].selectedAdmissionIds
    ).toContain(4);
  });
});

describe("addRandomMupsForStudentIfNeeded", () => {
  const personalNumberToStudentItem: {
    [key: string]: IStudentAdmissionDistributionItem;
  } = {
    pn1: {
      currentZE: 0,
      admissionIds: [],
      selectedAdmissionIds: [],
      competitionGroupId: 1,
    },
    pn2: {
      currentZE: 0,
      admissionIds: [],
      selectedAdmissionIds: [],
      competitionGroupId: 1,
    },
  };
  const admissionInfo: AdmissionInfo = {
    1: {
      pn1: {
        admissionId: 1,
        priority: null,
        testResult: null,
        status: 0,
      },
      pn2: {
        admissionId: 1,
        priority: 1,
        testResult: null,
        status: 0,
      },
    },
    2: {
      pn1: {
        admissionId: 2,
        priority: 1,
        testResult: null,
        status: 0,
      },
      pn2: {
        admissionId: 2,
        priority: 1,
        testResult: null,
        status: 0,
      },
    },
  };

  const competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions = {
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
    },
  };

  const personalNumberToAdmittedMupNames: { [key: string]: Set<string> } = {
    pn1: new Set<string>(["M1"]),
  };
  it("adds missing mups", () => {
    const testPersonalNumberToStudentItem = cloneObject(
      personalNumberToStudentItem
    );
    const testMupIdToMupItem = cloneObject(mupIdToMupItem);

    addRandomMupsForStudentIfNeeded(
      personalNumbersSortedByRating,
      testPersonalNumberToStudentItem,
      testMupIdToMupItem,
      mupIdsWithTestResultRequired,
      competitionGroupIdToZELimit,
      personalNumberToAdmittedMupNames,
      admissionIdToMupId,
      mupData,
      competitionGroupIdToMupAdmissions,
      admissionInfo
    );

    expect(testPersonalNumberToStudentItem["pn1"].currentZE).toBe(3);
    expect(
      testPersonalNumberToStudentItem["pn1"].selectedAdmissionIds.length
    ).toBe(1);

    expect(testPersonalNumberToStudentItem["pn2"].currentZE).toBe(6);
    expect(
      testPersonalNumberToStudentItem["pn2"].selectedAdmissionIds
    ).toContain(2);
  });

  it("takes into account current admitted mups", () => {
    const testPersonalNumberToStudentItem = cloneObject(
      personalNumberToStudentItem
    );
    const testMupIdToMupItem = cloneObject(mupIdToMupItem);

    testMupIdToMupItem["m2"].limit = 0;

    testPersonalNumberToStudentItem["pn1"].currentZE = 3;
    testPersonalNumberToStudentItem["pn1"].admissionIds = [1];
    testPersonalNumberToStudentItem["pn1"].selectedAdmissionIds = [1];

    addRandomMupsForStudentIfNeeded(
      personalNumbersSortedByRating,
      testPersonalNumberToStudentItem,
      testMupIdToMupItem,
      mupIdsWithTestResultRequired,
      competitionGroupIdToZELimit,
      {},
      admissionIdToMupId,
      mupData,
      competitionGroupIdToMupAdmissions,
      admissionInfo
    );

    expect(testPersonalNumberToStudentItem["pn1"].currentZE).toBe(3);
    expect(
      testPersonalNumberToStudentItem["pn1"].selectedAdmissionIds.length
    ).toBe(1);

    expect(testPersonalNumberToStudentItem["pn2"].currentZE).toBe(3);
    expect(
      testPersonalNumberToStudentItem["pn2"].selectedAdmissionIds
    ).toContain(1);
  });
});
*/

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
