import {
  MupToLoadToSubgroupMembership,
  ISubgroupMeta,
  IMup,
  IMupData,
  ISubgoupDiffInfo,
  IStudentData,
  IStudent,
  IStudentSubgroupMembership,
  ICompetitionGroupToSubgroupMetas,
} from "../common/types";
import {
  checkSubgroupMetaCountsAreSame,
  createMupToLoadToSubgroupMembership,
  getLoadsForMup,
  trySubstituteLoadWildcards,
  trySubstituteMupShortNamesWithFullNames,
  validateSubgroupMembership,
} from "../subgroupMembership/subgroupMembershipParser";
import {
  createSubgroupMembershipActions,
  createSubgroupMembershipActionsForOneGroupPerLoadDistribution,
} from "../subgroupMembership/actionCreator";
import { ActionType } from "../common/actions";
import { UpdateMembershipAction } from "../subgroupMembership/actions";

const subgroupMetas: ISubgroupMeta[] = [
  {
    id: 1,
    count: 1,
    discipline: "M1",
    load: "load_1",
  },
];

describe("checkSubgroupMetaCountsAreSame", () => {
  it("returns true if the same", () => {
    const actualRes = checkSubgroupMetaCountsAreSame("M1", "load_1", [1, 2], {
      subgroupAndMetaAreSameDiffs: {},
      subgroupDiffs: {},
      metaDiffs: {
        M1: {
          1: { load_1: subgroupMetas[0] },
          2: { load_1: subgroupMetas[0] },
        },
      },
    });
    expect(actualRes).toBeTruthy();
  });
  it("returns true if one group", () => {
    const actualRes = checkSubgroupMetaCountsAreSame("M1", "load_1", [1], {
      subgroupAndMetaAreSameDiffs: {},
      subgroupDiffs: {},
      metaDiffs: { M1: { 1: { load_1: subgroupMetas[0] } } },
    });
    expect(actualRes).toBeTruthy();
  });

  it("returns false if different", () => {
    const actualRes = checkSubgroupMetaCountsAreSame("M1", "load_1", [1, 2], {
      subgroupAndMetaAreSameDiffs: {},
      subgroupDiffs: {},
      metaDiffs: {
        M1: {
          1: { load_1: subgroupMetas[0] },
          2: { load_1: { ...subgroupMetas[0], count: 2 } },
        },
      },
    });
    expect(actualRes).toBeFalsy();
  });
});

describe("getLoadsForMup", () => {
  it("returns all loads", () => {
    const actualRes = getLoadsForMup("M1", [1, 2], {
      subgroupAndMetaAreSameDiffs: {},
      subgroupDiffs: {},
      metaDiffs: {
        M1: {
          1: { load_1: subgroupMetas[0] },
          2: { load_2: { ...subgroupMetas[0], discipline: "load_2" } },
        },
      },
    });
    expect(actualRes).toContain("load_1");
    expect(actualRes).toContain("load_2");
  });
});

