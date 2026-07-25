import { beforeEach, describe, expect, test, vi } from "vitest";
import { type AppContext } from "@webstudio-is/trpc-interface/index.server";
import { createAssetIndex } from "@webstudio-is/asset-resource";
import { loadBuilderAssetFieldCatalog } from "./field-catalog";
import { previewAssetResourceQuery } from "./query-preview";

const projectId = "project-1";
const context = {
  postgrest: { client: {} },
} as unknown as AppContext;
const hasProjectPermit = vi.fn();
const prepareIndex = vi.fn();
const query = vi.fn();
const dependencies = {
  hasProjectPermit,
  createRepository: () => ({ prepareIndex, query }),
};

describe("Builder asset-resource API data boundary", () => {
  beforeEach(async () => {
    hasProjectPermit.mockReset().mockResolvedValue(true);
    prepareIndex.mockReset();
    prepareIndex.mockResolvedValue(
      await createAssetIndex({ projectId, entries: [] })
    );
    query.mockResolvedValue({ items: [], totalCount: 0, hasMore: false });
  });

  test("catalog and preview synchronize before reading persisted rows", async () => {
    const assetClient = { readFile: vi.fn() };
    await loadBuilderAssetFieldCatalog({
      projectId,
      context,
      assetClient,
      dependencies,
    });
    await previewAssetResourceQuery({
      projectId,
      request: { query: { limit: 1 } },
      context,
      assetClient,
      dependencies,
    });

    expect(prepareIndex).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledOnce();
  });
});
