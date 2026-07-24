import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import {
  createFilesystemProjectStore,
  FilesystemObjectStore,
} from "./filesystem";
import { runStorageAdapterContract } from "./__tests__/storage-adapter-contract";

const directories: string[] = [];

const createStore = async () => {
  const root = await mkdtemp(join(tmpdir(), "webstudio-project-store-"));
  directories.push(root);
  const storage = new FilesystemObjectStore(join(root, "db"));
  const assets = new FilesystemObjectStore(join(root, "assets"));
  return {
    root,
    storage,
    assets,
    store: createFilesystemProjectStore(root, "project"),
  };
};

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

runStorageAdapterContract({
  name: "filesystem",
  create: async () => {
    const { storage } = await createStore();
    return { objects: storage, heads: storage };
  },
});

describe("filesystem project store", () => {
  test("round-trips snapshots using the portable object layout", async () => {
    const { root, storage, store } = await createStore();
    const reference = await store.writeSnapshot({
      projectId: "project",
      builderRevision: "1",
      assetRevision: "2",
      collections: { "builder/pages": { homePageId: "home" } },
    });

    await expect(store.readSnapshot(reference)).resolves.toMatchObject({
      manifest: { projectId: "project" },
      collections: { "builder/pages": { homePageId: "home" } },
    });
    expect(await storage.list("objects")).toHaveLength(2);
    await expect(
      readFile(
        join(
          root,
          "db",
          "objects",
          reference.object.hash.slice("sha256:".length)
        ),
        "utf8"
      )
    ).resolves.toContain("webstudio-project-snapshot");
  });

  test("stores binary assets separately from structured project data", async () => {
    const { root, assets, store } = await createStore();
    const bytes = new TextEncoder().encode("asset body");
    const first = await store.writeAsset(bytes);
    const second = await store.writeAsset(bytes);

    expect(second).toEqual(first);
    await expect(store.readAsset(first)).resolves.toEqual(bytes);
    expect(await assets.list("sha256")).toHaveLength(1);
    await expect(
      readFile(
        join(
          root,
          "assets",
          "sha256",
          first.object.hash.slice("sha256:".length)
        ),
        "utf8"
      )
    ).resolves.toBe("asset body");
  });

  test("does not steal an old head lock from a paused writer", async () => {
    const { root, store } = await createStore();
    const reference = await store.writeSnapshot({
      projectId: "project",
      builderRevision: "1",
      assetRevision: "1",
      collections: {},
    });
    const lockPath = join(root, "db", "heads", "development.json.lock");
    await mkdir(join(root, "db", "heads"), { recursive: true });
    await writeFile(lockPath, "");
    const staleTime = new Date(Date.now() - 60_000);
    await utimes(lockPath, staleTime, staleTime);

    const update = store.updateHead({ name: "development", reference });
    const state = await Promise.race([
      update.then(() => "settled" as const),
      new Promise<"pending">((resolvePending) =>
        setTimeout(() => resolvePending("pending"), 50)
      ),
    ]);
    expect(state).toBe("pending");

    await rm(lockPath);
    await expect(update).resolves.toMatchObject({ status: "updated" });
  });

  test("rejects keys that escape the configured root", async () => {
    const { storage } = await createStore();
    await expect(storage.put("../outside", new Uint8Array())).rejects.toThrow(
      "Invalid object key"
    );
  });

  test("detects filesystem object corruption", async () => {
    const { root, store } = await createStore();
    const reference = await store.writeSnapshot({
      projectId: "project",
      builderRevision: "1",
      assetRevision: "1",
      collections: {},
    });
    await writeFile(
      join(
        root,
        "db",
        "objects",
        reference.object.hash.slice("sha256:".length)
      ),
      "{}"
    );

    await expect(store.readSnapshot(reference)).rejects.toThrow(
      "failed integrity validation"
    );
  });
});
