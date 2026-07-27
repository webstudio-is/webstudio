import { afterEach, describe, expect, test, vi } from "vitest";
import type { AssetFileDocument } from "./schema";
import { createAssetIndex } from "./asset-index";
import { createCanonicalAssetFileEntry } from "./canonical";
import {
  createGeneratedAssetResourceFetch,
  createPublishedAssetResourceFetch,
} from "./published-runtime";

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
    const generatedFetch = await createGeneratedAssetResourceFetch({
      request: new Request("https://site.example/page"),
      deploymentId: "build-1",
      artifact: index,
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
    vi.stubGlobal("fetch", networkFetch);
    const generatedFetch = await createGeneratedAssetResourceFetch({
      request: new Request("https://site.example/blog"),
      deploymentId: "build-same-origin",
      artifact: index,
      fallback: vi.fn(async () => new Response("fallback")),
    });

    const overview = await generatedFetch(queryRequest());
    const detail = await generatedFetch(queryRequest(true));

    expect(overview.status).toBe(200);
    await expect(overview.json()).resolves.toMatchObject({
      items: [{ id: "post-1" }],
    });
    await expect(detail.json()).resolves.toMatchObject({
      items: [{ id: "post-1", content: { text: "Post" } }],
    });
    expect(networkFetch).not.toHaveBeenCalled();
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
