import { afterEach, describe, expect, test, vi } from "vitest";
import { assetQuery, type AssetFileDocument } from "./schema";
import { compileContentArtifact, createAssetIndex } from "./asset-index";
import { createCanonicalAssetFileEntry } from "./canonical";
import { createContentDatabase } from "./content-database";
import { createContentRuntimeArtifact } from "./content-runtime-artifact";
import {
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
} from "./compilation-plan";
import {
  createGeneratedAssetResourceRuntime as createGeneratedRuntime,
  createPublishedAssetResourceFetch as createPublishedRuntime,
} from "./published-runtime";
import { createDocumentGraph } from "./document-graph";

const revision = `sha256:${"a".repeat(64)}`;
const document: AssetFileDocument = {
  _id: "post-1",
  _type: "asset.file",
  name: "post.md",
  path: "blog/post.md",
  key: "post",
  extension: "md",
  mimeType: "text/markdown",
  size: 4,
  revision,
  contentRef: "post.md",
  properties: { slug: "post", title: "Post" },
};
const runtimeAssets = { "post-1": { url: "/assets/post.md" } };

const createPublishedAssetResourceFetch = (
  options: Omit<Parameters<typeof createPublishedRuntime>[0], "artifact"> & {
    artifact: Parameters<typeof createContentRuntimeArtifact>[0];
  }
) =>
  createPublishedRuntime({
    ...options,
    artifact: createContentRuntimeArtifact(options.artifact),
  });

const createGeneratedAssetResourceRuntime = (
  options: Omit<Parameters<typeof createGeneratedRuntime>[0], "artifact"> & {
    artifact: Parameters<typeof createContentRuntimeArtifact>[0];
  }
) =>
  createGeneratedRuntime({
    ...options,
    artifact: createContentRuntimeArtifact(options.artifact),
  });

const createRuntime = async () => {
  const index = await createAssetIndex({
    projectId: "project-1",
    entries: [
      {
        ...createCanonicalAssetFileEntry({
          projectId: "project-1",
          document,
        }),
        content: "Post",
      },
    ],
  });
  return {
    index,
    runtimeFetch: createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "build-1",
      artifact: index,
      runtimeAssets,
    }),
  };
};

const queryRequest = (content = false) =>
  new Request("https://site.example/$resources/assets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
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
        output: { mode: "all", includeMetadata: true },
        content: content ? { mode: "full" } : { mode: "none" },
      },
    }),
  });

