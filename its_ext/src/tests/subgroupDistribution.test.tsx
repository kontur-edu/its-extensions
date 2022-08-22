import { ISubgoupDiffInfo, ISubgroupMeta } from "../common/types";
import { checkSubgroupMetaCountsAreSame } from "../subgroupMembership/subgroupMembershipParser";

describe("checkSubgroupMetaCountsAreSame", () => {
  const subgroupMetas: ISubgroupMeta[] = [
    {
      id: 1,
      count: 1,
      discipline: "M1",
      load: "load_1",
    },
  ];
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
          2: { load_1: {...subgroupMetas[0], count: 2} },
        },
      },
    });
    expect(actualRes).toBeFalsy();
  });
});
