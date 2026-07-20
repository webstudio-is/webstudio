import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { loadBuilderAssetFieldCatalog } from "./field-catalog";
import { previewAssetResourceQuery } from "./query-preview";
import { synchronizeCanonicalAssets } from "./canonical-metadata-backfill";

vi.mock("@webstudio-is/trpc-interface/index.server", () => ({
  authorizeProject: { hasProjectPermit: vi.fn() },
  AuthorizationError: class AuthorizationError extends Error {},
}));
vi.mock("./canonical-metadata-persistence", () => ({
  loadCanonicalAssetFileEntries: vi.fn(),
}));
vi.mock("./canonical-metadata-backfill", () => ({
  synchronizeCanonicalAssets: vi.fn(),
}));

const projectId = "project-1";
const context = {
  postgrest: { client: {} },
} as unknown as AppContext;

describe("Builder asset-resource API data boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(true);
    vi.mocked(loadCanonicalAssetFileEntries).mockResolvedValue([]);
  });

  test("catalog and preview synchronize before reading persisted rows", async () => {
    const assetClient = { readFile: vi.fn() };
    await loadBuilderAssetFieldCatalog({ projectId, context, assetClient });
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
    });

    expect(synchronizeCanonicalAssets).toHaveBeenCalledTimes(2);
    expect(loadCanonicalAssetFileEntries).toHaveBeenCalledTimes(2);
  });
});
