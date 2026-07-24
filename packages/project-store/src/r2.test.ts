import { describe, expect, test } from "vitest";
import { createR2ProjectStore, R2ObjectStore, type R2BucketLike } from "./r2";
import { runStorageAdapterContract } from "./__tests__/storage-adapter-contract";

class FakeR2Bucket implements R2BucketLike {
  private version = 0;
  readonly objects = new Map<string, { bytes: Uint8Array; etag: string }>();

  async get(
    key: string,
    options?: { range: { offset: number; length: number } }
  ) {
    const stored = this.objects.get(key);
    if (stored === undefined) {
      return null;
    }
    return {
      key,
      etag: stored.etag,
      arrayBuffer: async () => {
        const bytes =
          options === undefined
            ? stored.bytes
            : stored.bytes.slice(
                options.range.offset,
                options.range.offset + options.range.length
              );
        return new Uint8Array(bytes).buffer;
      },
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

class RepeatingCursorR2Bucket extends FakeR2Bucket {
  async list() {
    return { objects: [], truncated: true, cursor: "repeated" };
  }
}

runStorageAdapterContract({
  name: "R2",
  create: async () => {
    const storage = new R2ObjectStore(
      new FakeR2Bucket(),
      "projects/project/db"
    );
    return { objects: storage, heads: storage };
  },
});

describe("R2 project store", () => {
  test("rejects a repeated pagination cursor instead of looping", async () => {
    const storage = new R2ObjectStore(new RepeatingCursorR2Bucket());

    await expect(storage.list("objects")).rejects.toThrow("repeated");
  });

  test("round-trips project snapshots below a private project prefix", async () => {
    const bucket = new FakeR2Bucket();
    const storage = new R2ObjectStore(bucket, "projects/project/db");
    const store = createR2ProjectStore(bucket, "project");
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
    bucket.objects.set("projects/project/database/sibling", {
      bytes: new Uint8Array(),
      etag: "sibling",
    });

    await expect(store.readSnapshot(reference)).resolves.toMatchObject({
      manifest: { projectId: "project" },
      collections: {
        "builder/pages": { homePageId: "home" },
        "assets/records": [],
      },
    });
    expect(await storage.list("objects")).toHaveLength(3);
    expect(
      (await storage.list("")).some((key) => key.includes("sibling"))
    ).toBe(false);
    expect(
      [...bucket.objects.keys()]
        .filter((key) => key !== "projects/project/database/sibling")
        .every((key) => key.startsWith("projects/project/db/"))
    ).toBe(true);
  });

  test("stores binary assets under the project asset prefix", async () => {
    const bucket = new FakeR2Bucket();
    const store = createR2ProjectStore(bucket, "project/..");
    const bytes = new TextEncoder().encode("asset body");

    const reference = await store.writeAsset(bytes);

    await expect(store.readAsset(reference)).resolves.toEqual(bytes);
    await expect(
      store.readAsset(reference, { offset: 2, length: 4 })
    ).resolves.toEqual(new TextEncoder().encode("set "));
    expect([...bucket.objects.keys()]).toEqual([
      `projects/project%2F%2E%2E/assets/sha256/${reference.object.hash.slice("sha256:".length)}`,
    ]);
  });
});
