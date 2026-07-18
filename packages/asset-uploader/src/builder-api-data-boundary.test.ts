import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import {
  backfillCanonicalMarkdownAssets,
  rebuildCanonicalMarkdownMetadata,
  recoverCanonicalMarkdownMetadata,
  synchronizeCanonicalMarkdownAssets,
} from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { loadBuilderAssetFieldCatalog } from "./field-catalog";
import { previewAssetResourceQuery } from "./query-preview";

const rescanOperations = vi.hoisted(() => ({
  backfillCanonicalMarkdownAssets: vi.fn(),
  rebuildCanonicalMarkdownMetadata: vi.fn(),
  recoverCanonicalMarkdownMetadata: vi.fn(),
  synchronizeCanonicalMarkdownAssets: vi.fn(),
}));

vi.mock("@webstudio-is/trpc-interface/index.server", () => ({
  authorizeProject: { hasProjectPermit: vi.fn() },
  AuthorizationError: class AuthorizationError extends Error {},
}));
vi.mock("./canonical-metadata-persistence", () => ({
  loadCanonicalAssetFileEntries: vi.fn(),
}));
vi.mock("./canonical-metadata-backfill", () => rescanOperations);

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

  test("catalog and preview requests use persisted rows without rescanning files", async () => {
    await loadBuilderAssetFieldCatalog({ projectId, context });
    await previewAssetResourceQuery({
      projectId,
      request: {
        query: "*[]",
        parameters: {},
        resultLimit: 1,
        content: { mode: "none" },
      },
      context,
    });

    expect(loadCanonicalAssetFileEntries).toHaveBeenCalledTimes(2);
    expect(backfillCanonicalMarkdownAssets).not.toHaveBeenCalled();
    expect(synchronizeCanonicalMarkdownAssets).not.toHaveBeenCalled();
    expect(recoverCanonicalMarkdownMetadata).not.toHaveBeenCalled();
    expect(rebuildCanonicalMarkdownMetadata).not.toHaveBeenCalled();
  });
});
