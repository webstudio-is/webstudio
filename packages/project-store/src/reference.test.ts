import { describe, expect, test } from "vitest";
import { isProjectAssetReference } from "./asset-reference";
import { isProjectSnapshotReference } from "./snapshot-reference";

const object = {
  hash: `sha256:${"a".repeat(64)}`,
  size: 12,
} as const;

describe("project references", () => {
  test("distinguishes snapshot and asset object references", () => {
    expect(
      isProjectSnapshotReference({
        storage: "object",
        type: "snapshot",
        object,
      })
    ).toBe(true);
    expect(
      isProjectSnapshotReference({ storage: "object", type: "asset", object })
    ).toBe(false);
    expect(
      isProjectAssetReference({ storage: "object", type: "asset", object })
    ).toBe(true);
    expect(
      isProjectAssetReference({ storage: "object", type: "snapshot", object })
    ).toBe(false);
  });

  test("validates legacy PostgreSQL reference identities", () => {
    expect(
      isProjectSnapshotReference({
        storage: "postgres",
        type: "snapshot",
        projectId: "project",
        buildId: "build",
        builderRevision: "42",
        assetRevision: "assets:7",
      })
    ).toBe(true);
    expect(
      isProjectSnapshotReference({
        storage: "postgres",
        type: "snapshot",
        projectId: "project",
        buildId: "",
        builderRevision: "42",
        assetRevision: "assets:7",
      })
    ).toBe(false);
    expect(
      isProjectAssetReference({
        storage: "postgres",
        type: "asset",
        projectId: "project",
        name: "asset.md",
        revision: "file:1",
        size: 12,
      })
    ).toBe(true);
  });
});
