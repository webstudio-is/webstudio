import { beforeEach, describe, expect, test, vi } from "vitest";
import { type AppContext } from "@webstudio-is/trpc-interface/index.server";
import { loadBuilderAssetFieldCatalog } from "./field-catalog";
import { previewAssetResourceQuery } from "./query-preview";

const projectId = "project-1";
const context = {
  postgrest: { client: {} },
} as unknown as AppContext;
const hasProjectPermit = vi.fn();
const synchronizeCanonicalAssets = vi.fn();
const loadCanonicalAssetFileEntries = vi.fn();
const dependencies = {
  hasProjectPermit,
  synchronizeCanonicalAssets,
  loadCanonicalAssetFileEntries,
};

describe("Builder asset-resource API data boundary", () => {
  beforeEach(() => {
    hasProjectPermit.mockReset().mockResolvedValue(true);
    synchronizeCanonicalAssets.mockReset();
    loadCanonicalAssetFileEntries.mockReset().mockResolvedValue([]);
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
      request: {
        query: "*[]",
        parameters: {},
        resultLimit: 1,
        content: { mode: "none" },
      },
      context,
      assetClient,
      dependencies,
    });

    expect(synchronizeCanonicalAssets).toHaveBeenCalledTimes(2);
    expect(loadCanonicalAssetFileEntries).toHaveBeenCalledTimes(2);
  });
});
