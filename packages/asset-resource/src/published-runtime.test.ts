import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AssetFileDocument } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { createAssetIndex } from "./asset-index";
import { createCanonicalAssetFileEntry } from "./canonical";
import {
  __testing,
  createGeneratedAssetResourceFetch,
  createPublishedAssetResourceFetch,
  getPublishedAssetContentPath,
  getPublishedAssetResourceCacheKey,
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
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        document,
      }),
    ],
  });
  const fetchAsset = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === "/assets/db/index.json") {
      return Response.json(index);
    }
    if (path === "/assets/post.md") {
      expect(new Headers(init?.headers).get("range")).toBe("bytes=0-3");
      return new Response("Post", {
        headers: { "content-length": "4" },
      });
    }
    return new Response(null, { status: 404 });
  });
  const manifest = {
    revision: index.integrity.checksum,
    assetRevision: index.assetRevision,
    indexPath: "/assets/db/index.json",
  };
  return {
    index,
    manifest,
    fetchAsset,
    runtimeFetch: createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "build-1",
      manifest,
      fetchAsset,
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
  beforeEach(() => __testing.clearParsedIndexCache());
  afterEach(() => vi.unstubAllGlobals());

  test("does not open the query-result cache for ordinary generated fetches", async () => {
    const open = vi.fn();
    vi.stubGlobal("caches", { open });
    const fallback = vi.fn(async () => new Response("fallback"));
    const generatedFetch = await createGeneratedAssetResourceFetch({
      request: new Request("https://site.example/page"),
      context: undefined,
      deploymentId: "build-1",
      manifest: {
        revision,
        assetRevision: revision,
        indexPath: "/assets/db/index.json",
      },
      fallback,
    });

    expect(await (await generatedFetch("/other")).text()).toBe("fallback");
    expect(fallback).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
  });

  test("loads overview and detail queries through same-origin deployment assets", async () => {
    const { index, manifest } = await createRuntime();
    const fetchStaticAsset = vi.fn(async (input: RequestInfo | URL) => {
      const request =
        input instanceof Request ? input : new Request(input.toString());
      const path = new URL(request.url).pathname;
      if (path === manifest.indexPath) {
        return Response.json(index);
      }
      if (path === "/assets/post.md") {
        return new Response("Post", {
          headers: { "content-length": "4" },
        });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchStaticAsset);
    const generatedFetch = await createGeneratedAssetResourceFetch({
      request: new Request("https://site.example/blog"),
      context: undefined,
      deploymentId: "build-same-origin",
      manifest,
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
    expect(
      fetchStaticAsset.mock.calls.filter(([input]) =>
        (input instanceof Request ? input.url : input.toString()).endsWith(
          manifest.indexPath
        )
      )
    ).toHaveLength(1);
  });

  test("preserves authorization when deployment assets use same-origin fetch", async () => {
    const { index, manifest } = await createRuntime();
    const fetchStaticAsset = vi.fn(async (input: RequestInfo | URL) => {
      const request =
        input instanceof Request ? input : new Request(input.toString());
      expect(request.headers.get("authorization")).toBe("Basic staging");
      return Response.json(index);
    });
    vi.stubGlobal("fetch", fetchStaticAsset);
    const generatedFetch = await createGeneratedAssetResourceFetch({
      request: new Request("https://site.example/blog", {
        headers: { authorization: "Basic staging" },
      }),
      context: undefined,
      deploymentId: "build-protected-origin",
      manifest,
      fallback: vi.fn(async () => new Response("fallback")),
    });

    expect((await generatedFetch(queryRequest())).status).toBe(200);
    expect(fetchStaticAsset).toHaveBeenCalledOnce();
  });

  test("does not forward authorization to a cross-origin deployment asset", async () => {
    const { index, manifest } = await createRuntime();
    manifest.indexPath = "https://assets.example/index.json";
    const fetchStaticAsset = vi.fn(async (input: RequestInfo | URL) => {
      const request =
        input instanceof Request ? input : new Request(input.toString());
      expect(request.headers.has("authorization")).toBe(false);
      return Response.json(index);
    });
    vi.stubGlobal("fetch", fetchStaticAsset);
    const generatedFetch = await createGeneratedAssetResourceFetch({
      request: new Request("https://site.example/blog", {
        headers: { authorization: "Basic staging" },
      }),
      context: undefined,
      deploymentId: "build-cross-origin",
      manifest,
      fallback: vi.fn(async () => new Response("fallback")),
    });

    expect((await generatedFetch(queryRequest())).status).toBe(200);
    expect(fetchStaticAsset).toHaveBeenCalledOnce();
  });

  test("prefers an available deployment asset binding", async () => {
    const { index, manifest } = await createRuntime();
    const bindingFetch = vi.fn(async () => Response.json(index));
    const networkFetch = vi.fn();
    vi.stubGlobal("fetch", networkFetch);
    const generatedFetch = await createGeneratedAssetResourceFetch({
      request: new Request("https://site.example/blog"),
      context: { cloudflare: { env: { ASSETS: { fetch: bindingFetch } } } },
      deploymentId: "build-binding",
      manifest,
      fallback: vi.fn(async () => new Response("fallback")),
    });

    expect((await generatedFetch(queryRequest())).status).toBe(200);
    expect(bindingFetch).toHaveBeenCalledOnce();
    expect(networkFetch).not.toHaveBeenCalled();
  });

  test("runs multiple structured requests against one parsed index", async () => {
    const { runtimeFetch, fetchAsset } = await createRuntime();
    const first = await runtimeFetch(queryRequest());
    const second = await runtimeFetch(queryRequest());

    expect(await first?.json()).toMatchObject({
      items: [{ id: "post-1", properties: { title: "Post" } }],
      totalCount: 1,
      hasMore: false,
    });
    expect((await second?.json())?.items).toHaveLength(1);
    expect(
      fetchAsset.mock.calls.filter(([path]) => path === "/assets/db/index.json")
    ).toHaveLength(1);
  });

  test("hydrates selected content lazily", async () => {
    const { runtimeFetch, fetchAsset } = await createRuntime();
    const response = await runtimeFetch(queryRequest(true));

    expect(await response?.json()).toMatchObject({
      items: [{ content: { text: "Post", encoding: "utf-8" } }],
    });
    expect(fetchAsset).toHaveBeenCalledWith(
      "/assets/post.md",
      expect.anything()
    );
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
    const { runtimeFetch, manifest } = await createRuntime();
    const malformed = await runtimeFetch("/$resources/assets", {
      method: "POST",
      body: "not json",
    });
    expect(malformed?.status).toBe(400);

    const stale = await runtimeFetch("/$resources/assets", {
      method: "POST",
      body: JSON.stringify({
        indexRevision: `${manifest.revision}-old`,
        query: {},
      }),
    });
    expect(stale?.status).toBe(409);
  });

  test("bounds parsed indexes retained by one isolate", async () => {
    const { manifest, fetchAsset } = await createRuntime();
    for (
      let index = 0;
      index < assetResourceLimits.runtimeCachedIndexes + 1;
      index += 1
    ) {
      const runtimeFetch = createPublishedAssetResourceFetch({
        baseUrl: "https://site.example",
        deploymentId: `deployment-${index}`,
        manifest,
        fetchAsset,
      });
      expect((await runtimeFetch(queryRequest()))?.status).toBe(200);
    }
    expect(__testing.getParsedIndexCacheSize()).toBe(
      assetResourceLimits.runtimeCachedIndexes
    );
  });

  test("uses deployment and shared index identity in cache keys", async () => {
    const { manifest } = await createRuntime();
    const first = await getPublishedAssetResourceCacheKey({
      deploymentId: "one",
      manifest,
      request: queryRequest(),
    });
    const second = await getPublishedAssetResourceCacheKey({
      deploymentId: "two",
      manifest,
      request: queryRequest(),
    });
    expect(first.url).not.toBe(second.url);
  });

  test("encodes content paths without losing hierarchy", () => {
    expect(getPublishedAssetContentPath("blog/My post.md")).toBe(
      "/assets/blog/My%20post.md"
    );
    expect(() => getPublishedAssetContentPath("../secret")).toThrow();
  });
});