const mups: IMup[] = [
  {
    id: "m1",
    name: "M1",
    shortName: "Short1",
    ze: 3,
    teacherIds: [],
  },
  {
    id: "m2",
    name: "M2",
    shortName: "Short2",
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

const mupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership = {
  Short1: {
    load_1: [["pn1", "pn2"]],
  },
  M2: {
    load_1: [["pn1", "pn2"]],
  },
};

describe("trySubstituteMupShortNamesWithFullNames", () => {
  it("substitutes", () => {
    const actualRes = trySubstituteMupShortNamesWithFullNames(
      mupToLoadToSubgroupMembership,
      mupData
    );
    const mupNames = Object.keys(actualRes);
    expect(mupNames.length).toBe(2);
    expect(mupNames).toContain("M1");
    expect(mupNames).toContain("M2");
    expect(actualRes["M1"]["load_1"][0]).toContain("pn1");
    expect(actualRes["M1"]["load_1"][0]).toContain("pn2");
    expect(actualRes["M2"]["load_1"][0]).toContain("pn2");
    expect(actualRes["M2"]["load_1"][0]).toContain("pn2");
  });
});

describe("trySubstituteLoadWildcards", () => {
  const subgoupDiffInfo: ISubgoupDiffInfo = {
    subgroupAndMetaAreSameDiffs: {},
    subgroupDiffs: {},
    metaDiffs: {
      M1: {
        1: { load_1: subgroupMetas[0] },
        2: { load_2: { ...subgroupMetas[0], load: "load_2" } },
      },
    },
  };
  it("substitutes wildcards", () => {
    const actualRes = trySubstituteLoadWildcards(
      { M1: { "*": [["pn1", "pn2"]] } },
      [1, 2],
      subgoupDiffInfo
    );
    const loadNames = Object.keys(actualRes["M1"]);
    expect(loadNames.length).toBe(2);
    expect(loadNames).toContain("load_1");
    expect(loadNames).toContain("load_2");
    expect(actualRes["M1"]["load_1"][0]).toContain("pn1");
    expect(actualRes["M1"]["load_1"][0]).toContain("pn2");
    expect(actualRes["M1"]["load_2"][0]).toContain("pn1");
    expect(actualRes["M1"]["load_2"][0]).toContain("pn2");
  });
  it("not substitutes not wildcards", () => {
    const actualRes = trySubstituteLoadWildcards(
      { M1: { load_1: [["pn1", "pn2"]] } },
      [1, 2],
      subgoupDiffInfo
    );
    const loadNames = Object.keys(actualRes["M1"]);
    expect(loadNames.length).toBe(1);
    expect(loadNames).toContain("load_1");
    expect(actualRes["M1"]["load_1"][0]).toContain("pn1");
    expect(actualRes["M1"]["load_1"][0]).toContain("pn2");
  });
});

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

describe("validateSubgroupMembership", () => {
  const subgoupDiffInfo: ISubgoupDiffInfo = {
    subgroupAndMetaAreSameDiffs: {},
    subgroupDiffs: {},
    metaDiffs: {},
  };

  const studentData: IStudentData = {
    ids: ["pn1", "pn2"],
    data: {
      pn1: students[0],
      pn2: { ...students[0], personalNumber: "pn2", competitionGroupId: 2 },
    },
  };

  it("success on correct", () => {
    const testSubgroupDiffInfo: ISubgoupDiffInfo = {
      ...subgoupDiffInfo,
      metaDiffs: {
        M1: {
          1: { load_1: subgroupMetas[0] },
          2: { load_1: subgroupMetas[0] },
        },
      },
    };
    const actualRes = validateSubgroupMembership(
      [1, 2],
      { M1: { "*": [["pn1", "pn2"]] } },
      testSubgroupDiffInfo,
      studentData
    );

    expect(actualRes.success).toBeTruthy();

    const actualRes2 = validateSubgroupMembership(
      [1, 2],
      { M1: { load_1: [["pn1", "pn2"]] } },
      testSubgroupDiffInfo,
      studentData
    );

    expect(actualRes2.success).toBeTruthy();
  });

  it("fail on different groups", () => {
    const actualRes = validateSubgroupMembership(
      [1, 2],
      { M1: { load_1: [["pn1", "pn2"]] } },
      {
        ...subgoupDiffInfo,
        metaDiffs: {
          M1: {
            1: { load_1: subgroupMetas[0] },
            2: { load_1: { ...subgroupMetas[0], count: 2 } },
          },
        },
      },
      studentData
    );

    expect(actualRes.success).toBeFalsy();
  });

  it("fail if unknown load", () => {
    const actualRes = validateSubgroupMembership(
      [1, 2],
      { M1: { unknown1: [["pn1", "pn2"]] } },
      {
        ...subgoupDiffInfo,
        metaDiffs: {
          M1: {
            1: { load_1: subgroupMetas[0] },
            2: { load_1: subgroupMetas[0] },
          },
        },
      },
      studentData
    );

    expect(actualRes.success).toBe(false);
  });

  it("fail if unknown students", () => {
    const actualRes = validateSubgroupMembership(
      [1, 2],
      { M1: { load_1: [["unknown1"]] } },
      {
        ...subgoupDiffInfo,
        metaDiffs: {
          M1: {
            1: { load_1: subgroupMetas[0] },
            2: { load_1: subgroupMetas[0] },
          },
        },
      },
      studentData
    );

    expect(actualRes.success).toBe(false);
  });

  it("fail if wrong subgroup count", () => {
    const actualRes = validateSubgroupMembership(
      [1, 2],
      { M1: { load_1: [["pn1"], ["pn2"]] } },
      {
        ...subgoupDiffInfo,
        metaDiffs: {
          M1: {
            1: { load_1: subgroupMetas[0] },
            2: { load_1: subgroupMetas[0] },
          },
        },
      },
      studentData
    );

    expect(actualRes.success).toBe(false);
  });
});

describe("createMupToLoadToSubgroupMembership", () => {
  const loadToMeta: { [key: string]: ISubgroupMeta } = {
    load1: { ...subgroupMetas[0], count: 2 },
    load2: { ...subgroupMetas[0], load: "load_2" },
  };
  const cgIdToLoadNumberToSubgroupIds: {
    [key: number]: { [key: string]: number };
  } = {
    1: {
      load1_1: 1,
      load1_2: 2,
      load2_1: 3,
    },
    2: {
      load1_1: 4,
      load1_2: 5,
      load2_1: 6,
    },
  };
  const subgroupDiffInfo: ISubgoupDiffInfo = {
    subgroupAndMetaAreSameDiffs: {},
    subgroupDiffs: {
      M1: cgIdToLoadNumberToSubgroupIds,
    },
    metaDiffs: {
      M1: {
        1: loadToMeta,
        2: loadToMeta,
      },
    },
  };
  it("creates", () => {
    const subgroupIdToStudentSubgroupMembership = {
      1: [{ studentId: "s1", included: true }],
      2: [{ studentId: "s1", included: false }],
      3: [{ studentId: "s1", included: true }],
      4: [{ studentId: "s2", included: false }],
      5: [{ studentId: "s2", included: true }],
      6: [{ studentId: "s2", included: true }],
    };
    const actualRes = createMupToLoadToSubgroupMembership(
      ["M1"],
      [1, 2],
      subgroupDiffInfo,
      subgroupIdToStudentSubgroupMembership,
      { s1: "pn1", s2: "pn2" }
    );

    expect(Object.keys(actualRes)).toContain("M1");
    const loads = Object.keys(actualRes["M1"]);
    expect(loads).toContain("load1");
    expect(loads).toContain("load2");
    expect(actualRes["M1"]["load1"].length).toBe(2);
    expect(actualRes["M1"]["load2"].length).toBe(1);
    expect(actualRes["M1"]["load1"][0].length).toBe(1);
    expect(actualRes["M1"]["load1"][1].length).toBe(1);
    expect(actualRes["M1"]["load1"][0]).toContain("pn1");
    expect(actualRes["M1"]["load1"][1]).toContain("pn2");
    expect(actualRes["M1"]["load2"][0]).toContain("pn1");
    expect(actualRes["M1"]["load2"][0]).toContain("pn2");
  });
});

describe("createSubgroupMembershipActionsForOneGroupPerLoadDistribution", () => {
  it("adds student to subgroups with one group", () => {
    const loadToMeta: { [key: string]: ISubgroupMeta } = {
      load1: { ...subgroupMetas[0], load: "load1" },
      load2: { ...subgroupMetas[0], load: "load2" },
    };
    const cgIdToLoadNumberToSubgroupIds: {
      [key: number]: { [key: string]: number };
    } = {
      1: {
        load1_1: 1,
        load2_1: 2,
      },
      2: {
        load1_1: 3,
        load2_1: 4,
      },
    };
    const testSubgroupDiffInfo: ISubgoupDiffInfo = {
      subgroupAndMetaAreSameDiffs: {},
      subgroupDiffs: {
        M1: cgIdToLoadNumberToSubgroupIds,
      },
      metaDiffs: {
        M1: {
          1: loadToMeta,
          2: loadToMeta,
        },
      },
    };
    const subgroupIdToStudentSubgroupMembership: {
      [key: number]: IStudentSubgroupMembership[];
    } = {
      1: [{ studentId: "s1", included: false }],
      2: [{ studentId: "s1", included: false }],
      3: [{ studentId: "s2", included: false }],
      4: [{ studentId: "s2", included: false }],
    };
    const competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas = {
      1: [loadToMeta["load1"], loadToMeta["load2"]],
      2: [loadToMeta["load1"], loadToMeta["load2"]],
    };
    const actualRes =
      createSubgroupMembershipActionsForOneGroupPerLoadDistribution(
        [1, 2],
        testSubgroupDiffInfo,
        competitionGroupToSubgroupMetas,
        subgroupIdToStudentSubgroupMembership
      );
    // console.log(JSON.stringify(actualRes));
    expect(actualRes.length).toBe(4);
    const subgroupIds = [];
    const studentIds = [];
    for (const action of actualRes) {
      expect(action.actionType).toBe(ActionType.UpdateMembership);
      const updateMembershipAction = action as UpdateMembershipAction;
      expect(updateMembershipAction.included).toBe(true);
      subgroupIds.push(updateMembershipAction.subgroupId);
      studentIds.push(updateMembershipAction.studentId);
    }
    expect(subgroupIds).toContain(1);
    expect(subgroupIds).toContain(2);
    expect(subgroupIds).toContain(3);
    expect(subgroupIds).toContain(4);
    expect(studentIds).toContain("s1");
    expect(studentIds).toContain("s2");
  });

  it("no actions if no loads with one group", () => {
    const loadToMeta: { [key: string]: ISubgroupMeta } = {
      load1: { ...subgroupMetas[0], load: "load1", count: 2 },
    };
    const cgIdToLoadNumberToSubgroupIds: {
      [key: number]: { [key: string]: number };
    } = {
      1: {
        load1_1: 1,
        load1_2: 2,
      },
      2: {
        load1_1: 3,
        load1_2: 4,
      },
    };
    const testSubgroupDiffInfo: ISubgoupDiffInfo = {
      subgroupAndMetaAreSameDiffs: {},
      subgroupDiffs: {
        M1: cgIdToLoadNumberToSubgroupIds,
      },
      metaDiffs: {
        M1: {
          1: loadToMeta,
          2: loadToMeta,
        },
      },
    };
    const subgroupIdToStudentSubgroupMembership: {
      [key: number]: IStudentSubgroupMembership[];
    } = {
      1: [{ studentId: "s1", included: false }],
      2: [{ studentId: "s1", included: false }],
      3: [{ studentId: "s2", included: false }],
      4: [{ studentId: "s2", included: false }],
    };
    const competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas = {
      1: [loadToMeta["load1"]],
      2: [loadToMeta["load1"]],
    };
    const actualRes =
      createSubgroupMembershipActionsForOneGroupPerLoadDistribution(
        [1, 2],
        testSubgroupDiffInfo,
        competitionGroupToSubgroupMetas,
        subgroupIdToStudentSubgroupMembership
      );
    expect(actualRes.length).toBe(0);
  });
});

describe("createSubgroupMembershipActions", () => {
  it("creates actions", () => {
    const loadToMeta: { [key: string]: ISubgroupMeta } = {
      load1: { ...subgroupMetas[0], load: "load1", count: 2 },
    };
    const cgIdToLoadNumberToSubgroupIds: {
      [key: number]: { [key: string]: number };
    } = {
      1: {
        load1_1: 1,
        load1_2: 2,
      },
      2: {
        load1_1: 3,
        load1_2: 4,
      },
    };
    const testSubgroupDiffInfo: ISubgoupDiffInfo = {
      subgroupAndMetaAreSameDiffs: {},
      subgroupDiffs: {
        M1: cgIdToLoadNumberToSubgroupIds,
      },
      metaDiffs: {
        M1: {
          1: loadToMeta,
          2: loadToMeta,
        },
      },
    };
    const subgroupIdToStudentSubgroupMembership: {
      [key: number]: IStudentSubgroupMembership[];
    } = {
      1: [{ studentId: "s1", included: false }],
      2: [{ studentId: "s1", included: false }],
      3: [{ studentId: "s2", included: false }],
      4: [{ studentId: "s2", included: false }],
    };

    const studentData: IStudentData = {
      ids: ["pn1", "pn2"],
      data: {
        pn1: students[0],
        pn2: {
          ...students[0],
          personalNumber: "pn2",
          competitionGroupId: 2,
          id: "s2",
        },
      },
    };

    const actualRes = createSubgroupMembershipActions(
      testSubgroupDiffInfo,
      { M1: { load1: [["pn1"], ["pn2"]] } },
      subgroupIdToStudentSubgroupMembership,
      studentData
    );

    expect(actualRes.length).toBe(2);
    const subgroupIds = [];
    const studentIds = [];
    for (const action of actualRes) {
      expect(action.actionType).toBe(ActionType.UpdateMembership);
      const updateMembershipAction = action as UpdateMembershipAction;
      expect(updateMembershipAction.included).toBe(true);
      subgroupIds.push(updateMembershipAction.subgroupId);
      studentIds.push(updateMembershipAction.studentId);
    }
    expect(subgroupIds).toContain(1);
    expect(subgroupIds).toContain(4);
    expect(studentIds).toContain("s1");
    expect(studentIds).toContain("s2");
  });
});
