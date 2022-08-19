import {
  ISelectionGroupToMupsData,
  ISelectionGroupMup,
  IPeriod,
  IMupLoad,
  IModuleSelection,
  ISelectedModuleDisciplines,
  IMupData,
  IMup,
} from "../common/types";
import {
  checkIfNeedChangeDates,
  findInitLimits,
  checkIfCanBeDeleted,
  findCourseToCurrentPeriod,
  checkNeedModuleUpdateForConnectionId,
  checkIfNeedUpdateModules,
} from "../mupUpdater/mupDifference";

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

const loads: IMupLoad[] = [
  { id: 525, name: "экзамен", kmer: "prex" },
  { id: 526, name: "контрольная работа", kmer: "prkr" },
  { id: 527, name: "лекции", kmer: "tlekc" },
];

const periods: IPeriod[] = [
  {
    id: 1,
    year: 2022,
    semesterId: 0,
    course: 4,
    selectionBegin: "2022-08-29",
    selectionDeadline: "2022-09-12",
    loads: loads,
  },
  {
    id: 2,
    year: 2022,
    semesterId: 0,
    course: 3,
    selectionBegin: "2022-08-29",
    selectionDeadline: "2022-09-12",
    loads: loads,
  },
  {
    id: 3,
    year: 2022,
    semesterId: 1,
    course: 4,
    selectionBegin: "",
    selectionDeadline: "",
    loads: loads,
  },
  {
    id: 4,
    year: 2023,
    semesterId: 0,
    course: 3,
    selectionBegin: "",
    selectionDeadline: "",
    loads: loads,
  },
];

describe("findInitLimits", () => {
  it("finds no limits if no limits present", () => {
    const actualRes = findInitLimits("m3", [1, 2], selectionGroupMupData);
    expect(actualRes.every((l) => l === null)).toBeTruthy();
  });

  it("finds limits if limits present", () => {
    const actualRes = findInitLimits("m1", [1, 2], selectionGroupMupData);
    expect(
      actualRes.every((l) => l === selectionGroupMups[0].limit)
    ).toBeTruthy();
  });

  it("finds some limits if some limits present", () => {
    const actualRes = findInitLimits("m2", [1, 2], selectionGroupMupData);
    expect(actualRes.length).toBe(2);
    expect(actualRes[0]).toBe(null);
    expect(actualRes[1]).toBe(selectionGroupMups[1].limit);
  });
});

describe("checkIfNeedChangeDates", () => {
  it("no change if no periods", () => {
    const actualRes = checkIfNeedChangeDates({}, ["2022-08-29", "2022-09-12"]);

    expect(actualRes).toBeFalsy();
  });

  it("no change even if come period missing", () => {
    const actualRes = checkIfNeedChangeDates({ 3: periods[0] }, [
      "2022-08-29",
      "2022-09-12",
    ]);

    expect(actualRes).toBeFalsy();
  });

  it("no change on same date in period", () => {
    const actualRes = checkIfNeedChangeDates({ 3: periods[0], 4: periods[1] }, [
      "2022-08-29",
      "2022-09-12",
    ]);

    expect(actualRes).toBeFalsy();
  });

  it("change on different date in period", () => {
    const actualRes = checkIfNeedChangeDates({ 3: periods[0], 4: periods[1] }, [
      "2022-08-29",
      "2022-09-11",
    ]);

    expect(actualRes).toBeTruthy();
  });
});

