import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { loadBuilderAssetFieldCatalog } from "./field-catalog";
import { previewAssetResourceQuery } from "./query-preview";

vi.mock("@webstudio-is/trpc-interface/index.server", () => ({
  authorizeProject: { hasProjectPermit: vi.fn() },
  AuthorizationError: class AuthorizationError extends Error {},
}));
vi.mock("./canonical-metadata-persistence", () => ({
  loadCanonicalAssetFileEntries: vi.fn(),
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
  });
});
