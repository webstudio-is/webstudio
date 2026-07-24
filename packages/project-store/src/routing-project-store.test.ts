import { describe, expect, test } from "vitest";
import type { ProjectStore } from "./project-store";
import { RoutingProjectStore } from "./routing-project-store";
import type {
  JsonValue,
  ObjectProjectAssetReference,
  ObjectProjectSnapshotReference,
  PostgresProjectAssetReference,
  PostgresProjectSnapshotReference,
  ProjectAssetReadRange,
  ProjectHead,
  ProjectSnapshotCommitInput,
} from "./types";

const revision = `sha256:${"f".repeat(64)}` as const;

class FakeProjectStore<
  SnapshotReference extends
    | PostgresProjectSnapshotReference
    | ObjectProjectSnapshotReference,
  AssetReference extends
    | PostgresProjectAssetReference
    | ObjectProjectAssetReference,
> implements ProjectStore<SnapshotReference, AssetReference> {
  readonly calls: string[] = [];
  private readonly label: string;
  private readonly snapshotReference: SnapshotReference;
  private readonly assetReference: AssetReference;

  constructor({
    label,
    snapshotReference,
    assetReference,
  }: {
    label: string;
    snapshotReference: SnapshotReference;
    assetReference: AssetReference;
  }) {
    this.label = label;
    this.snapshotReference = snapshotReference;
    this.assetReference = assetReference;
  }

  async commitSnapshot(_input: ProjectSnapshotCommitInput) {
    this.calls.push("commit");
    return {
      status: "updated",
      head: { reference: this.snapshotReference, revision },
    } as const;
  }

  async readCollections(_input: {
    reference: SnapshotReference;
    names: readonly string[];
  }) {
    this.calls.push("readCollections");
    return { backend: this.label } satisfies Record<string, JsonValue>;
  }

  async readSnapshot(_reference: SnapshotReference) {
    this.calls.push("readSnapshot");
    return {
      reference: this.snapshotReference,
      metadata: {
        projectId: "project",
        builderRevision: "1",
        assetRevision: "1",
      },
      manifest: {
        format: "webstudio-project-snapshot",
        version: 1,
        projectId: "project",
        builderRevision: "1",
        assetRevision: "1",
        collections: {},
      },
      collections: { backend: this.label },
    } as const;
  }

  async writeAsset(_value: Uint8Array) {
    this.calls.push("writeAsset");
    return this.assetReference;
  }

  async readAsset(_reference: AssetReference, range?: ProjectAssetReadRange) {
    this.calls.push(`readAsset:${range?.offset ?? "full"}`);
    return new TextEncoder().encode(this.label);
  }

  async getHead(_name: string): Promise<ProjectHead<SnapshotReference>> {
    this.calls.push("getHead");
    return { reference: this.snapshotReference, revision };
  }
}

const postgresSnapshot = {
  storage: "postgres",
  type: "snapshot",
  projectId: "project",
  buildId: "build",
  builderRevision: "1",
  assetRevision: "1",
} as const;

const postgresAsset = {
  storage: "postgres",
  type: "asset",
  projectId: "project",
  name: "post.md",
  revision: "file:1",
  size: 12,
} as const;

const objectSnapshot = {
  storage: "object",
  type: "snapshot",
  object: { hash: revision, size: 12 },
} as const;

const objectAsset = {
  storage: "object",
  type: "asset",
  object: { hash: revision, size: 12 },
} as const;

describe("routing project store", () => {
  test("routes immutable snapshot and asset references by their storage", async () => {
    const postgres = new FakeProjectStore({
      label: "postgres",
      snapshotReference: postgresSnapshot,
      assetReference: postgresAsset,
    });
    const object = new FakeProjectStore({
      label: "object",
      snapshotReference: objectSnapshot,
      assetReference: objectAsset,
    });
    const store = new RoutingProjectStore({
      postgres,
      object,
      mutations: object,
    });

    await expect(store.readSnapshot(postgresSnapshot)).resolves.toMatchObject({
      collections: { backend: "postgres" },
    });
    await expect(
      store.readCollections({
        reference: objectSnapshot,
        names: ["builder/pages"],
      })
    ).resolves.toEqual({ backend: "object" });
    await expect(
      store.readAsset(postgresAsset, { offset: 2, length: 3 })
    ).resolves.toEqual(new TextEncoder().encode("postgres"));
    await expect(store.writeAsset(new Uint8Array())).resolves.toBe(objectAsset);

    expect(postgres.calls).toEqual(["readSnapshot", "readAsset:2"]);
    expect(object.calls).toEqual(["readCollections", "writeAsset"]);
  });

  test("delegates mutable operations to one coordinator", async () => {
    const postgres = new FakeProjectStore({
      label: "postgres",
      snapshotReference: postgresSnapshot,
      assetReference: postgresAsset,
    });
    const object = new FakeProjectStore({
      label: "object",
      snapshotReference: objectSnapshot,
      assetReference: objectAsset,
    });
    const store = new RoutingProjectStore({
      postgres,
      object,
      mutations: postgres,
    });

    await expect(store.getHead("deployment/domain-a")).resolves.toMatchObject({
      reference: postgresSnapshot,
    });
    await store.commitSnapshot({
      headName: "deployment/domain-a",
      snapshot: {
        projectId: "project",
        builderRevision: "2",
        assetRevision: "2",
        collections: {},
      },
    });

    expect(object.calls).toEqual([]);
    expect(postgres.calls).toEqual(["getHead", "commit"]);
  });
});
