import { expect, test } from "vitest";
import {
  getE2eFileShards,
  getE2eShards,
  getE2eSuiteName,
  getE2eTestModules,
  isE2eTestInShard,
} from "./test-modules";

test("formats suite names using the shared shard filename syntax", () => {
  expect(
    getE2eSuiteName("pages-actions.[shard-2].[shard-5].[shard-6].e2e.ts")
  ).toBe("pages actions");
  expect(getE2eSuiteName("asset-canvas-drag.[shard-4].e2e.ts")).toBe(
    "asset canvas drag"
  );
});

test("discovers every e2e module and filters ownership by shard tag", () => {
  const files = [
    "asset-folders-selection-actions.[shard-4].e2e.ts",
    "pages-actions.[shard-2].[shard-5].[shard-6].e2e.ts",
    "pages-drag.[shard-3].e2e.ts",
    "navigator-drag.[shard-1].e2e.ts",
    "helper.ts",
  ];

  expect(getE2eTestModules(files)).toEqual([
    "./tests/asset-folders-selection-actions.[shard-4].e2e.ts",
    "./tests/navigator-drag.[shard-1].e2e.ts",
    "./tests/pages-actions.[shard-2].[shard-5].[shard-6].e2e.ts",
    "./tests/pages-drag.[shard-3].e2e.ts",
  ]);
  expect(getE2eTestModules(files, "shard-3")).toEqual([
    "./tests/pages-drag.[shard-3].e2e.ts",
  ]);
  expect(getE2eTestModules(files, "shard-4")).toEqual([
    "./tests/asset-folders-selection-actions.[shard-4].e2e.ts",
  ]);
  expect(getE2eTestModules(files, "shard-5")).toEqual([
    "./tests/pages-actions.[shard-2].[shard-5].[shard-6].e2e.ts",
  ]);
});

test("discovers the shard matrix from e2e filenames", () => {
  expect(
    getE2eShards([
      "second.[shard-2].[shard-10].e2e.ts",
      "first.[shard-1].e2e.ts",
      "helper.ts",
    ])
  ).toEqual(["shard-1", "shard-2", "shard-10"]);
  expect(() => getE2eShards(["unassigned.e2e.ts"])).toThrow(
    "Every e2e file must have a shard tag"
  );
});

test("partitions a multi-shard file by test registration order", () => {
  const fileName = "pages-actions.[shard-2].[shard-5].[shard-6].e2e.ts";
  expect(getE2eFileShards(fileName)).toEqual(["shard-2", "shard-5", "shard-6"]);
  expect(
    [0, 1, 2, 3, 4].filter((distributionIndex) =>
      isE2eTestInShard({ fileName, shard: "shard-2", distributionIndex })
    )
  ).toEqual([0, 3]);
  expect(
    [0, 1, 2, 3, 4].filter((distributionIndex) =>
      isE2eTestInShard({ fileName, shard: "shard-5", distributionIndex })
    )
  ).toEqual([1, 4]);
  expect(
    [0, 1, 2, 3, 4].filter((distributionIndex) =>
      isE2eTestInShard({ fileName, shard: "shard-6", distributionIndex })
    )
  ).toEqual([2]);
});
