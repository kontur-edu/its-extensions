import { ActionType } from "../common/actions";
import { ISubgroup, ISubgroupMeta } from "../common/types";
import {
  checkMupsAndLoadsCompatible,
  checkSubgroupsCreated,
  createSubgroupReferenceInfoFromCompetitionGroup,
  generateUpdateSubgroupActions,
  getDiffMessagesBySubgroupReferenceInfo,
  ISubgroupReferenceInfo,
} from "../components/SemesterPreparation/CompetitionGroupSync/utils";
import { UpdateSubgroupAction } from "../subgroupUpdater/actions";

const subgroupMetas: ISubgroupMeta[] = [
  {
    id: 1,
    count: 1,
    discipline: "M1",
    load: "лекции",
  },
  {
    id: 2,
    count: 1,
    discipline: "M2",
    load: "лекции",
  },
];

const subgroups: ISubgroup[] = [
  {
    id: 1,
    name: "",
    limit: 10,
    teacherId: null,
    description: "",
    mupId: "m1",
    mupName: "M1",
    count: 0,
    number: 1,
    load: "лекции",
  },
];

const referenceInfos: ISubgroupReferenceInfo[] = [
  {
    M1: {
      лекции: {
        subgroupInfo: [
          {
            teacher: undefined,
            limit: 15,
          },
        ],
        count: 1,
      },
    },
  },
  {
    M1: {
      лекции: {
        subgroupInfo: [],
        count: 1,
      },
    },
  },
  {
    M1: {
      лекции2: {
        subgroupInfo: [],
        count: 1,
      },
    },
  },
];

describe("createSubgroupReferenceInfoFromCompetitionGroup", () => {
  it("creates subgroupReferenceInfo", () => {
    const actualRes = createSubgroupReferenceInfoFromCompetitionGroup(
      { M1: "m1" },
      subgroupMetas,
      [1],
      { data: { 1: subgroups[0] } }
    );
    // console.log(JSON.stringify(actualRes, null, 2));
    const mupNames = Object.keys(actualRes);
    expect(mupNames.length).toBe(1);
    expect(actualRes["M1"]).toBeTruthy();
    expect(actualRes["M1"]["лекции"]).toBeTruthy();
    expect(actualRes["M1"]["лекции"].subgroupInfo.length).toBe(1);
    expect(actualRes["M1"]["лекции"].subgroupInfo[0].limit).toBe(
      subgroups[0].limit
    );
  });

  it("creates subgroupReferenceInfo with 2 subgroups", () => {
    const actualRes = createSubgroupReferenceInfoFromCompetitionGroup(
      { M1: "m1" },
      subgroupMetas,
      [1, 2],
      { data: { 1: subgroups[0], 2: { ...subgroups[0], number: 2 } } }
    );
    // console.log("actualRes");
    // console.log(JSON.stringify(actualRes, null, 2));
    const mupNames = Object.keys(actualRes);
    expect(mupNames.length).toBe(1);
    expect(actualRes["M1"]).toBeTruthy();
    expect(actualRes["M1"]["лекции"]).toBeTruthy();
    expect(actualRes["M1"]["лекции"].subgroupInfo.length).toBe(2);
    expect(actualRes["M1"]["лекции"].subgroupInfo[0].limit).toBe(
      subgroups[0].limit
    );
    expect(actualRes["M1"]["лекции"].subgroupInfo[1].limit).toBe(
      subgroups[0].limit
    );
  });

  it("creates subgroupReferenceInfo with no subgroups", () => {
    const actualRes = createSubgroupReferenceInfoFromCompetitionGroup(
      { M1: "m1" },
      subgroupMetas,
      [],
      { data: {} }
    );
    // console.log("actualRes");
    // console.log(JSON.stringify(actualRes, null, 2));
    const mupNames = Object.keys(actualRes);
    expect(mupNames.length).toBe(1);
    expect(actualRes["M1"]).toBeTruthy();
    expect(actualRes["M1"]["лекции"]).toBeTruthy();
    expect(actualRes["M1"]["лекции"].subgroupInfo.length).toBe(0);
  });
});

describe("checkSubgroupsCreated", () => {
  it("returns true if created", () => {
    const actualRes = checkSubgroupsCreated(
      referenceInfos[0],
      referenceInfos[0]
    );
    expect(actualRes).toBeTruthy();
  });

  it("returns false if not created", () => {
    const actualRes = checkSubgroupsCreated(
      referenceInfos[0],
      referenceInfos[1]
    );
    expect(actualRes).toBeFalsy();
  });
});

