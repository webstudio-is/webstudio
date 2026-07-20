import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { loadBuilderAssetFieldCatalog } from "./field-catalog";

const projectId = "project-1";
const postgrestClient = { from: vi.fn() } as never;
const context = {
  postgrest: { client: postgrestClient },
} as unknown as AppContext;
const assetClient = { readFile: vi.fn() };
const hasProjectPermit = vi.fn();
const synchronizeCanonicalAssets = vi.fn();
const loadCanonicalAssetFileEntries = vi.fn();
const dependencies = {
  hasProjectPermit,
  synchronizeCanonicalAssets,
  loadCanonicalAssetFileEntries,
};

describe("loadBuilderAssetFieldCatalog", () => {
  beforeEach(() => {
    hasProjectPermit.mockReset();
    loadCanonicalAssetFileEntries.mockReset();
    synchronizeCanonicalAssets.mockReset();
  });

  test("authorizes view access and derives fields from persisted metadata", async () => {
    hasProjectPermit.mockResolvedValue(true);
    loadCanonicalAssetFileEntries.mockResolvedValue([
      {
        projectId,
        assetId: "post-1",
        revision: `sha256:${"b".repeat(64)}`,
        document: {
          _id: "post-1",
          _type: "asset.file",
          name: "post.md",
          path: "blog/post.md",
          key: "blog/post.md",
          extension: "md",
          mimeType: "text/markdown",
          size: 100,
          revision: `sha256:${"b".repeat(64)}`,
          contentRef: "assets/post-1",
          properties: { title: "Post" },
        },
        fieldContributions: [{ path: "properties.title", type: "string" }],
      },
    ]);

    const result = await loadBuilderAssetFieldCatalog({
      projectId,
      context,
      assetClient,
      dependencies,
    });

    expect(hasProjectPermit).toHaveBeenCalledWith(
      { projectId, permit: "view" },
      context
    );
    expect(loadCanonicalAssetFileEntries).toHaveBeenCalledWith({
      client: postgrestClient,
      projectId,
    });
    expect(synchronizeCanonicalAssets).toHaveBeenCalledOnce();
    expect(result.fields["properties.title"]).toEqual({
      types: ["string"],
      occurrences: 1,
    });
  });

  test("does not load metadata without view access", async () => {
    hasProjectPermit.mockResolvedValue(false);

    await expect(
      loadBuilderAssetFieldCatalog({
        projectId,
        context,
        assetClient,
        dependencies,
      })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
  });
});
