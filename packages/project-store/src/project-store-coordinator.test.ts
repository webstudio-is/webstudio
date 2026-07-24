import { describe, expect, test, vi } from "vitest";
import type { ProjectHeadStore } from "./object-store";
import { ProjectStoreCoordinator } from "./project-store-coordinator";
import type {
  ObjectProjectAssetReference,
  ObjectProjectSnapshotReference,
  ProjectHead,
  ProjectSnapshotReference,
} from "./types";

const hash = (digit: string) => `sha256:${digit.repeat(64)}` as const;

const postgresReference = {
  storage: "postgres",
  type: "snapshot",
  projectId: "project",
  buildId: "build",
  builderRevision: "1",
  assetRevision: "assets-1",
} as const;

const objectReferences = ["2", "3"].map(
  (digit) =>
    ({
      storage: "object",
      type: "snapshot",
      object: { hash: hash(digit), size: 10 },
    }) satisfies ObjectProjectSnapshotReference
);

class MemoryHeadStore implements ProjectHeadStore<ProjectSnapshotReference> {
  head: ProjectHead<ProjectSnapshotReference> | undefined = {
    reference: postgresReference,
    revision: hash("1"),
  };

  async getHead(_name: string) {
    return this.head;
  }

  async updateHead({
    expectedRevision,
    reference,
  }: {
    name: string;
    expectedRevision?: ProjectHead<ProjectSnapshotReference>["revision"];
    reference: ProjectSnapshotReference;
  }) {
    if (this.head?.revision !== expectedRevision) {
      return {
        status: "conflict",
        ...(this.head === undefined ? {} : { head: this.head }),
      } as const;
    }
    this.head = {
      reference,
      revision:
        reference.storage === "object" ? reference.object.hash : hash("9"),
    };
    return { status: "updated", head: this.head } as const;
  }
}

const snapshotInput = {
  projectId: "project",
  builderRevision: "2",
  assetRevision: "assets-2",
  collections: {},
} as const;

describe("project store coordinator", () => {
  test("atomically promotes a PostgreSQL head to an object snapshot", async () => {
    const heads = new MemoryHeadStore();
    const snapshots = {
      writeSnapshot: vi.fn(async () => objectReferences[0]),
    };
    const assetReference = {
      storage: "object",
      type: "asset",
      object: { hash: hash("4"), size: 4 },
    } satisfies ObjectProjectAssetReference;
    const coordinator = new ProjectStoreCoordinator({
      heads,
      snapshots,
      assets: { writeAsset: async () => assetReference },
    });

    await expect(
      coordinator.commitSnapshot({
        headName: "development",
        expectedRevision: hash("1"),
        snapshot: snapshotInput,
      })
    ).resolves.toMatchObject({
      status: "updated",
      head: { reference: objectReferences[0] },
    });
    expect(snapshots.writeSnapshot).toHaveBeenCalledWith(snapshotInput);
    await expect(coordinator.getHead("development")).resolves.toEqual(
      heads.head
    );
    await expect(coordinator.writeAsset(new Uint8Array(4))).resolves.toBe(
      assetReference
    );
  });

  test("allows one concurrent promotion from the same head revision", async () => {
    const heads = new MemoryHeadStore();
    let nextReference = 0;
    const snapshots = {
      writeSnapshot: async () => objectReferences[nextReference++],
    };
    const coordinator = new ProjectStoreCoordinator({
      heads,
      snapshots,
      assets: {
        writeAsset: async () =>
          ({
            storage: "object",
            type: "asset",
            object: { hash: hash("4"), size: 4 },
          }) as const,
      },
    });

    const results = await Promise.all([
      coordinator.commitSnapshot({
        headName: "development",
        expectedRevision: hash("1"),
        snapshot: snapshotInput,
      }),
      coordinator.commitSnapshot({
        headName: "development",
        expectedRevision: hash("1"),
        snapshot: snapshotInput,
      }),
    ]);

    expect(results.filter(({ status }) => status === "updated")).toHaveLength(
      1
    );
    expect(results.filter(({ status }) => status === "conflict")).toHaveLength(
      1
    );
  });
});
