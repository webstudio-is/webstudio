import { beforeEach, describe, expect, test, vi } from "vitest";
import { generateObjectExpression, type Resource } from "@webstudio-is/sdk";

const loadCanonicalAssetFileEntries = vi.hoisted(() => vi.fn());
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
  loadCanonicalAssetFileEntries,
  synchronizeCanonicalAssets,
  buildPersistAndActivateAssetResourceIndex,
  deleteAssetResourceIndexQuery,
  collectAssetResourceIndexGarbageBestEffort,
};

describe("asset resource query lifecycle", () => {
  beforeEach(() => {
    loadCanonicalAssetFileEntries.mockReset().mockResolvedValue([]);
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

  test("builds created and changed queries from one canonical load", async () => {
    const previous = [resource("changed", "*[false]")];
    const current = [resource("changed", "*[]"), resource("created", "*[]")];
    await expect(
      synchronizeAssetResourceIndexQueries({
        client: {} as never,
        assetClient: {
          resourceIndexStore: { delete: vi.fn() },
        } as never,
        projectId: "project-1",
        previousResources: previous,
        resources: current,
        dependencies,
      })
    ).resolves.toEqual({
      deletedResourceIds: [],
      updatedResourceIds: ["changed", "created"],
    });
    expect(loadCanonicalAssetFileEntries).toHaveBeenCalledOnce();
    expect(synchronizeCanonicalAssets).toHaveBeenCalledOnce();
    expect(buildPersistAndActivateAssetResourceIndex).toHaveBeenCalledTimes(2);
    expect(collectAssetResourceIndexGarbageBestEffort).toHaveBeenCalledOnce();
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
        dependencies,
      })
    ).resolves.toEqual({
      deletedResourceIds: ["changed-away", "deleted"],
      updatedResourceIds: [],
    });
    expect(deleteAssetResourceIndexQuery).toHaveBeenCalledTimes(2);
    expect(loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
    expect(synchronizeCanonicalAssets).not.toHaveBeenCalled();
  });
});
