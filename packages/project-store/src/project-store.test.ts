import { describe, expect, test } from "vitest";
import { ObjectProjectStore } from "./project-store";
import type { ObjectStore, ProjectHeadStore } from "./object-store";
import type {
  ObjectProjectSnapshotReference,
  ProjectHead,
  ProjectHeadUpdateResult,
} from "./types";

class MemoryStore
  implements ObjectStore, ProjectHeadStore<ObjectProjectSnapshotReference>
{
  objects = new Map<string, Uint8Array>();
  heads = new Map<string, ProjectHead<ObjectProjectSnapshotReference>>();

  async get(key: string) {
    return this.objects.get(key);
  }

  async put(key: string, value: Uint8Array) {
    this.objects.set(key, value);
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async list(prefix: string) {
    return [...this.objects.keys()].filter((key) => key.startsWith(prefix));
  }

  async getHead(name: string) {
    return this.heads.get(name);
  }

  async updateHead({
    name,
    expectedRevision,
    reference,
  }: {
    name: string;
    expectedRevision?: ProjectHead<ObjectProjectSnapshotReference>["revision"];
    reference: ObjectProjectSnapshotReference;
  }): Promise<ProjectHeadUpdateResult<ObjectProjectSnapshotReference>> {
    const current = this.heads.get(name);
    if (current?.revision !== expectedRevision) {
      return {
        status: "conflict",
        ...(current === undefined ? {} : { head: current }),
      };
    }
    const head = { reference, revision: reference.object.hash };
    this.heads.set(name, head);
    return { status: "updated", head };
  }
}

const input = {
  projectId: "project",
  builderRevision: "42",
  assetRevision: "assets:7",
  collections: {
    "builder/pages": { homePageId: "home" },
    "assets/records": [{ id: "asset-1", name: "post.md" }],
  },
} as const;

describe("object project store", () => {
  test("writes deterministic immutable collections before the manifest", async () => {
    const storage = new MemoryStore();
    const store = new ObjectProjectStore(storage, storage);

    const first = await store.writeSnapshot(input);
    const objectCount = storage.objects.size;
    const second = await store.writeSnapshot({
      ...input,
      collections: {
        "assets/records": [{ name: "post.md", id: "asset-1" }],
        "builder/pages": { homePageId: "home" },
      },
    });

    expect(second).toEqual(first);
    expect(storage.objects.size).toBe(objectCount);
    await expect(store.readSnapshot(first)).resolves.toMatchObject({
      reference: first,
      manifest: {
        projectId: "project",
        builderRevision: "42",
        assetRevision: "assets:7",
      },
      collections: input.collections,
    });
  });

  test("detects corrupted content-addressed objects", async () => {
    const storage = new MemoryStore();
    const store = new ObjectProjectStore(storage, storage);
    const reference = await store.writeSnapshot(input);
    storage.objects.set(
      `objects/${reference.object.hash.slice("sha256:".length)}`,
      new TextEncoder().encode("{}")
    );

    await expect(store.readSnapshot(reference)).rejects.toThrow(
      "failed integrity validation"
    );
  });

  test("reads only requested collections", async () => {
    const storage = new MemoryStore();
    const store = new ObjectProjectStore(storage, storage);
    const reference = await store.writeSnapshot(input);

    await expect(
      store.readCollections({
        reference,
        names: ["builder/pages"],
      })
    ).resolves.toEqual({ "builder/pages": { homePageId: "home" } });
    await expect(
      store.readCollections({ reference, names: ["builder/missing"] })
    ).rejects.toThrow('Project collection "builder/missing" is missing');
  });

  test("refuses to move a head to a missing snapshot", async () => {
    const storage = new MemoryStore();
    const store = new ObjectProjectStore(storage, storage);

    await expect(
      store.updateHead({
        name: "development",
        reference: {
          storage: "object",
          object: { hash: `sha256:${"0".repeat(64)}`, size: 10 },
        },
      })
    ).rejects.toThrow("is missing");
  });
});