describe("checkIfCanBeDeleted", () => {
  it("can be deleted if no periods", () => {
    const actualRes = checkIfCanBeDeleted({});

    expect(actualRes).toBeTruthy();
  });

  it("can be deleted if periods dates not set", () => {
    const p1 = {
      ...periods[0],
      selectionBegin: "",
      selectionDeadline: "",
    };
    const p2 = {
      ...periods[1],
      selectionBegin: "",
      selectionDeadline: "",
    };
    const actualRes = checkIfCanBeDeleted({ 3: p1, 4: p2 });

    expect(actualRes).toBeTruthy();
  });

  it("can be deleted if periods dates higher", () => {
    const p1 = {
      ...periods[0],
      selectionBegin: "2122-08-29",
      selectionDeadline: "2122-09-12",
    };
    const p2 = {
      ...periods[1],
      selectionBegin: "2122-08-29",
      selectionDeadline: "2122-09-12",
    };
    const actualRes = checkIfCanBeDeleted({ 3: p1, 4: p2 });

    expect(actualRes).toBeTruthy();
  });

  it("cannot be deleted if periods dates less", () => {
    const p1 = {
      ...periods[0],
      selectionBegin: "2000-08-29",
      selectionDeadline: "2000-09-12",
    };
    const p2 = {
      ...periods[1],
      selectionBegin: "2000-08-29",
      selectionDeadline: "2000-09-12",
    };
    const actualRes = checkIfCanBeDeleted({ 3: p1, 4: p2 });

    expect(actualRes).toBeFalsy();
  });
});


describe("findCourseToCurrentPeriod", () => {
  it("finds periods", () => {
    const actualRes = findCourseToCurrentPeriod(2022, 0, periods);

    expect(Object.keys(actualRes).length).toBe(2);
    expect(actualRes.hasOwnProperty(3)).toBeTruthy();
    expect(actualRes.hasOwnProperty(4)).toBeTruthy();
    expect(actualRes[3].course).toBe(3);
    expect(actualRes[3].year).toBe(2022);
    expect(actualRes[4].course).toBe(4);
    expect(actualRes[4].year).toBe(2022);
  });
});


const moduleSelections: IModuleSelection[] = [
  {
    id: 'mn1',
    selected: ['ms1']
  },
  {
    id: 'mn2',
    selected: ['ms1', 'ms2']
  },
];

const selectedModuleDisciplines: ISelectedModuleDisciplines[] = [
  {
    'mn1': ['ms1'],
    'mn2': ['ms1', 'ms2']
  },
  {
    'mn1': ['ms1'],
    'mn2': ['ms1']
  }
];

describe("checkNeedModuleUpdateForConnectionId", () => {
  it("no update on no change", () => {
    const actualRes = checkNeedModuleUpdateForConnectionId(
      1, moduleSelections, {1: selectedModuleDisciplines[0]});

    expect(actualRes).toBeFalsy();
  });

  it("update on change", () => {
    const actualRes = checkNeedModuleUpdateForConnectionId(
      1, moduleSelections, {1: selectedModuleDisciplines[1]});

    expect(actualRes).toBeTruthy();
  });
});


const mups: IMup[] = [
  {
    id: 'm1',
    name: 'M1',
    shortName: 'M1',
    ze: 3,
    teacherIds: [],
  },
  {
    id: 'm2',
    name: 'M2',
    shortName: 'M2',
    ze: 3,
    teacherIds: [],
  }
];

const mupData: IMupData = {
  ids: ['m1', 'm2'],
  data: {
    'm1': mups[0],
    'm2': mups[1],
  }
};


describe("checkIfNeedUpdateModules", () => {
  it("no update on same empty", () => {
    const emptyModuleSelection = {'mn1': [], 'mn2': []};
    const actualRes = checkIfNeedUpdateModules(
      'm1', [1, 2], {3: []}, mupData, selectionGroupMupData,
      {1: emptyModuleSelection, 2: emptyModuleSelection}
    )
    
    expect(actualRes.length).toBe(2);
    expect(actualRes[0]).toBeFalsy();
    expect(actualRes[1]).toBeFalsy();
  });

  it("no update on same", () => {
    const actualRes = checkIfNeedUpdateModules(
      'm1', [1, 2], {3: moduleSelections}, mupData, selectionGroupMupData,
      {1: selectedModuleDisciplines[0], 2: selectedModuleDisciplines[1]}
    )
    
    expect(actualRes.length).toBe(2);
    expect(actualRes[0]).toBeFalsy();
    expect(actualRes[1]).toBeFalsy();
  });

  it("update on different", () => {
    const actualRes = checkIfNeedUpdateModules(
      'm2', [2], {3: moduleSelections}, mupData, selectionGroupMupData,
      {2: selectedModuleDisciplines[1]}
    )
    
    expect(actualRes.length).toBe(1);
    expect(actualRes[0]).toBeTruthy();
  });
});