import { describe, expect, test } from "vitest";
import { toAssetResourceIndexStatus } from "./resource-index-status";

const base = {
  resourceId: "posts",
  queryHash: `sha256:${"a".repeat(64)}`,
  assetRevision: `sha256:${"b".repeat(64)}`,
  activeRevision: `sha256:${"c".repeat(64)}`,
  buildError: null,
  updatedAt: "2026-07-18T12:00:00.000Z",
};

describe("asset resource index status", () => {
  test.each([
    ["PENDING", "indexing"],
    ["BUILDING", "indexing"],
    ["ACTIVE", "active"],
    ["STALE", "stale"],
    ["FAILED", "failed"],
  ] as const)("maps %s to %s", (buildStatus, state) => {
    expect(toAssetResourceIndexStatus({ ...base, buildStatus })).toEqual({
      resourceId: "posts",
      state,
      queryHash: base.queryHash,
      assetRevision: base.assetRevision,
      activeRevision: base.activeRevision,
      updatedAt: base.updatedAt,
    });
  });

  test("returns the last active revision and a structured build error", () => {
    expect(
      toAssetResourceIndexStatus({
        ...base,
        buildStatus: "FAILED",
        buildError: { code: "INDEX_BUILD_FAILED", message: "Build failed" },
      })
    ).toMatchObject({
      state: "failed",
      activeRevision: base.activeRevision,
      error: { code: "INDEX_BUILD_FAILED", message: "Build failed" },
    });
  });
});
