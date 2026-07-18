import { describe, expect, test, vi } from "vitest";
import { assetResourceLimits, type AssetFileDocument } from "@webstudio-is/sdk";
import { loadResource } from "@webstudio-is/sdk/runtime";
import {
  AssetResourceQueryExecutionError,
  createAssetResourceRequest,
  evaluateAssetResourceQuery,
  executeAssetResourceQuery,
  parseAssetResourceQuery,
} from "./index";

const createDocument = (
  id: string,
  properties: AssetFileDocument["properties"],
  overrides: Partial<AssetFileDocument> = {}
): AssetFileDocument => ({
  _id: id,
  _type: "asset.file",
  name: `${id}.md`,
  path: `blog/${id}.md`,
  key: id,
  folderId: "blog",
  extension: "md",
  mimeType: "text/markdown",
  size: 100,
  revision: `revision-${id}`,
  contentRef: `content-${id}`,
  properties,
  excerpt: `Excerpt ${id}`,
  ...overrides,
});

const documents = [
  createDocument("alpha", {
    title: "Alpha",
    slug: "alpha",
    publishedAt: "2026-07-16",
    draft: false,
    author: { name: "Ada" },
  }),
  createDocument("beta", {
    title: "Beta",
    slug: "beta",
    publishedAt: "2026-07-18",
    draft: false,
    author: { name: "Ben" },
  }),
  createDocument("draft", {
    title: "Draft",
    slug: "draft",
    publishedAt: "2026-07-19",
    draft: true,
  }),
  createDocument(
    "image",
    { title: "Image" },
    {
      name: "image.png",
      path: "blog/image.png",
      extension: "png",
      mimeType: "image/png",
    }
  ),
];

describe("GROQ feasibility", () => {
  test("filters, orders, slices, and projects schema-less fields", async () => {
    const tree = parseAssetResourceQuery(`
      *[
        _type == "asset.file" &&
        folderId == $folderId &&
        extension == "md" &&
        properties.draft != true
      ]
      | order(properties.publishedAt desc, _id asc)
      [0...2] {
        _id,
        "title": properties.title,
        "slug": properties.slug,
        "author": coalesce(properties.author.name, "Unknown"),
        excerpt
      }
    `);

    await expect(
      evaluateAssetResourceQuery({
        tree,
        documents,
        parameters: { folderId: "blog" },
      })
    ).resolves.toEqual([
      {
        _id: "beta",
        title: "Beta",
        slug: "beta",
        author: "Ben",
        excerpt: "Excerpt beta",
      },
      {
        _id: "alpha",
        title: "Alpha",
        slug: "alpha",
        author: "Ada",
        excerpt: "Excerpt alpha",
      },
    ]);
  });

  test("selects one document with a runtime slug", async () => {
    const tree = parseAssetResourceQuery(
      `*[properties.slug == $slug][0]{_id, revision, contentRef}`
    );

    await expect(
      evaluateAssetResourceQuery({
        tree,
        documents,
        parameters: { slug: "beta" },
      })
    ).resolves.toEqual({
      _id: "beta",
      revision: "revision-beta",
      contentRef: "content-beta",
    });
  });

  test("rejects invalid GROQ during parsing", () => {
    expect(() => parseAssetResourceQuery("*[invalid ==")).toThrow();
  });
});

describe("asset resource request transport", () => {
  test("serializes nested runtime parameters and hydration options in POST JSON", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      })
    );
    const resourceRequest = createAssetResourceRequest({
      query: "*[properties.slug == $slug && properties.locale == $locale]",
      parameters: {
        slug: "hello-world",
        locale: { language: "en", fallbacks: ["en-US", "en"] },
      },
      indexRevision: "index-7",
      content: { mode: "markdown-body", maxBytes: 4096 },
    });

    await loadResource(fetch, resourceRequest, "https://example.com/blog/post");

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://example.com/$resources/assets/query");
    expect(init).toEqual({
      method: "post",
      headers: new Headers([["content-type", "application/json"]]),
      body: JSON.stringify(resourceRequest.body),
    });
    expect(JSON.parse(String(init?.body))).toEqual(resourceRequest.body);
    expect(resourceRequest.body).toEqual(
      expect.objectContaining({ resultLimit: 100 })
    );
  });
});

describe("bounded asset resource execution", () => {
  const execute = (
    request: Partial<Parameters<typeof executeAssetResourceQuery>[0]["request"]>
  ) =>
    executeAssetResourceQuery({
      request: {
        query: "*[]",
        parameters: {},
        resultLimit: 100,
        content: { mode: "none" },
        ...request,
      },
      documents,
      queryHash: "query-revision",
      indexRevision: "index-revision",
      assetRevision: "asset-revision",
    });

  test("returns a structured result without hydrating content", async () => {
    await expect(
      execute({
        query: "*[extension == $extension]{_id}",
        parameters: { extension: "md" },
      })
    ).resolves.toMatchObject({
      ok: true,
      result: [{ _id: "alpha" }, { _id: "beta" }, { _id: "draft" }],
      content: {},
      meta: { resultCount: 3, hydratedFileCount: 0, hydratedBytes: 0 },
    });
  });

  test("rejects missing parameters and excessive results", async () => {
    await expect(
      execute({ query: "*[properties.slug == $slug]" })
    ).rejects.toMatchObject({ code: "MISSING_PARAMETER" });
    await expect(execute({ resultLimit: 2 })).rejects.toMatchObject({
      code: "RESULT_LIMIT_EXCEEDED",
    });
  });

  test("rejects excessive candidate datasets and serialized result bytes", async () => {
    await expect(
      executeAssetResourceQuery({
        request: {
          query: "*[0]",
          parameters: {},
          resultLimit: 1,
          content: { mode: "none" },
        },
        documents: Array.from(
          { length: assetResourceLimits.candidateDocuments + 1 },
          (_, index) => createDocument(`post-${index}`, {})
        ),
        queryHash: "query-revision",
        indexRevision: "index-revision",
        assetRevision: "asset-revision",
      })
    ).rejects.toMatchObject({ code: "RESULT_LIMIT_EXCEEDED" });

    await expect(
      executeAssetResourceQuery({
        request: {
          query: `{"documents": *[]{properties}}`,
          parameters: {},
          resultLimit: 1,
          content: { mode: "none" },
        },
        documents: Array.from({ length: 80 }, (_, index) =>
          createDocument(`post-${index}`, { text: "x".repeat(16 * 1024) })
        ),
        queryHash: "query-revision",
        indexRevision: "index-revision",
        assetRevision: "asset-revision",
      })
    ).rejects.toMatchObject({ code: "RESULT_SIZE_EXCEEDED" });
  });

  test("rejects execution that exceeds the runtime limit", async () => {
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(251);
    await expect(
      executeAssetResourceQuery({
        request: {
          query: "*[0]",
          parameters: {},
          resultLimit: 1,
          content: { mode: "none" },
        },
        documents,
        queryHash: "query-revision",
        indexRevision: "index-revision",
        assetRevision: "asset-revision",
        now,
      })
    ).rejects.toMatchObject({
      name: AssetResourceQueryExecutionError.name,
      code: "QUERY_TIMEOUT",
    });
  });
});
