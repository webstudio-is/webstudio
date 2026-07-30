import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
} from "@webstudio-is/content-engine";
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
  description: "Post description",
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
          description: "Post description",
          properties: { title: "Hello", slug: "hello" },
        },
        content,
      },
    ]);
    await expect(snapshot.loadEntries()).resolves.toMatchObject([
      {
        document: {
          properties: { title: "Hello", slug: "hello" },
          excerpt: "Hello Body",
        },
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

  test("rejects symlinks outside the assets directory", async () => {
    const parent = await createTemporaryDirectory();
    const directory = join(parent, "assets");
    const outside = join(parent, "outside.md");
    const name = "outside_hash.md";
    await mkdir(directory);
    await writeFile(outside, "private");
    await symlink(outside, join(directory, name));

    await expect(
      createFileSystemContentSource({
        projectId: "project",
        assets: [createAsset(name)],
        folders,
        assetsDirectory: directory,
      }).openSnapshot()
    ).rejects.toThrow("outside the assets directory");
  });

  test("invalidates a snapshot when the assets directory symlink changes", async () => {
    const parent = await createTemporaryDirectory();
    const firstDirectory = join(parent, "first");
    const secondDirectory = join(parent, "second");
    const linkedDirectory = join(parent, "assets");
    const name = "hello_hash.md";
    await mkdir(firstDirectory);
    await mkdir(secondDirectory);
    await writeFile(join(firstDirectory, name), "first");
    await writeFile(join(secondDirectory, name), "second");
    await symlink(firstDirectory, linkedDirectory);
    const snapshot = await createFileSystemContentSource({
      projectId: "project",
      assets: [createAsset(name)],
      folders,
      assetsDirectory: linkedDirectory,
    }).openSnapshot();

    await rm(linkedDirectory);
    await symlink(secondDirectory, linkedDirectory);

    await expect(snapshot.isCurrent()).resolves.toBe(false);
  });

  test("invalidates a snapshot when an asset symlink changes", async () => {
    const directory = await createTemporaryDirectory();
    const first = join(directory, "first.md");
    const second = join(directory, "second.md");
    const name = "hello_hash.md";
    const linkedFile = join(directory, name);
    await writeFile(first, "first");
    await writeFile(second, "second");
    await symlink(first, linkedFile);
    const snapshot = await createFileSystemContentSource({
      projectId: "project",
      assets: [createAsset(name)],
      folders,
      assetsDirectory: directory,
    }).openSnapshot();

    await rm(linkedFile);
    await symlink(second, linkedFile);

    await expect(snapshot.isCurrent()).resolves.toBe(false);
  });
});
