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

describe("previewAssetResourceQuery", () => {
  beforeEach(() => {
    hasProjectPermit.mockReset();
    synchronizeCanonicalAssets.mockReset();
    loadCanonicalAssetFileEntries.mockReset();
  });

  test("evaluates persisted canonical metadata without reading files", async () => {
    hasProjectPermit.mockResolvedValue(true);
    loadCanonicalAssetFileEntries.mockResolvedValue([
      {
        projectId,
        assetId: "post-1",
        revision,
        document: {
          _id: "post-1",
          _type: "asset.file",
          name: "post.md",
          path: "blog/post.md",
          key: "post",
          extension: "md",
          mimeType: "text/markdown",
          size: 100,
          revision,
          contentRef: "assets/post-1",
          properties: { slug: "post" },
        },
        fieldContributions: [{ path: "properties.slug", type: "string" }],
      },
    ]);

    const readFile = vi.fn();
    const result = await previewAssetResourceQuery({
      projectId,
      request: {
        query: "*[properties.slug == $slug]{_id}",
        parameters: { slug: "post" },
        resultLimit: 1,
        content: { mode: "none" },
      },
      context,
      assetClient: { readFile },
      dependencies,
    });

    expect(result.result).toEqual([{ _id: "post-1" }]);
    expect(result.meta.indexRevision).toMatch(/^metadata:sha256:/);
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
        request: {
          query: "*[]",
          parameters: {},
          resultLimit: 1,
          content: { mode: "none" },
        },
        context,
        assetClient: { readFile: vi.fn() },
        dependencies,
      })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
  });

  test("hydrates only identities retained by the query result", async () => {
    hasProjectPermit.mockResolvedValue(true);
    loadCanonicalAssetFileEntries.mockResolvedValue([
      {
        projectId,
        assetId: "post-1",
        revision,
        document: {
          _id: "post-1",
          _type: "asset.file",
          name: "post.md",
          path: "blog/post.md",
          key: "post",
          extension: "md",
          mimeType: "text/markdown",
          size: 4,
          revision,
          contentRef: "assets/post-1",
          properties: { slug: "post" },
        },
        fieldContributions: [{ path: "properties.slug", type: "string" }],
      },
    ]);
    const readFile = vi.fn(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield new TextEncoder().encode("Post");
        },
      },
      contentLength: 4,
    }));

    const result = await previewAssetResourceQuery({
      projectId,
      request: {
        query: "*[0]{_id, revision, contentRef}",
        parameters: {},
        resultLimit: 1,
        content: { mode: "full" },
      },
      context,
      assetClient: { readFile },
      dependencies,
    });

    expect(result.content["post-1"]?.text).toBe("Post");
    expect(result.meta).toMatchObject({
      hydratedFileCount: 1,
      hydratedBytes: 4,
    });
    expect(readFile).toHaveBeenCalledOnce();
  });

  test("hydrates exactly one complete file selected by a slug detail query", async () => {
    hasProjectPermit.mockResolvedValue(true);
    const entries = ["first", "selected"].map((slug) => ({
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
        size: slug.length,
        revision,
        contentRef: `assets/post-${slug}`,
        properties: { slug },
      },
      fieldContributions: [
        { path: "properties.slug", type: "string" as const },
      ],
    }));
    loadCanonicalAssetFileEntries.mockResolvedValue(entries);
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
        query: "*[properties.slug == $slug][0]{_id, revision, contentRef}",
        parameters: { slug: "selected" },
        resultLimit: 1,
        content: { mode: "full" },
      },
      context,
      assetClient: { readFile },
      dependencies,
    });

    expect(result.content).toEqual({
      "post-selected": {
        _id: "post-selected",
        revision,
        contentRef: "assets/post-selected",
        encoding: "utf-8",
        text: "selected",
      },
    });
    expect(readFile).toHaveBeenCalledOnce();
    expect(readFile).toHaveBeenCalledWith("assets/post-selected", {
      offset: 0,
      length: 8,
    });
  });

  test("applies static candidate selection before the candidate limit", async () => {
    hasProjectPermit.mockResolvedValue(true);
    loadCanonicalAssetFileEntries.mockResolvedValue(
      Array.from({ length: 1001 }, (_, index) => {
        const selected = index === 1000;
        const assetId = `asset-${index}`;
        return {
          projectId,
          assetId,
          revision,
          document: {
            _id: assetId,
            _type: "asset.file" as const,
            name: `${index}.md`,
            path: selected ? "blog/selected.md" : `other/${index}.md`,
            key: `${index}`,
            extension: "md",
            mimeType: "text/markdown",
            size: 1,
            revision,
            contentRef: `assets/${assetId}`,
            properties: {},
          },
          fieldContributions: [],
        };
      })
    );

    const result = await previewAssetResourceQuery({
      projectId,
      request: {
        query: '*[path match "blog/**"]{_id}',
        parameters: {},
        resultLimit: 1,
        content: { mode: "none" },
      },
      context,
      assetClient: { readFile: vi.fn() },
      dependencies,
    });

    expect(result.result).toEqual([{ _id: "asset-1000" }]);
  });
});