describe("checkMupsAndLoadsCompatible", () => {
  it("returns true if compatible", () => {
    const actualRes = checkMupsAndLoadsCompatible(
      referenceInfos[0],
      referenceInfos[1]
    );
    expect(actualRes).toBeTruthy();
  });

  it("returns false if not compatible by load", () => {
    const actualRes = checkMupsAndLoadsCompatible(
      referenceInfos[0],
      referenceInfos[2]
    );
    expect(actualRes).toBeFalsy();
  });

  it("returns false if not compatible by mupName", () => {
    const actualRes = checkMupsAndLoadsCompatible(referenceInfos[0], {
      M2: referenceInfos[0]["M1"],
    });
    expect(actualRes).toBeFalsy();
  });
});

describe("generateUpdateSubgroupActions", () => {
  it("action if have differences", () => {
    const referenceInfo = {
      M1: {
        лекции: {
          subgroupInfo: [
            {
              teacher: "t1",
              limit: 15,
            },
          ],
          count: 1,
        },
      },
    };
    const currentInfo = {
      M1: {
        лекции: {
          subgroupInfo: [
            {
              teacher: undefined,
              limit: 20,
            },
          ],
          count: 1,
        },
      },
    };
    const actualRes = generateUpdateSubgroupActions(
      1,
      referenceInfo,
      currentInfo,
      { M1: "m1" },
      subgroupMetas
    );

    expect(actualRes.length).toBe(1);
    expect(actualRes[0].actionType).toBe(ActionType.UpdateSubgroup);
    const updateSubgroupAction = actualRes[0] as UpdateSubgroupAction;

    expect(updateSubgroupAction.limit).toBe(15);
    expect(updateSubgroupAction.teacherId).toBe("t1");
  });

  it("action if have not created subgroups", () => {
    const referenceInfo = {
      M1: {
        лекции: {
          subgroupInfo: [
            {
              teacher: "t1",
              limit: 15,
            },
            {
              teacher: "t1",
              limit: 15,
            },
          ],
          count: 2,
        },
      },
    };
    const currentInfo = {
      M1: {
        лекции: {
          subgroupInfo: [
            {
              teacher: undefined,
              limit: 20,
            },
          ],
          count: 1,
        },
      },
    };
    const actualRes = generateUpdateSubgroupActions(
      1,
      referenceInfo,
      currentInfo,
      { M1: "m1" },
      subgroupMetas
    );

    expect(actualRes.length).toBe(2);
  });

  it("no actions if same", () => {
    const actualRes = generateUpdateSubgroupActions(
      1,
      referenceInfos[0],
      referenceInfos[0],
      { M1: "m1" },
      subgroupMetas
    );

    expect(actualRes.length).toBe(0);
  });
});

function cloneObject<T>(obj: T) {
  return JSON.parse(JSON.stringify(obj)) as T;
}
describe("getDiffMessagesBySubgroupReferenceInfo", () => {
  it("returns no messages same", () => {
    const actualRes = getDiffMessagesBySubgroupReferenceInfo(1, [2], {
      1: referenceInfos[0],
      2: referenceInfos[0],
    });
    expect(actualRes["M1"].length).toBe(0);
  });

  it("returns message on different subgroup count", () => {
    const referenceInfo = referenceInfos[0];
    const currentInfo = cloneObject(referenceInfo);
    currentInfo["M1"]["лекции"].count = 0;
    currentInfo["M1"]["лекции"].subgroupInfo = [];
    const actualRes = getDiffMessagesBySubgroupReferenceInfo(1, [2], {
      1: referenceInfo,
      2: currentInfo,
    });
    expect(actualRes["M1"].length).toBe(2);
    const messages = actualRes["M1"].join().toLocaleLowerCase();
    expect(messages.includes("подгрупп")).toBeTruthy();
  });

  it("returns message on different subgroup limits", () => {
    const referenceInfo = referenceInfos[0];
    const currentInfo = cloneObject(referenceInfo);
    currentInfo["M1"]["лекции"].subgroupInfo[0].limit! += 1;
    const actualRes = getDiffMessagesBySubgroupReferenceInfo(1, [2], {
      1: referenceInfo,
      2: currentInfo,
    });
    // console.log(JSON.stringify(actualRes, null, 2));
    expect(actualRes["M1"].length).toBe(1);
    expect(
      actualRes["M1"][0].toLocaleLowerCase().includes("лимит")
    ).toBeTruthy();
  });

  it("returns message on different subgroup teachers", () => {
    const referenceInfo = referenceInfos[0];
    const currentInfo = cloneObject(referenceInfo);
    currentInfo["M1"]["лекции"].subgroupInfo[0].teacher = "t2";
    const actualRes = getDiffMessagesBySubgroupReferenceInfo(1, [2], {
      1: referenceInfo,
      2: currentInfo,
    });
    expect(actualRes["M1"].length).toBe(1);
    expect(
      actualRes["M1"][0].toLocaleLowerCase().includes("преподавател")
    ).toBeTruthy();
  });
});
