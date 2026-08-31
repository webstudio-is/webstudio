import { expect, test } from "vitest";
import { getE2eFileShard, getE2eShards, getE2eTestMatch } from "./test-shards";

test("discovers the shard matrix from e2e filenames", () => {
  expect(
    getE2eShards([
      "second.[shard-2].e2e.ts",
      "first.[shard-1].e2e.ts",
      "another.[shard-2].e2e.ts",
      "helper.ts",
    ])
  ).toEqual(["shard-1", "shard-2"]);
});

test("requires exactly one shard tag on every e2e file", () => {
  expect(() => getE2eFileShard("unassigned.e2e.ts")).toThrow(
    "Every e2e file must have exactly one shard tag"
  );
  expect(() =>
    getE2eFileShard("duplicated.[shard-1].[shard-2].e2e.ts")
  ).toThrow("Every e2e file must have exactly one shard tag");
});

test("matches all e2e files locally and only the selected shard in CI", () => {
  const allTests = getE2eTestMatch(undefined);
  expect(allTests.test("tests/pages.[shard-1].e2e.ts")).toBe(true);

  const shardTests = getE2eTestMatch("shard-2");
  expect(shardTests.test("tests/pages.[shard-2].e2e.ts")).toBe(true);
  expect(shardTests.test("tests/pages.[shard-1].e2e.ts")).toBe(false);
  expect(() => getE2eTestMatch("../../other")).toThrow("Invalid e2e shard");
});
