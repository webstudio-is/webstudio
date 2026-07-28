import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
} from "@webstudio-is/content-engine/compiler";
import type { Asset, AssetFolders } from "@webstudio-is/sdk";
import { afterEach, describe, expect, test } from "vitest";
import { createFileSystemContentSource } from "./filesystem-content-source";

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), "webstudio-content-source-"));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

const createAsset = (name: string): Asset => ({
  id: "post",
  projectId: "project",
  type: "file",
  name,
  filename: "hello",
  size: 0,
  description: null,
  folderId: "blog",
  createdAt: "2026-07-27T00:00:00.000Z",
  format: "md",
  meta: {},
});

const folders: AssetFolders = new Map([
  [
    "blog",
    {
      id: "blog",
      projectId: "project",
      name: "Blog",
      createdAt: "2026-07-27T00:00:00.000Z",
    },
  ],
]);

const plan = createContentCompilationPlan([
  createLiteralContentCompilationQuery({
    id: "posts",
    query: {
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "hello",
          },
        ],
      },
      sort: [],
      limit: 10,
      offset: 0,
      output: { mode: "all", includeMetadata: true },
      content: { mode: "full" },
    },
  }),
]);

describe("filesystem content source", () => {
  test("uses the shared parser and hydrates matching local content", async () => {
    const directory = await createTemporaryDirectory();
    const name = "hello_hash.md";
    const content = "---\ntitle: Hello\nslug: hello\n---\n# Hello\nBody";
    await writeFile(join(directory, name), content);
    const snapshot = await createFileSystemContentSource({
      projectId: "project",
      assets: [createAsset(name)],
      folders,
      assetsDirectory: directory,
    }).openSnapshot();

    await expect(snapshot.loadEntries(plan)).resolves.toMatchObject([
      {
        document: {
          path: "Blog/hello.md",
          properties: { title: "Hello", slug: "hello" },
        },
        content,
      },
    ]);
    await expect(snapshot.isCurrent()).resolves.toBe(true);
  });

  test("invalidates a snapshot when a local file is replaced", async () => {
    const directory = await createTemporaryDirectory();
    const name = "hello_hash.md";
    const path = join(directory, name);
    await writeFile(path, "first");
    const snapshot = await createFileSystemContentSource({
      projectId: "project",
      assets: [createAsset(name)],
      folders,
      assetsDirectory: directory,
    }).openSnapshot();

    await writeFile(path, "replacement");

    await expect(snapshot.isCurrent()).resolves.toBe(false);
    await expect(snapshot.loadEntries(plan)).rejects.toThrow(
      "Content source file changed"
    );
  });

  test("invalidates a snapshot when a local file is deleted", async () => {
    const directory = await createTemporaryDirectory();
    const name = "hello_hash.md";
    const path = join(directory, name);
    await writeFile(path, "content");
    const snapshot = await createFileSystemContentSource({
      projectId: "project",
      assets: [createAsset(name)],
      folders,
      assetsDirectory: directory,
    }).openSnapshot();

    await rm(path);

    await expect(snapshot.isCurrent()).resolves.toBe(false);
  });

  test("rejects selected content that cannot be embedded as UTF-8", async () => {
    const directory = await createTemporaryDirectory();
    const name = "invalid_hash.md";
    await writeFile(join(directory, name), new Uint8Array([0xff]));
    const snapshot = await createFileSystemContentSource({
      projectId: "project",
      assets: [createAsset(name)],
      folders,
      assetsDirectory: directory,
    }).openSnapshot();

    const fullContentPlan = createContentCompilationPlan([
      createLiteralContentCompilationQuery({
        id: "all-posts",
        query: {
          where: { all: [] },
          sort: [],
          limit: 1,
          offset: 0,
          output: { mode: "base", includeMetadata: true },
          content: { mode: "full" },
        },
      }),
    ]);
    await expect(snapshot.loadEntries(fullContentPlan)).rejects.toThrow(
      "Selected content source file is not valid UTF-8"
    );
  });
});
