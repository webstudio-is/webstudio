import { describe, expect, test } from "vitest";
import { ObjectProjectStore } from "./project-store";
import { R2ObjectStore, type R2BucketLike } from "./r2";

class FakeR2Bucket implements R2BucketLike {
  private version = 0;
  readonly objects = new Map<string, { bytes: Uint8Array; etag: string }>();

  async get(key: string) {
    const stored = this.objects.get(key);
    if (stored === undefined) {
      return null;
    }
    return {
      key,
      etag: stored.etag,
      arrayBuffer: async () => new Uint8Array(stored.bytes).buffer,
    };
  }

  async put(
    key: string,
    value: Uint8Array,
    options?: {
      onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
    }
  ) {
    await Promise.resolve();
    const stored = this.objects.get(key);
    if (
      options?.onlyIf?.etagMatches !== undefined &&
      stored?.etag !== options.onlyIf.etagMatches
    ) {
      return null;
    }
    if (options?.onlyIf?.etagDoesNotMatch === "*" && stored !== undefined) {
      return null;
    }
    const etag = String(++this.version);
    this.objects.set(key, { bytes: new Uint8Array(value), etag });
    return { key, etag };
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async list({ prefix, cursor }: { prefix: string; cursor?: string }) {
    const keys = [...this.objects.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort();
    const offset = cursor === undefined ? 0 : Number(cursor);
    const page = keys.slice(offset, offset + 2);
    const nextOffset = offset + page.length;
    const truncated = nextOffset < keys.length;
    return {
      objects: page.map((key) => ({
        key,
        etag: this.objects.get(key)?.etag ?? "",
      })),
      truncated,
      ...(truncated ? { cursor: String(nextOffset) } : {}),
    };
  }
}

describe("R2 project store", () => {
  test("round-trips project snapshots below a private project prefix", async () => {
    const bucket = new FakeR2Bucket();
    const storage = new R2ObjectStore(bucket, "projects/project/db");
    const store = new ObjectProjectStore(storage, storage);
    const reference = await store.writeSnapshot({
      projectId: "project",
      builderRevision: "1",
      assetRevision: "1",
      collections: {
        "builder/pages": { homePageId: "home" },
        "assets/records": [],
      },
    });
    await storage.put("objects-other/not-a-project-object", new Uint8Array());

    await expect(store.readSnapshot(reference)).resolves.toMatchObject({
      manifest: { projectId: "project" },
      collections: {
        "builder/pages": { homePageId: "home" },
        "assets/records": [],
      },
    });
    expect(await storage.list("objects")).toHaveLength(3);
    expect(
      [...bucket.objects.keys()].every((key) =>
        key.startsWith("projects/project/db/")
      )
    ).toBe(true);
  });

  test("uses R2 conditional writes for atomic head updates", async () => {
    const bucket = new FakeR2Bucket();
    const storage = new R2ObjectStore(bucket, "projects/project/db");
    const store = new ObjectProjectStore(storage, storage);
    const snapshots = await Promise.all(
      [1, 2, 3].map((builderRevision) =>
        store.writeSnapshot({
          projectId: "project",
          builderRevision: String(builderRevision),
          assetRevision: "1",
          collections: {},
        })
      )
    );
    const created = await store.updateHead({
      name: "development",
      reference: snapshots[0],
    });
    if (created.status !== "updated") {
      throw new Error("Expected initial R2 project head update to succeed");
    }

    const results = await Promise.all([
      store.updateHead({
        name: "development",
        expectedRevision: created.head.revision,
        reference: snapshots[1],
      }),
      store.updateHead({
        name: "development",
        expectedRevision: created.head.revision,
        reference: snapshots[2],
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
