import { beforeEach, describe, expect, test, vi } from "vitest";
import { type AppContext } from "@webstudio-is/trpc-interface/index.server";
import { createAssetIndex } from "@webstudio-is/content-engine/compiler";
import { loadBuilderAssetFieldCatalog } from "./field-catalog";
import { previewAssetResourceQuery } from "./query-preview";

const projectId = "project-1";
const context = {
  postgrest: { client: {} },
} as unknown as AppContext;
const hasProjectPermit = vi.fn();
const readFieldCatalog = vi.fn();
const query = vi.fn();
const dependencies = {
  hasProjectPermit,
  createRepository: () => ({ readFieldCatalog, query }),
};

describe("Builder asset-resource API data boundary", () => {
  beforeEach(async () => {
    hasProjectPermit.mockReset().mockResolvedValue(true);
    readFieldCatalog.mockReset();
    readFieldCatalog.mockResolvedValue(
      (await createAssetIndex({ projectId, entries: [] })).fieldCatalog
    );
    query.mockResolvedValue({ items: [], totalCount: 0, hasMore: false });
  });

  test("catalog and preview read maintained rows without reconciliation", async () => {
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

    expect(readFieldCatalog).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledOnce();
  });
});
