import { expect, test } from "vitest";
import {
  getE2eFileShards,
  getE2eShardMatrix,
  getE2eTestMatch,
} from "./test-shards";

test("discovers the shard matrix from e2e filenames", () => {
  expect(
    getE2eShardMatrix([
      "second.[shard-2].[shard-5].e2e.ts",
      "first.[shard-1].e2e.ts",
      "another.[shard-2].[shard-5].e2e.ts",
      "helper.ts",
    ])
  ).toEqual([
    { shard: "shard-1", partition: "" },
    { shard: "shard-2", partition: "1/2" },
    { shard: "shard-5", partition: "2/2" },
  ]);
});

test("requires shard tags and consistent multi-shard groups", () => {
  expect(() => getE2eFileShards("unassigned.e2e.ts")).toThrow(
    "Every e2e file must have a shard tag"
  );
  expect(() =>
    getE2eFileShards("duplicated.[shard-2].[shard-2].e2e.ts")
  ).toThrow("Every shard tag in an e2e filename must be unique");
  expect(() =>
    getE2eShardMatrix([
      "first.[shard-2].[shard-5].e2e.ts",
      "second.[shard-2].[shard-6].e2e.ts",
    ])
  ).toThrow("Every file selected by shard-2 must use the same shard tags");
});

test("matches all e2e files locally and only the selected shard in CI", () => {
  const allTests = getE2eTestMatch(undefined);
  expect(allTests.test("tests/pages.[shard-1].e2e.ts")).toBe(true);

  const shardTests = getE2eTestMatch("shard-2");
  expect(shardTests.test("tests/pages.[shard-2].e2e.ts")).toBe(true);
  expect(
    shardTests.test("tests/pages.[shard-2].[shard-5].[shard-6].e2e.ts")
  ).toBe(true);
  expect(shardTests.test("tests/pages.[shard-1].e2e.ts")).toBe(false);
  expect(() => getE2eTestMatch("../../other")).toThrow("Invalid e2e shard");
});
