import { beforeEach, describe, expect, test, vi } from "vitest";
import { createAssetQueryResourceBody, type Resource } from "@webstudio-is/sdk";

const loadCanonicalAssetFileSnapshot = vi.hoisted(() => vi.fn());
const synchronizeCanonicalAssets = vi.hoisted(() => vi.fn());
const buildPersistAndActivateAssetResourceIndex = vi.hoisted(() => vi.fn());
const deleteAssetResourceIndexQuery = vi.hoisted(() => vi.fn());
const collectAssetResourceIndexGarbageBestEffort = vi.hoisted(() => vi.fn());
const loadOwnedAssetResourceIndexIds = vi.hoisted(() => vi.fn());

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
  body: createAssetQueryResourceBody({ query, variables: [] }),
});
const dependencies = {
  loadCanonicalAssetFileSnapshot,
  synchronizeCanonicalAssets,
  buildPersistAndActivateAssetResourceIndex,
  deleteAssetResourceIndexQuery,
  collectAssetResourceIndexGarbageBestEffort,
  loadOwnedAssetResourceIndexIds,
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
    loadOwnedAssetResourceIndexIds.mockReset().mockResolvedValue([]);
  });

  test("extracts only fixed queryable-asset GraphQL definitions", () => {
    const query = "{ assets { items { id } } }";
    expect(getAssetResourceQuery(resource("posts", query))).toBe(query);
    expect(
      getAssetResourceQuery({
        ...resource("external", query),
        url: JSON.stringify("https://example.com"),
      })
    ).toBeUndefined();
  });

  test("rebuilds only created and changed queries from one canonical load", async () => {
    const previous = [
      resource("changed", "{ assets(first: 1) { items { id } } }"),
      resource("unchanged", "{ assets { items { id } } }"),
    ];
    const current = [
      resource("changed", "{ assets(first: 2) { items { id } } }"),
      resource("created", "{ assets { items { path } } }"),
      resource("unchanged", "{ assets { items { id } } }"),
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

  test("rebuilds only index-affecting changes to an existing query resource", async () => {
    const query = "{ assets { items { id } } }";
    const previous = resource("posts", query);
    const configured = resource("configured", query);

    await expect(
      synchronizeAssetResourceIndexQueries({
        client: {} as never,
        assetClient: { resourceIndexStore: {} } as never,
        projectId: "project-1",
        previousResources: [previous, configured],
        resources: [
          {
            ...previous,
            name: "Renamed",
            headers: [{ name: "x", value: "y" }],
          },
          resource("configured", "{ assets(first: 30) { items { id } } }"),
        ],
        source,
        dependencies,
      })
    ).resolves.toEqual({
      deletedResourceIds: [],
      updatedResourceIds: ["configured"],
    });
    expect(buildPersistAndActivateAssetResourceIndex).toHaveBeenCalledOnce();
    expect(buildPersistAndActivateAssetResourceIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: "configured",
        query: "{ assets(first: 30) { items { id } } }",
      })
    );
  });

  test("deletes index ownership when a query is deleted or changed away", async () => {
    const external = {
      ...resource("changed-away", "{ assets { items { id } } }"),
      url: JSON.stringify("https://example.com"),
    };
    await expect(
      synchronizeAssetResourceIndexQueries({
        client: {} as never,
        assetClient: { resourceIndexStore: {} } as never,
        projectId: "project-1",
        previousResources: [
          resource("deleted", "{ assets { items { id } } }"),
          resource("changed-away", "{ assets { items { id } } }"),
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

  test("repairs persisted ownership left by an earlier failed deletion", async () => {
    loadOwnedAssetResourceIndexIds.mockResolvedValueOnce([
      "current",
      "orphaned",
    ]);

    await expect(
      synchronizeAssetResourceIndexQueries({
        client: {} as never,
        assetClient: { resourceIndexStore: {} } as never,
        projectId: "project-1",
        previousResources: [resource("current", "{ assets { items { id } } }")],
        resources: [resource("current", "{ assets { items { id } } }")],
        source,
        dependencies,
      })
    ).resolves.toEqual({
      deletedResourceIds: ["orphaned"],
      updatedResourceIds: [],
    });
    expect(deleteAssetResourceIndexQuery).toHaveBeenCalledOnce();
    expect(deleteAssetResourceIndexQuery).toHaveBeenCalledWith({
      client: {},
      projectId: "project-1",
      resourceId: "orphaned",
      source,
    });
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
        resources: [
          resource("first", "{ assets { items { id } } }"),
          resource("second", "{ assets { items { path } } }"),
        ],
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
