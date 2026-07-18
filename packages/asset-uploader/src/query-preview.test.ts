import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import { previewAssetResourceQuery } from "./query-preview";

vi.mock("@webstudio-is/trpc-interface/index.server", () => ({
  authorizeProject: { hasProjectPermit: vi.fn() },
  AuthorizationError: class AuthorizationError extends Error {},
}));
vi.mock("./canonical-metadata-persistence", () => ({
  loadCanonicalAssetFileEntries: vi.fn(),
}));

const projectId = "project-1";
const postgrestClient = { from: vi.fn() } as never;
const context = {
  postgrest: { client: postgrestClient },
} as unknown as AppContext;
const revision = `sha256:${"b".repeat(64)}`;

describe("previewAssetResourceQuery", () => {
  beforeEach(() => {
    vi.mocked(authorizeProject.hasProjectPermit).mockReset();
    vi.mocked(loadCanonicalAssetFileEntries).mockReset();
  });

  test("evaluates persisted canonical metadata without reading files", async () => {
    vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(true);
    vi.mocked(loadCanonicalAssetFileEntries).mockResolvedValue([
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
    vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(false);
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
      })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
  });

  test("hydrates only identities retained by the query result", async () => {
    vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(true);
    vi.mocked(loadCanonicalAssetFileEntries).mockResolvedValue([
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
    });

    expect(result.content["post-1"]?.text).toBe("Post");
    expect(result.meta).toMatchObject({
      hydratedFileCount: 1,
      hydratedBytes: 4,
    });
    expect(readFile).toHaveBeenCalledOnce();
  });

  test("hydrates exactly one complete file selected by a slug detail query", async () => {
    vi.mocked(authorizeProject.hasProjectPermit).mockResolvedValue(true);
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
    vi.mocked(loadCanonicalAssetFileEntries).mockResolvedValue(entries);
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
});
