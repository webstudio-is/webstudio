import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { loadBuilderAssetFieldCatalog } from "./field-catalog";
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
const postgrestClient = { from: vi.fn() } as never;
const context = {
  postgrest: { client: postgrestClient },
} as unknown as AppContext;
const assetClient = { readFile: vi.fn() };

describe("loadBuilderAssetFieldCatalog", () => {
  beforeEach(() => {
    vi.mocked(authorizeProject.hasProjectPermit).mockReset();
    vi.mocked(loadCanonicalAssetFileEntries).mockReset();
  });

  test("authorizes view access and derives fields from persisted metadata", async () => {
    vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(true);
    vi.mocked(loadCanonicalAssetFileEntries).mockResolvedValue([
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
    });

    expect(authorizeProject.hasProjectPermit).toHaveBeenCalledWith(
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
    vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(false);

    await expect(
      loadBuilderAssetFieldCatalog({ projectId, context, assetClient })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
  });
});
