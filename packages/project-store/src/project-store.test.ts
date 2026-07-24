import { describe, expect, test } from "vitest";
import { sha256 } from "./hash";
import { ObjectProjectStore } from "./project-store";
import { serializeJsonDeterministically } from "./stable-json";
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
  putCount = 0;
  getCount = 0;
  failPutAt?: number;

  async get(key: string, range?: { offset: number; length: number }) {
    this.getCount += 1;
    const bytes = this.objects.get(key);
    return range === undefined
      ? bytes
      : bytes?.slice(range.offset, range.offset + range.length);
  }

  async put(key: string, value: Uint8Array) {
    this.putCount += 1;
    if (this.putCount === this.failPutAt) {
      throw new Error("Injected object write failure");
    }
    this.objects.set(key, new Uint8Array(value));
  }

  async putIfAbsent(key: string, value: Uint8Array) {
    this.putCount += 1;
    if (this.putCount === this.failPutAt) {
      throw new Error("Injected object write failure");
    }
    await Promise.resolve();
    if (this.objects.has(key)) {
      return "existing" as const;
    }
    this.objects.set(key, new Uint8Array(value));
    return "written" as const;
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

const createProjectStore = (storage: MemoryStore) =>
  new ObjectProjectStore({
    projectId: "project",
    objects: storage,
    assets: storage,
    heads: storage,
  });

describe("object project store", () => {
  test("rejects snapshots outside the configured project scope", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);
    await expect(
      store.writeSnapshot({ ...input, projectId: "other-project" })
    ).rejects.toThrow("different project");
    expect(storage.objects.size).toBe(0);

    const reference = await store.writeSnapshot(input);
    const otherStore = new ObjectProjectStore({
      projectId: "other-project",
      objects: storage,
      assets: storage,
      heads: storage,
    });
    await expect(otherStore.readSnapshot(reference)).rejects.toThrow(
      "different project"
    );
  });

  test("rejects snapshots without durable revision identities", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);

    await expect(
      store.writeSnapshot({ ...input, builderRevision: "" })
    ).rejects.toThrow("revisions cannot be empty");
    await expect(
      store.writeSnapshot({ ...input, assetRevision: "" })
    ).rejects.toThrow("revisions cannot be empty");
    expect(storage.objects.size).toBe(0);
  });

  test("writes deterministic immutable collections before the manifest", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);

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
    expect(storage.getCount).toBe(3);
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

  test("commits a snapshot through the named-head compare-and-swap", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);
    const created = await store.commitSnapshot({
      headName: "development",
      snapshot: input,
    });
    if (created.status !== "updated") {
      throw new Error("Expected initial project snapshot commit to succeed");
    }
    const objectCount = storage.objects.size;
    await expect(
      store.commitSnapshot({
        headName: "development",
        expectedRevision: `sha256:${"0".repeat(64)}`,
        snapshot: { ...input, builderRevision: "stale" },
      })
    ).resolves.toMatchObject({ status: "conflict", head: created.head });
    expect(storage.objects.size).toBe(objectCount);

    const results = await Promise.all([
      store.commitSnapshot({
        headName: "development",
        expectedRevision: created.head.revision,
        snapshot: { ...input, builderRevision: "43" },
      }),
      store.commitSnapshot({
        headName: "development",
        expectedRevision: created.head.revision,
        snapshot: { ...input, builderRevision: "44" },
      }),
    ]);

    expect(results.filter(({ status }) => status === "updated")).toHaveLength(
      1
    );
    expect(results.filter(({ status }) => status === "conflict")).toHaveLength(
      1
    );
  });

  test("detects corrupted content-addressed objects", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);
    const reference = await store.writeSnapshot(input);
    storage.objects.set(
      `objects/${reference.object.hash.slice("sha256:".length)}`,
      new TextEncoder().encode("{}")
    );

    await expect(store.writeSnapshot(input)).rejects.toThrow(
      "failed integrity validation"
    );
    await expect(store.readSnapshot(reference)).rejects.toThrow(
      "failed integrity validation"
    );
  });

  test("rejects hash-valid project objects that are not canonical JSON", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);
    const encoder = new TextEncoder();
    const collectionBytes = encoder.encode('{"second":2,"first":1}');
    const collection = {
      hash: await sha256(collectionBytes),
      size: collectionBytes.byteLength,
    };
    storage.objects.set(
      `objects/${collection.hash.slice("sha256:".length)}`,
      collectionBytes
    );
    const manifestBytes = encoder.encode(
      serializeJsonDeterministically({
        format: "webstudio-project-snapshot",
        version: 1,
        projectId: "project",
        builderRevision: "1",
        assetRevision: "1",
        collections: { "builder/pages": collection },
      })
    );
    const manifest = {
      hash: await sha256(manifestBytes),
      size: manifestBytes.byteLength,
    };
    storage.objects.set(
      `objects/${manifest.hash.slice("sha256:".length)}`,
      manifestBytes
    );

    await expect(
      store.readSnapshot({
        storage: "object",
        type: "snapshot",
        object: manifest,
      })
    ).rejects.toThrow("canonical JSON");
  });

  test("detects missing and corrupted content-addressed assets", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);
    const reference = await store.writeAsset(
      new TextEncoder().encode("asset body")
    );
    const key = `sha256/${reference.object.hash.slice("sha256:".length)}`;
    storage.objects.set(key, new TextEncoder().encode("corrupted"));

    await expect(
      store.writeAsset(new TextEncoder().encode("asset body"))
    ).rejects.toThrow("failed integrity validation");
    await expect(store.readAsset(reference)).rejects.toThrow(
      "failed integrity validation"
    );
    storage.objects.delete(key);
    await expect(store.readAsset(reference)).rejects.toThrow("is missing");
  });

  test("reads an exact bounded asset range without loading the full object", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);
    const reference = await store.writeAsset(
      new TextEncoder().encode("0123456789")
    );

    await expect(
      store.readAsset(reference, { offset: 3, length: 4 })
    ).resolves.toEqual(new TextEncoder().encode("3456"));
    await expect(
      store.readAsset(reference, { offset: 8, length: 3 })
    ).rejects.toThrow("range is invalid");
  });

  test("reads only requested collections", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);
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
    const store = createProjectStore(storage);

    await expect(
      store.updateHead({
        name: "development",
        reference: {
          storage: "object",
          type: "snapshot",
          object: { hash: `sha256:${"0".repeat(64)}`, size: 10 },
        },
      })
    ).rejects.toThrow("is missing");
  });

  test("rejects a stored head whose snapshot is missing", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);
    const reference = {
      storage: "object",
      type: "snapshot",
      object: { hash: `sha256:${"0".repeat(64)}`, size: 10 },
    } as const;
    storage.heads.set("development", {
      reference,
      revision: reference.object.hash,
    });

    await expect(store.getHead("development")).rejects.toThrow("is missing");
  });

  test("retries safely after an interrupted snapshot write", async () => {
    const storage = new MemoryStore();
    const store = createProjectStore(storage);
    storage.failPutAt = 3;

    await expect(store.writeSnapshot(input)).rejects.toThrow(
      "Injected object write failure"
    );
    expect(storage.heads.size).toBe(0);
    expect(storage.objects.size).toBe(2);

    const reference = await store.writeSnapshot(input);
    await expect(store.readSnapshot(reference)).resolves.toMatchObject({
      collections: input.collections,
    });
  });

  test("stores and looks up 1,000 independently addressed assets", async () => {
    const objects = new MemoryStore();
    const assets = new MemoryStore();
    const store = new ObjectProjectStore({
      projectId: "project",
      objects,
      assets,
      heads: objects,
    });
    const records = Array.from({ length: 1_000 }, (_, index) => ({
      id: `asset-${index}`,
      name: `posts/post-${index}.md`,
    }));
    const snapshot = await store.writeSnapshot({
      projectId: "project",
      builderRevision: "1",
      assetRevision: "assets:1000",
      collections: { "assets/records": records },
    });
    const references = await Promise.all(
      records.map(({ name }) =>
        store.writeAsset(new TextEncoder().encode(`# ${name}`))
      )
    );

    expect(objects.objects.size).toBe(2);
    expect(assets.objects.size).toBe(1_000);
    await expect(
      store.readCollections({
        reference: snapshot,
        names: ["assets/records"],
      })
    ).resolves.toEqual({ "assets/records": records });
    for (const index of [0, 499, 999]) {
      await expect(store.readAsset(references[index])).resolves.toEqual(
        new TextEncoder().encode(`# ${records[index].name}`)
      );
    }
  });
});
