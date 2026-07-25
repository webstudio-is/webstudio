import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createStructuredAssetQueryResourceBody,
  type Resource,
} from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { synchronizeAssetResourcesAfterBuildPatch } from "./synchronize-asset-resource-patch.server";

const synchronizeBuildChanges = vi.fn();
const createRepository = vi.fn(() => ({ synchronizeBuildChanges }));
const createAssetClient = vi.fn(() => ({
  readFile: vi.fn(),
  uploadFile: vi.fn(),
}));
const dependencies = {
  createAssetClient,
  createRepository,
} satisfies Exclude<
  Parameters<typeof synchronizeAssetResourcesAfterBuildPatch>[1],
  undefined
>;
const context = {
  postgrest: { client: { from: vi.fn() } },
} as unknown as AppContext;

const createQueryResource = (): Resource => ({
  id: "posts",
  name: "Posts",
  control: "system",
  method: "post",
  url: JSON.stringify("/$resources/assets"),
  headers: [],
  body: createStructuredAssetQueryResourceBody({
    where: { all: [] },
    sort: [],
    limit: "20",
    offset: "0",
    content: { mode: "none" },
  }),
});

describe("asset metadata synchronization", () => {
  beforeEach(() => vi.clearAllMocks());

  test("indexes all assets when a query is enabled", async () => {
    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: "[]",
        resources: JSON.stringify([createQueryResource()]),
        changes: [],
      },
      dependencies
    );

    expect(synchronizeBuildChanges).toHaveBeenCalledWith({
      changes: [],
      force: true,
    });
  });

  test("does no indexing work without a configured query", async () => {
    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: "[]",
        resources: "[]",
        changes: [],
        replaceAllAssets: true,
      },
      dependencies
    );

    expect(createAssetClient).not.toHaveBeenCalled();
    expect(createRepository).not.toHaveBeenCalled();
  });

  test("does not fail a committed patch when resource metadata is malformed", async () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      synchronizeAssetResourcesAfterBuildPatch(
        {
          context,
          buildId: "build-1",
          projectId: "project-1",
          resources: "not-json",
          changes: [],
        },
        dependencies
      )
    ).resolves.toBeUndefined();

    expect(report).toHaveBeenCalledWith(
      "Asset metadata synchronization failed",
      expect.any(SyntaxError)
    );
    report.mockRestore();
    expect(createAssetClient).not.toHaveBeenCalled();
  });

  test("updates standard metadata for renamed or moved assets", async () => {
    const resource = createQueryResource();
    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: JSON.stringify([resource]),
        resources: JSON.stringify([resource]),
        changes: [
          {
            namespace: "assets",
            patches: [
              { op: "replace", path: ["asset-1", "filename"], value: "Post" },
              {
                op: "replace",
                path: ["asset-2", "folderId"],
                value: "folder-1",
              },
            ],
          },
        ],
      },
      dependencies
    );

    expect(synchronizeBuildChanges).toHaveBeenCalledWith({
      changes: [
        {
          namespace: "assets",
          patches: [
            { op: "replace", path: ["asset-1", "filename"], value: "Post" },
            {
              op: "replace",
              path: ["asset-2", "folderId"],
              value: "folder-1",
            },
          ],
        },
      ],
      force: false,
    });
  });

  test("fully reindexes assets whose stored content reference changes", async () => {
    const resource = createQueryResource();
    await synchronizeAssetResourcesAfterBuildPatch(
      {
        context,
        buildId: "build-1",
        projectId: "project-1",
        previousResources: JSON.stringify([resource]),
        resources: JSON.stringify([resource]),
        changes: [
          {
            namespace: "assets",
            patches: [
              {
                op: "replace",
                path: ["asset-1", "name"],
                value: "revision.md",
              },
            ],
          },
        ],
      },
      dependencies
    );

    expect(synchronizeBuildChanges).toHaveBeenCalledWith({
      changes: [
        {
          namespace: "assets",
          patches: [
            {
              op: "replace",
              path: ["asset-1", "name"],
              value: "revision.md",
            },
          ],
        },
      ],
      force: false,
    });
  });
});
