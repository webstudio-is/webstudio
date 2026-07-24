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
import { ObjectProjectStore } from "./project-store";
import { FilesystemObjectStore } from "./filesystem";

const directories: string[] = [];

const createStore = async () => {
  const root = await mkdtemp(join(tmpdir(), "webstudio-project-store-"));
  directories.push(root);
  const storage = new FilesystemObjectStore(root);
  return { root, storage, store: new ObjectProjectStore(storage, storage) };
};

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
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
        join(root, "objects", reference.object.hash.slice("sha256:".length)),
        "utf8"
      )
    ).resolves.toContain("webstudio-project-snapshot");
  });

  test("allows exactly one concurrent compare-and-swap update", async () => {
    const { storage, store } = await createStore();
    const first = await store.writeSnapshot({
      projectId: "project",
      builderRevision: "1",
      assetRevision: "1",
      collections: {},
    });
    const second = await store.writeSnapshot({
      projectId: "project",
      builderRevision: "2",
      assetRevision: "1",
      collections: {},
    });
    const third = await store.writeSnapshot({
      projectId: "project",
      builderRevision: "3",
      assetRevision: "1",
      collections: {},
    });
    const created = await store.updateHead({
      name: "development",
      reference: first,
    });
    if (created.status !== "updated") {
      throw new Error("Expected initial project head update to succeed");
    }

    const results = await Promise.all([
      store.updateHead({
        name: "development",
        expectedRevision: created.head.revision,
        reference: second,
      }),
      store.updateHead({
        name: "development",
        expectedRevision: created.head.revision,
        reference: third,
      }),
    ]);

    expect(results.filter(({ status }) => status === "updated")).toHaveLength(
      1
    );
    expect(results.filter(({ status }) => status === "conflict")).toHaveLength(
      1
    );
    await expect(storage.getHead("development")).resolves.toBeDefined();
  });

  test("recovers a head lock left by a crashed process", async () => {
    const { root, store } = await createStore();
    const reference = await store.writeSnapshot({
      projectId: "project",
      builderRevision: "1",
      assetRevision: "1",
      collections: {},
    });
    const lockPath = join(root, "heads", "development.json.lock");
    await mkdir(join(root, "heads"), { recursive: true });
    await writeFile(lockPath, "");
    const staleTime = new Date(Date.now() - 60_000);
    await utimes(lockPath, staleTime, staleTime);

    await expect(
      store.updateHead({ name: "development", reference })
    ).resolves.toMatchObject({ status: "updated" });
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
      join(root, "objects", reference.object.hash.slice("sha256:".length)),
      "{}"
    );

    await expect(store.readSnapshot(reference)).rejects.toThrow(
      "failed integrity validation"
    );
  });
});
