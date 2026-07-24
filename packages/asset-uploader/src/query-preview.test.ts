import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { previewAssetResourceQuery } from "./query-preview";

const projectId = "project-1";
const postgrestClient = { from: vi.fn() } as never;
const context = {
  postgrest: { client: postgrestClient },
} as unknown as AppContext;
const revision = `sha256:${"b".repeat(64)}`;
const hasProjectPermit = vi.fn();
const synchronizeCanonicalAssets = vi.fn();
const loadCanonicalAssetFileEntries = vi.fn();
const dependencies = {
  hasProjectPermit,
  synchronizeCanonicalAssets,
  loadCanonicalAssetFileEntries,
};

const canonicalEntry = ({
  slug,
  size = 4,
}: {
  slug: string;
  size?: number;
}) => ({
  projectId,
  assetId: `post-${slug}`,
  revision,
  document: {
    _id: `post-${slug}`,
    _type: "asset.file" as const,
    name: `${slug}.md`,
    path: `blog/${slug}.md`,
    key: slug,
    extension: "md",
    mimeType: "text/markdown",
    size,
    revision,
    contentRef: `assets/post-${slug}`,
    properties: { slug },
  },
  fieldContributions: [{ path: "properties.slug", type: "string" as const }],
});

describe("previewAssetResourceQuery", () => {
  beforeEach(() => {
    hasProjectPermit.mockReset();
    synchronizeCanonicalAssets.mockReset();
    loadCanonicalAssetFileEntries.mockReset();
  });

  test("evaluates the shared canonical metadata index without reading files", async () => {
    hasProjectPermit.mockResolvedValue(true);
    loadCanonicalAssetFileEntries.mockResolvedValue([
      canonicalEntry({ slug: "post", size: 100 }),
    ]);
    const readFile = vi.fn();

    const result = await previewAssetResourceQuery({
      projectId,
      request: {
        query: {
          filters: [
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "post",
            },
          ],
          limit: 1,
        },
      },
      context,
      assetClient: { readFile },
      dependencies,
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: "post-post",
        properties: { slug: "post" },
      }),
    ]);
    expect(loadCanonicalAssetFileEntries).toHaveBeenCalledWith({
      client: postgrestClient,
      projectId,
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  test("does not load metadata without view access", async () => {
    hasProjectPermit.mockResolvedValue(false);
    await expect(
      previewAssetResourceQuery({
        projectId,
        request: { query: {} },
        context,
        assetClient: { readFile: vi.fn() },
        dependencies,
      })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
  });

  test("hydrates exactly the selected detail file", async () => {
    hasProjectPermit.mockResolvedValue(true);
    loadCanonicalAssetFileEntries.mockResolvedValue([
      canonicalEntry({ slug: "first", size: 5 }),
      canonicalEntry({ slug: "selected", size: 8 }),
    ]);
    const readFile = vi.fn(async (contentRef: string) => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield new TextEncoder().encode(
            contentRef === "assets/post-selected" ? "selected" : "first"
          );
        },
      },
      contentLength: contentRef === "assets/post-selected" ? 8 : 5,
    }));

    const result = await previewAssetResourceQuery({
      projectId,
      request: {
        query: {
          filters: [
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "selected",
            },
          ],
          limit: 1,
          content: { mode: "full" },
        },
      },
      context,
      assetClient: { readFile },
      dependencies,
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: "post-selected",
        content: { encoding: "utf-8", text: "selected" },
      }),
    ]);
    expect(readFile).toHaveBeenCalledOnce();
    expect(readFile).toHaveBeenCalledWith("assets/post-selected", {
      offset: 0,
      length: 8,
    });
  });

  test("rejects metadata sets beyond the shared index limit", async () => {
    hasProjectPermit.mockResolvedValue(true);
    loadCanonicalAssetFileEntries.mockResolvedValue(
      Array.from({ length: 1001 }, (_, index) =>
        canonicalEntry({ slug: String(index), size: 1 })
      )
    );

    await expect(
      previewAssetResourceQuery({
        projectId,
        request: { query: {} },
        context,
        assetClient: { readFile: vi.fn() },
        dependencies,
      })
    ).rejects.toThrow("document limit");
  });
});
