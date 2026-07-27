import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import {
  AssetIndexRevisionError,
  executeAssetQuery,
} from "@webstudio-is/content-engine";
import { createAssetIndex } from "@webstudio-is/content-engine/compiler";
import type { AssetQueryRequestInput } from "@webstudio-is/sdk";
import type { AssetObjectReader } from "./client";
import { previewAssetResourceQuery } from "./query-preview";

const projectId = "project-1";
const postgrestClient = { from: vi.fn() } as never;
const context = {
  postgrest: { client: postgrestClient },
} as unknown as AppContext;
const revision = `sha256:${"b".repeat(64)}`;
const hasProjectPermit = vi.fn();
const prepareIndex = vi.fn();
const query = vi.fn(
  async (request: AssetQueryRequestInput, assetClient: AssetObjectReader) => {
    const index = await prepareIndex();
    if (
      request.indexRevision !== undefined &&
      request.indexRevision !== index.integrity.checksum
    ) {
      throw new AssetIndexRevisionError();
    }
    return await executeAssetQuery({
      query: request.query,
      catalog: index.fieldCatalog,
      documents: index.documents,
      read: assetClient.readFile,
    });
  }
);
const dependencies = {
  hasProjectPermit,
  createRepository: ({ assetClient }: { assetClient: AssetObjectReader }) => ({
    readFieldCatalog: vi.fn(),
    query: (request: AssetQueryRequestInput) => query(request, assetClient),
  }),
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
});

describe("previewAssetResourceQuery", () => {
  beforeEach(() => {
    hasProjectPermit.mockReset();
    prepareIndex.mockReset();
    query.mockClear();
  });

  test("evaluates the shared canonical metadata index without reading files", async () => {
    hasProjectPermit.mockResolvedValue(true);
    prepareIndex.mockResolvedValue(
      await createAssetIndex({
        projectId,
        entries: [canonicalEntry({ slug: "post", size: 100 })],
      })
    );
    const readFile = vi.fn();

    const result = await previewAssetResourceQuery({
      projectId,
      request: {
        query: {
          where: {
            all: [
              {
                field: ["properties", "slug"],
                operator: "eq",
                value: "post",
              },
            ],
          },
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
    expect(prepareIndex).toHaveBeenCalledOnce();
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
    expect(prepareIndex).not.toHaveBeenCalled();
  });

  test("rejects a stale requested index revision", async () => {
    hasProjectPermit.mockResolvedValue(true);
    prepareIndex.mockResolvedValue(
      await createAssetIndex({
        projectId,
        entries: [canonicalEntry({ slug: "post" })],
      })
    );

    await expect(
      previewAssetResourceQuery({
        projectId,
        request: { query: {}, indexRevision: `sha256:${"0".repeat(64)}` },
        context,
        assetClient: { readFile: vi.fn() },
        dependencies,
      })
    ).rejects.toMatchObject({
      name: "AssetIndexRevisionError",
      message: "The requested asset index revision is stale",
    });
  });

  test("hydrates exactly the selected detail file", async () => {
    hasProjectPermit.mockResolvedValue(true);
    prepareIndex.mockResolvedValue(
      await createAssetIndex({
        projectId,
        entries: [
          canonicalEntry({ slug: "first", size: 5 }),
          canonicalEntry({ slug: "selected", size: 8 }),
        ],
      })
    );
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
          where: {
            all: [
              {
                field: ["properties", "slug"],
                operator: "eq",
                value: "selected",
              },
            ],
          },
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
    prepareIndex.mockRejectedValue(new Error("document limit"));

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
