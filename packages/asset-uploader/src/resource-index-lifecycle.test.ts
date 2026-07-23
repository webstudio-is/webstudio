import { beforeEach, describe, expect, test, vi } from "vitest";
import { generateObjectExpression, type Resource } from "@webstudio-is/sdk";

const loadCanonicalAssetFileSnapshot = vi.hoisted(() => vi.fn());
const synchronizeCanonicalAssets = vi.hoisted(() => vi.fn());
const buildPersistAndActivateAssetResourceIndex = vi.hoisted(() => vi.fn());
const deleteAssetResourceIndexQuery = vi.hoisted(() => vi.fn());
const collectAssetResourceIndexGarbageBestEffort = vi.hoisted(() => vi.fn());

import {
  getAssetResourceQuery,
  synchronizeAssetResourceIndexQueries,
} from "./resource-index-lifecycle";

const resource = (id: string, query: string): Resource => ({
  id,
  name: id,
  control: "system",
  method: "post",
  url: JSON.stringify("/$resources/assets/query"),
  headers: [],
  body: generateObjectExpression(
    new Map([
      ["query", JSON.stringify(query)],
      ["parameters", "{}"],
      ["resultLimit", "20"],
      ["content", '{"mode":"none"}'],
    ])
  ),
});
const dependencies = {
  loadCanonicalAssetFileSnapshot,
  synchronizeCanonicalAssets,
  buildPersistAndActivateAssetResourceIndex,
  deleteAssetResourceIndexQuery,
  collectAssetResourceIndexGarbageBestEffort,
};
const source = { buildId: "build-1", resources: "[]" };

describe("asset resource query lifecycle", () => {
  beforeEach(() => {
    loadCanonicalAssetFileSnapshot.mockReset().mockResolvedValue({
      entries: [],
      metadataSnapshot: [],
    });
    synchronizeCanonicalAssets.mockReset().mockResolvedValue({});
    buildPersistAndActivateAssetResourceIndex.mockReset().mockResolvedValue({});
    deleteAssetResourceIndexQuery.mockReset().mockResolvedValue(true);
    collectAssetResourceIndexGarbageBestEffort.mockReset();
  });

  test("extracts only fixed queryable-asset GROQ definitions", () => {
    expect(getAssetResourceQuery(resource("posts", "*[]"))).toBe("*[]");
    expect(
      getAssetResourceQuery({
        ...resource("external", "*[]"),
        url: JSON.stringify("https://example.com"),
      })
    ).toBeUndefined();
  });

  test("rebuilds only created and changed queries from one canonical load", async () => {
    const previous = [
      resource("changed", "*[false]"),
      resource("unchanged", "*[]"),
    ];
    const current = [
      resource("changed", "*[]"),
      resource("created", "*[]"),
      resource("unchanged", "*[]"),
    ];
    await expect(
      synchronizeAssetResourceIndexQueries({
        client: {} as never,
        assetClient: {
          resourceIndexStore: { delete: vi.fn() },
        } as never,
        projectId: "project-1",
        previousResources: previous,
        resources: current,
        source,
        dependencies,
      })
    ).resolves.toEqual({
      deletedResourceIds: [],
      updatedResourceIds: ["changed", "created"],
    });
    expect(loadCanonicalAssetFileSnapshot).toHaveBeenCalledOnce();
    expect(synchronizeCanonicalAssets).toHaveBeenCalledOnce();
    expect(buildPersistAndActivateAssetResourceIndex).toHaveBeenCalledTimes(2);
    expect(collectAssetResourceIndexGarbageBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        resourceIds: ["changed", "created"],
      })
    );
  });

  test("deletes index ownership when a query is deleted or changed away", async () => {
    const external = {
      ...resource("changed-away", "*[]"),
      url: JSON.stringify("https://example.com"),
    };
    await expect(
      synchronizeAssetResourceIndexQueries({
        client: {} as never,
        assetClient: { resourceIndexStore: {} } as never,
        projectId: "project-1",
        previousResources: [
          resource("deleted", "*[]"),
          resource("changed-away", "*[]"),
        ],
        resources: [external],
        source,
        dependencies,
      })
    ).resolves.toEqual({
      deletedResourceIds: ["changed-away", "deleted"],
      updatedResourceIds: [],
    });
    expect(deleteAssetResourceIndexQuery).toHaveBeenCalledTimes(2);
    expect(deleteAssetResourceIndexQuery).toHaveBeenCalledWith(
      expect.objectContaining({ source })
    );
    expect(loadCanonicalAssetFileSnapshot).not.toHaveBeenCalled();
    expect(synchronizeCanonicalAssets).not.toHaveBeenCalled();
  });

  test("continues independent query work and cleanup after a failure", async () => {
    buildPersistAndActivateAssetResourceIndex
      .mockRejectedValueOnce(new Error("first build failed"))
      .mockResolvedValueOnce({});

    await expect(
      synchronizeAssetResourceIndexQueries({
        client: {} as never,
        assetClient: {
          resourceIndexStore: { delete: vi.fn() },
        } as never,
        projectId: "project-1",
        previousResources: [],
        resources: [resource("first", "*[]"), resource("second", "*[]")],
        source,
        dependencies,
      })
    ).rejects.toThrow("Failed to synchronize 1 asset resource index queries");

    expect(buildPersistAndActivateAssetResourceIndex).toHaveBeenCalledTimes(2);
    expect(collectAssetResourceIndexGarbageBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        resourceIds: ["first", "second"],
      })
    );
  });
});