describe("published asset resource runtime", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("does not open the query-result cache for ordinary generated fetches", async () => {
    const { index } = await createRuntime();
    const open = vi.fn();
    vi.stubGlobal("caches", { open });
    const fallback = vi.fn(async () => new Response("fallback"));
    const createGeneratedFetch = createGeneratedAssetResourceRuntime({
      deploymentId: "build-1",
      artifact: index,
      runtimeAssets,
    });
    const generatedFetch = await createGeneratedFetch({
      request: new Request("https://site.example/page"),
      fallback,
    });

    expect(await (await generatedFetch("/other")).text()).toBe("fallback");
    expect(fallback).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
  });

  test("loads overview and detail queries from an embedded database", async () => {
    const index = await createAssetIndex({
      projectId: "project-1",
      entries: [
        {
          ...createCanonicalAssetFileEntry({
            projectId: "project-1",
            document,
          }),
          content: "Post",
        },
      ],
    });
    const networkFetch = vi.fn();
    const fallback = vi.fn(async () => new Response("fallback"));
    const onDocumentGraphEvent = vi.fn();
    vi.stubGlobal("fetch", networkFetch);
    const createGeneratedFetch = createGeneratedAssetResourceRuntime({
      deploymentId: "build-same-origin",
      artifact: index,
      runtimeAssets,
      onDocumentGraphEvent,
    });
    const generatedFetch = await createGeneratedFetch({
      request: new Request("https://site.example/blog"),
      fallback,
    });

    const overview = await generatedFetch(queryRequest());
    const detail = await generatedFetch(queryRequest(true));

    expect(overview.status).toBe(200);
    const overviewData = await overview.json();
    expect(overviewData).toMatchObject({
      items: [{ id: "post-1", properties: { title: "Post" } }],
    });
    expect(overviewData).not.toHaveProperty("database");
    expect(overviewData).not.toHaveProperty("__diagnostics__");
    await expect(detail.json()).resolves.toMatchObject({
      items: [{ id: "post-1", content: { text: "Post" } }],
    });
    expect(networkFetch).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
    expect(onDocumentGraphEvent).not.toHaveBeenCalled();
  });

  test("assembles equivalent graph results in local, SSG, SSR, and published runtimes", async () => {
    const post = {
      ...document,
      _id: "post",
      name: "post.json",
      path: "content/post.json",
      key: "post",
      extension: "json",
      mimeType: "application/json",
      revision: "post-r1",
      contentRef: "storage:post",
      properties: {
        title: "Hello",
        author: { $ref: "./author.md#frontmatter" },
      },
    };
    const author = {
      ...document,
      _id: "author",
      name: "author.md",
      path: "content/author.md",
      key: "author",
      revision: "author-r1",
      contentRef: "storage:author",
      properties: { name: "Ada" },
    };
    const graph = createDocumentGraph({
      nodes: [
        {
          id: "post",
          revision: "post-r1",
          contentRef: "storage:post",
          format: "json",
        },
        {
          id: "author",
          revision: "author-r1",
          contentRef: "storage:author",
          format: "markdown",
        },
      ],
      edges: [
        {
          sourceId: "post",
          referenceId: "#/author",
          reference: {
            documentId: "author",
            revision: "author-r1",
            representation: { type: "markdown-frontmatter" },
          },
        },
      ],
    });
    const { artifact } = await compileContentArtifact({
      projectId: "project-1",
      entries: [post, author].map((value) =>
        createCanonicalAssetFileEntry({
          projectId: "project-1",
          document: value,
        })
      ),
      documentGraph: graph,
    });
    const fetchDocument = vi.fn(async (input: RequestInfo | URL) => {
      const pathname = new URL(String(input), "https://site.example").pathname;
      return new Response(
        pathname.endsWith("post.json")
          ? '{"title":"Hello","author":{"$ref":"./author.md#frontmatter"}}'
          : "---\nname: Ada\nrole: Writer\n---\nBio\n"
      );
    });
    const graphQuery = assetQuery.parse({
      where: { all: [{ field: ["id"], operator: "eq", value: "post" }] },
      limit: 1,
      output: {
        mode: "fields",
        includeMetadata: false,
        fields: [
          ["properties", "title"],
          ["properties", "author"],
        ],
      },
    });
    const localResult = await createContentDatabase({
      artifact,
    }).queryWithDocumentGraph({
      request: { query: graphQuery },
      load: async (node) => ({
        format: node.format as "json" | "markdown",
        revision: node.revision,
        source:
          node.id === "post"
            ? '{"title":"Hello","author":{"$ref":"./author.md#frontmatter"}}'
            : "---\nname: Ada\nrole: Writer\n---\nBio\n",
      }),
    });
    const events: unknown[] = [];
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "graph-build",
      artifact,
      runtimeAssets: {
        post: { url: "/assets/post.json", contentRef: "storage:post" },
        author: { url: "/assets/author.md", contentRef: "storage:author" },
      },
      fetchDocument,
      onDocumentGraphEvent: (event) => events.push(event),
    });

    const requestInit = () => ({
      method: "POST",
      body: JSON.stringify({ query: graphQuery }),
    });
    const request = () => runtimeFetch("/$resources/assets", requestInit());

    const response = await request();

    expect(localResult).toMatchObject({
      items: [
        {
          id: "post",
          properties: {
            title: "Hello",
            author: { name: "Ada", role: "Writer" },
          },
        },
      ],
    });
    await expect(response?.json()).resolves.toMatchObject({
      items: [
        {
          id: "post",
          properties: {
            title: "Hello",
            author: { name: "Ada", role: "Writer" },
          },
        },
      ],
    });
    await expect((await request())?.json()).resolves.toMatchObject({
      items: [{ id: "post" }],
    });
    expect(fetchDocument).toHaveBeenCalledTimes(1);
    expect(fetchDocument).toHaveBeenCalledWith(
      new URL("https://site.example/assets/author.md"),
      expect.anything()
    );
    expect(events).toEqual(
      expect.arrayContaining([
        { type: "roots-selected", rootCount: 1 },
        { type: "resolution-started", rootCount: 1, documentCount: 2 },
        {
          type: "document-fetch-completed",
          documentId: "author",
          revision: "author-r1",
        },
        { type: "resolution-completed", rootCount: 1, documentCount: 2 },
      ])
    );

    const ssgFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://webstudio.local",
      deploymentId: "graph-ssg-build",
      artifact,
      runtimeAssets: {
        post: { url: "/assets/post.json", contentRef: "storage:post" },
        author: { url: "/assets/author.md", contentRef: "storage:author" },
      },
      fetchDocument,
    });
    const ssgResponse = await ssgFetch("/$resources/assets", requestInit());
    await expect(ssgResponse?.json()).resolves.toMatchObject(localResult);
    expect(fetchDocument).toHaveBeenCalledTimes(2);

    const createGeneratedFetch = createGeneratedAssetResourceRuntime({
      deploymentId: "graph-build",
      artifact,
      runtimeAssets: {
        post: { url: "/assets/post.json", contentRef: "storage:post" },
        author: { url: "/assets/author.md", contentRef: "storage:author" },
      },
      onDocumentGraphEvent: (event) => events.push(event),
    });
    const generatedFetch = await createGeneratedFetch({
      request: new Request("https://site.example/blog/post"),
      fallback: fetchDocument,
    });
    const generatedResponse = await generatedFetch(
      new Request("https://site.example/$resources/assets", requestInit())
    );
    await expect(generatedResponse.json()).resolves.toMatchObject({
      items: [
        {
          id: "post",
          properties: { author: { name: "Ada", role: "Writer" } },
        },
      ],
    });
    expect(fetchDocument).toHaveBeenCalledTimes(3);
    expect(() =>
      createPublishedAssetResourceFetch({
        baseUrl: "https://site.example",
        deploymentId: "incomplete-graph-build",
        artifact,
        runtimeAssets: { post: { url: "/assets/post.json" } },
        fetchDocument,
      })
    ).toThrow("Published document URL is unavailable for author");
    expect(() =>
      createPublishedAssetResourceFetch({
        baseUrl: "https://site.example",
        deploymentId: "inline-graph-source-build",
        artifact,
        runtimeAssets: {
          author: {
            url: "/assets/author.md",
            contentRef: "storage:author",
          },
        },
        fetchDocument,
      })
    ).not.toThrow();
  });

  test("hydrates parallel CDN roots with one cached shared dependency", async () => {
    const createJsonDocument = (id: string): AssetFileDocument => ({
      ...document,
      _id: id,
      name: `${id}.json`,
      path: `content/${id}.json`,
      key: id,
      extension: "json",
      mimeType: "application/json",
      revision: `${id}-r1`,
      contentRef: `storage:${id}`,
      properties: {
        title: id,
        author: { $ref: "./author.json#/profile" },
      },
    });
    const postA = createJsonDocument("post-a");
    const postB = createJsonDocument("post-b");
    const author: AssetFileDocument = {
      ...createJsonDocument("author"),
      properties: { profile: { name: "Ada" } },
    };
    const graph = createDocumentGraph({
      nodes: [postA, postB, author].map((value) => ({
        id: value._id,
        revision: value.revision,
        contentRef: value.contentRef,
        format: "json" as const,
      })),
      edges: [postA, postB].map((value) => ({
        sourceId: value._id,
        referenceId: "#/author",
        reference: {
          documentId: "author",
          revision: "author-r1",
          representation: { type: "json" as const, path: ["profile"] },
        },
      })),
    });
    const { artifact } = await compileContentArtifact({
      projectId: "project-1",
      entries: [postA, postB, author].map((value) =>
        createCanonicalAssetFileEntry({
          projectId: "project-1",
          document: value,
        })
      ),
      documentGraph: graph,
    });
    const pending = new Map<string, (response: Response) => void>();
    const fetchDocument = vi.fn(
      (input: RequestInfo | URL) =>
        new Promise<Response>((resolve) => {
          pending.set(new URL(String(input)).pathname, resolve);
        })
    );
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "parallel-graph-build",
      artifact,
      runtimeAssets: {
        "post-a": {
          url: "/assets/post-a.json",
          contentRef: "storage:post-a",
        },
        "post-b": {
          url: "/assets/post-b.json",
          contentRef: "storage:post-b",
        },
        author: {
          url: "/assets/author.json",
          contentRef: "storage:author",
        },
      },
      fetchDocument,
    });
    const request = () =>
      runtimeFetch("/$resources/assets", {
        method: "POST",
        body: JSON.stringify({
          query: {
            where: {
              all: [{ field: ["id"], operator: "ne", value: "author" }],
            },
            sort: [{ field: ["id"], direction: "asc" }],
            limit: 2,
            output: {
              mode: "fields",
              includeMetadata: false,
              fields: [
                ["properties", "title"],
                ["properties", "author"],
              ],
            },
          },
        }),
      });

    const responsePromise = request();
    await vi.waitFor(() => expect(fetchDocument).toHaveBeenCalledOnce());
    pending.get("/assets/author.json")?.(
      new Response('{"profile":{"name":"Ada"}}')
    );

    await expect((await responsePromise)?.json()).resolves.toMatchObject({
      items: [
        { id: "post-a", properties: { author: { name: "Ada" } } },
        { id: "post-b", properties: { author: { name: "Ada" } } },
      ],
    });
    await expect((await request())?.json()).resolves.toMatchObject({
      items: [{ id: "post-a" }, { id: "post-b" }],
    });
    expect(fetchDocument).toHaveBeenCalledTimes(1);
    expect(
      fetchDocument.mock.calls.filter(([input]) =>
        String(input).includes("/assets/author.json")
      )
    ).toHaveLength(1);
  });

  test("maps CDN document limits and in-flight cancellation to query failures", async () => {
    const graphDocument: AssetFileDocument = {
      ...document,
      _id: "graph-post",
      name: "graph-post.json",
      path: "content/graph-post.json",
      key: "graph-post",
      extension: "json",
      mimeType: "application/json",
      revision: "graph-post-r1",
      contentRef: "storage:graph-post",
      properties: { author: { $ref: "./author.json" } },
    };
    const { artifact } = await compileContentArtifact({
      projectId: "project-1",
      entries: [
        createCanonicalAssetFileEntry({
          projectId: "project-1",
          document: graphDocument,
        }),
      ],
      documentGraph: createDocumentGraph({
        nodes: [
          {
            id: graphDocument._id,
            revision: graphDocument.revision,
            contentRef: graphDocument.contentRef,
            format: "json",
          },
          {
            id: "graph-author",
            revision: "graph-author-r1",
            contentRef: "storage:graph-author",
            format: "json",
          },
        ],
        edges: [
          {
            sourceId: graphDocument._id,
            referenceId: "#/author",
            reference: {
              documentId: "graph-author",
              revision: "graph-author-r1",
              representation: { type: "document" },
            },
          },
        ],
      }),
    });
    const request = (signal?: AbortSignal) =>
      new Request("https://site.example/$resources/assets", {
        method: "POST",
        signal,
        body: JSON.stringify({
          query: {
            where: {
              all: [{ field: ["id"], operator: "eq", value: "graph-post" }],
            },
            limit: 1,
            output: {
              mode: "fields",
              includeMetadata: false,
              fields: [["properties", "author"]],
            },
          },
        }),
      });
    const runtimeAssets = {
      "graph-post": {
        url: "/assets/graph-post.json",
        contentRef: "storage:graph-post",
      },
      "graph-author": {
        url: "/assets/graph-author.json",
        contentRef: "storage:graph-author",
      },
    };
    const oversizedRuntime = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "graph-limit-build",
      artifact,
      runtimeAssets,
      fetchDocument: async (input) =>
        new Response(
          String(input).endsWith("graph-post.json")
            ? '{"author":{"$ref":"./author.json"}}'
            : `{"value":"${"a".repeat(1024 * 1024)}"}`
        ),
    });

    const oversized = await oversizedRuntime(request());
    expect(oversized?.status).toBe(400);
    await expect(oversized?.json()).resolves.toMatchObject({
      error: {
        code: "CONTENT_LIMIT_EXCEEDED",
        details: {
          assetId: "graph-author",
          contentByteLimit: 1024 * 1024,
        },
      },
    });

    const fetchDocument = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason)
          );
        })
    );
    const cancelledRuntime = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "graph-cancel-build",
      artifact,
      runtimeAssets,
      fetchDocument,
    });
    const controller = new AbortController();
    const cancelledPromise = cancelledRuntime(request(controller.signal));
    await vi.waitFor(() => expect(fetchDocument).toHaveBeenCalled());
    controller.abort("test cancellation");

    const cancelled = await cancelledPromise;
    expect(cancelled?.status).toBe(499);
    await expect(cancelled?.json()).resolves.toMatchObject({
      error: { code: "REQUEST_CANCELLED" },
    });
  });

  test("serves a materialized static query without candidate documents", async () => {
    const query = assetQuery.parse({
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "post",
          },
        ],
      },
      sort: [],
      limit: 1,
      offset: 0,
      output: {
        mode: "fields",
        includeMetadata: false,
        fields: [
          ["properties", "slug"],
          ["properties", "title"],
        ],
      },
      content: { mode: "none" },
    });
    const index = await createAssetIndex({
      projectId: "project-1",
      entries: [
        createCanonicalAssetFileEntry({
          projectId: "project-1",
          document,
        }),
      ],
      plan: createContentCompilationPlan([
        createLiteralContentCompilationQuery({ id: "posts", query }),
      ]),
    });
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "build-materialized",
      artifact: index,
      runtimeAssets: {},
    });

    expect(index.documents).toEqual([]);
    const response = await runtimeFetch("/$resources/assets", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    await expect(response?.json()).resolves.toEqual({
      items: [
        {
          id: "post-1",
          properties: { slug: "post", title: "Post" },
        },
      ],
      totalCount: 1,
      hasMore: false,
    });
  });

  test("reuses one initialized runtime across deployment origins", async () => {
    const { index } = await createRuntime();
    const createGeneratedFetch = createGeneratedAssetResourceRuntime({
      deploymentId: "build-reused",
      artifact: index,
      runtimeAssets,
    });
    const fallback = vi.fn(async () => new Response("fallback"));

    const first = await createGeneratedFetch({
      request: new Request("https://site.example/first"),
      fallback,
    });
    const second = await createGeneratedFetch({
      request: new Request("https://another.example/second"),
      fallback,
    });
    await first("/other");
    await second("/other");

    expect(fallback).toHaveBeenCalledTimes(2);
  });

  test("runs multiple structured requests against one database", async () => {
    const { runtimeFetch } = await createRuntime();
    const first = await runtimeFetch(queryRequest());
    const second = await runtimeFetch(queryRequest());

    expect(await first?.json()).toMatchObject({
      items: [{ id: "post-1", properties: { title: "Post" } }],
      totalCount: 1,
      hasMore: false,
    });
    expect((await second?.json())?.items).toHaveLength(1);
  });

  test("requires only target URLs referenced by embedded Markdown", async () => {
    const { index } = await createRuntime();
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "build-without-runtime-fields",
      artifact: index,
      runtimeAssets: {},
    });
    const response = await runtimeFetch("/$resources/assets", {
      method: "POST",
      body: JSON.stringify({
        query: {
          where: { all: [] },
          limit: 1,
          output: {
            mode: "fields",
            fields: [["id"]],
            includeMetadata: false,
          },
          content: { mode: "none" },
        },
      }),
    });
    await expect(response?.json()).resolves.toMatchObject({
      items: [{ id: "post-1" }],
    });
    expect(() =>
      createPublishedAssetResourceFetch({
        baseUrl: "https://site.example",
        deploymentId: "build-incomplete-reference",
        artifact: {
          ...index,
          assetReferences: {
            "post.md": [{ start: 0, end: 1, assetId: "missing-reference" }],
          },
        },
        runtimeAssets,
      })
    ).toThrow(
      "Published referenced asset URL is unavailable for missing-reference"
    );
  });

  test("hydrates selected embedded content", async () => {
    const { runtimeFetch } = await createRuntime();
    const response = await runtimeFetch(queryRequest(true));

    expect(await response?.json()).toMatchObject({
      items: [{ content: { text: "Post", encoding: "utf-8" } }],
    });
  });

  test("returns structured hydration details", async () => {
    const { runtimeFetch } = await createRuntime();
    const response = await runtimeFetch("/$resources/assets", {
      method: "POST",
      body: JSON.stringify({
        query: {
          where: { all: [{ field: ["id"], operator: "eq", value: "post-1" }] },
          limit: 1,
          content: { mode: "full", maxBytes: 1 },
        },
      }),
    });

    expect(response?.status).toBe(400);
    await expect(response?.json()).resolves.toMatchObject({
      error: {
        code: "CONTENT_LIMIT_EXCEEDED",
        details: { assetId: "post-1", assetBytes: 4, fileByteLimit: 1 },
      },
    });
  });

  test("ignores other origins, methods, and paths", async () => {
    const { runtimeFetch } = await createRuntime();
    expect(await runtimeFetch("https://other.example/$resources/assets")).toBe(
      undefined
    );
    expect(await runtimeFetch("/$resources/assets", { method: "GET" })).toBe(
      undefined
    );
    expect(await runtimeFetch("/other", { method: "POST" })).toBe(undefined);
  });

  test("rejects malformed and stale requests", async () => {
    const { runtimeFetch, index } = await createRuntime();
    const malformed = await runtimeFetch("/$resources/assets", {
      method: "POST",
      body: "not json",
    });
    expect(malformed?.status).toBe(400);

    const stale = await runtimeFetch("/$resources/assets", {
      method: "POST",
      body: JSON.stringify({
        indexRevision: `${index.integrity.checksum}-old`,
        query: {},
      }),
    });
    expect(stale?.status).toBe(409);
  });

  test("caches only requests that opt into response caching", async () => {
    const { index } = await createRuntime();
    const responses = new Map<string, Response>();
    const cache = {
      match: vi.fn(async (request: Request) => responses.get(request.url)),
      put: vi.fn(async (request: Request, response: Response) => {
        responses.set(request.url, response);
      }),
    };
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "build-cache",
      artifact: index,
      runtimeAssets,
      cache,
    });
    const request = () => {
      const value = queryRequest();
      value.headers.set("cache-control", "public, max-age=60");
      return value;
    };
    expect((await runtimeFetch(request()))?.status).toBe(200);
    expect((await runtimeFetch(request()))?.status).toBe(200);
    expect(cache.put).toHaveBeenCalledOnce();
    expect(cache.match).toHaveBeenCalledTimes(2);
  });
});
