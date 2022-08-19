import { ActionType } from "../common/actions";
import {
  IMup,
  IMupData,
  ISelectionGroupMup,
  ISelectionGroupToMupsData,
  ISubgroup,
  ISubgroupMeta,
} from "../common/types";
import {
  generateUpdateSubgroupCountToDefaultActions,
  generateUpdateTeacherAndLimitActions,
} from "../competitionGroupPreparation/actionCreator";
import { checkSubgroupsCreated } from "../competitionGroupPreparation/actionCreator";
import { ISubgroupReferenceInfo } from "../components/SemesterPreparation/CompetitionGroupSync/utils";
import {
  UpdateSubgroupAction,
  UpdateSubgroupMetaLoadCountAction,
} from "../subgroupUpdater/actions";

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
    limit: 0,
    teacherId: null,
    description: "",
    mupId: "",
    mupName: "",
    count: 0,
    number: 1,
    load: "лекции",
  },
];

describe("generateUpdateSubgroupCountToDefaultActions", () => {
  it("no actions if data is the same", () => {
    const actualRes = generateUpdateSubgroupCountToDefaultActions(
      1,
      new Set<string>(["M1", "M2"]),
      { 1: subgroupMetas }
    );

    expect(actualRes.length).toBe(0);
  });

  it("actions if selected has count 0", () => {
    const actualRes = generateUpdateSubgroupCountToDefaultActions(
      1,
      new Set<string>(["M1"]),
      { 1: [{ ...subgroupMetas[0], count: 0 }] }
    );

    expect(actualRes.length).toBe(1);
    expect(actualRes[0].actionType).toBe(
      ActionType.UpdateSubgroupMetaLoadCount
    );
    const updateSubgroupMetaLoadCountAction =
      actualRes[0] as UpdateSubgroupMetaLoadCountAction;
    expect(updateSubgroupMetaLoadCountAction.newCount).toBe(1);
  });

  it("actions if not selected has count not 0", () => {
    const actualRes = generateUpdateSubgroupCountToDefaultActions(
      1,
      new Set<string>(["M1"]),
      { 1: [{ ...subgroupMetas[1], count: 2 }] }
    );

    expect(actualRes.length).toBe(1);
    expect(actualRes[0].actionType).toBe(
      ActionType.UpdateSubgroupMetaLoadCount
    );
    const updateSubgroupMetaLoadCountAction =
      actualRes[0] as UpdateSubgroupMetaLoadCountAction;
    expect(updateSubgroupMetaLoadCountAction.newCount).toBe(0);
  });
});

describe("checkSubgroupsCreated", () => {
  it("returns false if no subgroups created", () => {
    const actualRes = checkSubgroupsCreated(
      1,
      { M1: "m1" },
      { 1: [subgroupMetas[0]] },
      { 1: [] },
      { data: {} }
    );

    expect(actualRes).toBe(false);
  });

  it("returns true if no subgroups created and no subgroups expected", () => {
    const actualRes = checkSubgroupsCreated(
      1,
      { M1: "m1" },
      { 1: [{ ...subgroupMetas[0], count: 0 }] },
      { 1: [] },
      { data: {} }
    );

    expect(actualRes).toBe(true);
  });

  it("returns false if not all subgroups present", () => {
    const actualRes = checkSubgroupsCreated(
      1,
      { M1: "m1" },
      { 1: [{ ...subgroupMetas[0], count: 2 }] },
      { 1: [1] },
      { data: { 1: subgroups[0] } }
    );

    expect(actualRes).toBe(false);
  });
});

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
        subgroupInfo: [
          {
            teacher: "t1",
            limit: 30,
          },
        ],
        count: 1,
      },
    },
  },
  {
    M1: {
      лекции: {
        subgroupInfo: [
          {
            teacher: "t1",
            limit: 15,
          },
          {
            teacher: "t2",
            limit: 20,
          },
        ],
        count: 2,
      },
    },
  },
];

const selectionGroupMups: ISelectionGroupMup[] = [
  {
    connectionId: 1,
    limit: 30,
    mupId: "m1",
  },
  {
    connectionId: 2,
    limit: 15,
    mupId: "m2",
  },
];

const selectionGroupMupData: ISelectionGroupToMupsData = {
  ids: [1, 2],
  data: {
    1: {
      ids: ["m1"],
      data: { m1: selectionGroupMups[0] },
    },
    2: {
      ids: ["m1", "m2"],
      data: { m1: selectionGroupMups[0], m2: selectionGroupMups[1] },
    },
  },
};

const mups: IMup[] = [
  {
    id: "m1",
    name: "M1",
    shortName: "M1",
    ze: 3,
    teacherIds: ["t1"],
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

describe("generateUpdateTeacherAndLimitActions", () => {
  it("action on changes", () => {
    const actualRes = generateUpdateTeacherAndLimitActions(
      1,
      1,
      { M1: "m1" },
      referenceInfos[0],
      mupData,
      selectionGroupMupData,
      { 1: subgroupMetas }
    );

    expect(actualRes.length).toBe(1);
    expect(actualRes[0].actionType).toBe(ActionType.UpdateSubgroup);
    const updateSubgroupAction = actualRes[0] as UpdateSubgroupAction;
    expect(updateSubgroupAction.limit).toBe(30);
    expect(updateSubgroupAction.teacherId).toBe("t1");
  });

  const testMetas: ISubgroupMeta[] = [
    {
      id: 1,
      count: 2,
      discipline: "M1",
      load: "лекции",
    },
  ];

  it("action on not created subgroup", () => {
    const actualRes = generateUpdateTeacherAndLimitActions(
      1,
      1,
      { M1: "m1" },
      referenceInfos[1],
      mupData,
      selectionGroupMupData,
      { 1: testMetas }
    );

    expect(actualRes.length).toBe(1);
    expect(actualRes[0].actionType).toBe(ActionType.UpdateSubgroup);
    const updateSubgroupAction = actualRes[0] as UpdateSubgroupAction;
    expect(updateSubgroupAction.limit).toBe(30);
    expect(updateSubgroupAction.teacherId).toBe("t1");
  });

  it("action on not created subgroup and changes", () => {
    const actualRes = generateUpdateTeacherAndLimitActions(
      1,
      1,
      { M1: "m1" },
      referenceInfos[0],
      mupData,
      selectionGroupMupData,
      { 1: testMetas }
    );

    expect(actualRes.length).toBe(2);
  });
});
