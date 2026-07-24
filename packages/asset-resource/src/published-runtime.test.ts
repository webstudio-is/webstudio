import { beforeEach, describe, expect, test, vi } from "vitest";
import { createAssetResourceIndex } from "./resource-index";
import {
  __testing,
  createGeneratedAssetResourceFetch,
  createPublishedAssetResourceFetch,
  getPublishedAssetContentPath,
  getPublishedAssetResourceCacheKey,
} from "./published-runtime";

const revision = `sha256:${"a".repeat(64)}`;
const query = `query Post($slug: String!) {
  assets(where: { properties: { slug: { eq: $slug } } }, first: 1) {
    items { id properties { title } }
  }
}`;

const contentQuery = `query Post($slug: String!) {
  assets(where: { properties: { slug: { eq: $slug } } }, first: 1) {
    items { id properties { title } content(mode: FULL) { text } }
  }
}`;

const createRuntime = async (runtimeQuery = query) => {
  const index = await createAssetResourceIndex({
    format: "webstudio-resource-index",
    version: 1,
    resourceId: "posts",
    query: runtimeQuery,
    assetRevision: revision,
    documents: [
      {
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
      },
    ],
  });
  const fetchAsset = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === "/resource-indexes/posts.json") {
      return Response.json(index);
    }
    if (path === "/assets/post.md") {
      expect(new Headers(init?.headers).get("range")).toBe("bytes=0-3");
      return new Response("Post");
    }
    return new Response(null, { status: 404 });
  });
  const manifest = [
    {
      resourceId: "posts",
      revision: index.integrity.checksum,
      queryHash: index.queryHash,
      assetRevision: index.assetRevision,
      indexPath: "/resource-indexes/posts.json",
    },
  ];
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

const createQueryRequest = (
  runtimeQuery = query,
  variables: Readonly<Record<string, unknown>> = { slug: "post" }
) =>
  new Request("https://site.example/$resources/assets/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: runtimeQuery,
      variables,
    }),
  });

const withResourceId = (request: Request, resourceId: string) => {
  const headers = new Headers(request.headers);
  headers.set("x-webstudio-resource-id", resourceId);
  return new Request(request, { headers });
};

describe("published asset resource runtime", () => {
  beforeEach(() => __testing.clearParsedIndexCache());

  test("accepts generated local resource URLs as relative strings", async () => {
    const { manifest, fetchAsset } = await createRuntime();
    const fetchResource = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "deployment-1",
      manifest,
      fetchAsset,
    });

    const response = await fetchResource("/$resources/assets/query", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webstudio-resource-id": "posts",
      },
      body: JSON.stringify({ query, variables: { slug: "hello" } }),
    });

    expect(response?.status).toBe(200);
  });

  test("evaluates runtime variables and caches one parsed immutable index per isolate", async () => {
    const { runtimeFetch, fetchAsset } = await createRuntime();
    const first = await runtimeFetch(createQueryRequest());
    const second = await runtimeFetch(createQueryRequest());

    expect(await first?.json()).toMatchObject({
      ok: true,
      data: {
        assets: {
          items: [{ id: "post-1", properties: { title: "Post" } }],
        },
      },
    });
    expect((await second?.json())?.ok).toBe(true);
    expect(
      fetchAsset.mock.calls.filter(
        ([path]) => path === "/resource-indexes/posts.json"
      )
    ).toHaveLength(1);
    expect(fetchAsset).not.toHaveBeenCalledWith(
      "/assets/post.md",
      expect.anything()
    );
  });

  test("bounds parsed indexes retained by one isolate", async () => {
    const { manifest, fetchAsset } = await createRuntime();
    for (let index = 0; index < 5; index += 1) {
      const runtimeFetch = createPublishedAssetResourceFetch({
        baseUrl: "https://site.example",
        deploymentId: `deployment-${index}`,
        manifest,
        fetchAsset,
      });
      const response = await runtimeFetch(createQueryRequest());
      expect(response?.status).toBe(200);
    }

    expect(__testing.getParsedIndexCacheSize()).toBe(4);
  });

  test("does not let an evicted rejection remove its replacement", async () => {
    const { index, manifest } = await createRuntime();
    let rejectFirst: (error: Error) => void = () => {};
    let resolveSecond: (response: Response) => void = () => {};
    let markFirstStarted: () => void = () => {};
    let markSecondStarted: () => void = () => {};
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const secondStarted = new Promise<void>((resolve) => {
      markSecondStarted = resolve;
    });
    const firstResponse = new Promise<Response>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const secondResponse = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });
    let indexReads = 0;
    const fetchAsset = vi.fn(async () => {
      indexReads += 1;
      if (indexReads === 1) {
        markFirstStarted();
        return await firstResponse;
      }
      if (indexReads === 2) {
        markSecondStarted();
        return await secondResponse;
      }
      return Response.json(index);
    });
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "evicted-deployment",
      manifest,
      fetchAsset,
    });

    const first = runtimeFetch(createQueryRequest());
    await firstStarted;
    for (let fill = 0; fill < 4; fill += 1) {
      const fillRuntime = createPublishedAssetResourceFetch({
        baseUrl: "https://site.example",
        deploymentId: `fill-deployment-${fill}`,
        manifest,
        fetchAsset: async () => Response.json(index),
      });
      expect((await fillRuntime(createQueryRequest()))?.status).toBe(200);
    }

    const second = runtimeFetch(createQueryRequest());
    await secondStarted;
    rejectFirst(new Error("Evicted request failed"));
    expect((await first)?.status).toBe(500);
    resolveSecond(Response.json(index));
    expect((await second)?.status).toBe(200);

    expect((await runtimeFetch(createQueryRequest()))?.status).toBe(200);
    expect(indexReads).toBe(2);
  });

  test("hydrates exactly the selected complete Markdown file", async () => {
    const { runtimeFetch, fetchAsset } = await createRuntime(contentQuery);
    const response = await runtimeFetch(createQueryRequest(contentQuery));
    expect(await response?.json()).toMatchObject({
      ok: true,
      data: {
        assets: {
          items: [{ content: { text: "Post" } }],
        },
      },
    });
    expect(fetchAsset).toHaveBeenCalledWith("/assets/post.md", {
      headers: expect.any(Headers),
      signal: expect.any(AbortSignal),
    });
  });

  test("preserves content-reference hierarchy while encoding URL segments", () => {
    expect(getPublishedAssetContentPath("blog/a b?#'().md")).toBe(
      "/assets/blog/a%20b%3F%23%27%28%29.md"
    );
  });

  test("rejects content references that escape the asset namespace", () => {
    expect(() => getPublishedAssetContentPath("../private.json")).toThrow(
      "Invalid object key"
    );
    expect(() => getPublishedAssetContentPath("blog/../private.json")).toThrow(
      "Invalid object key"
    );
    expect(() => getPublishedAssetContentPath("/private.json")).toThrow(
      "Invalid object key"
    );
  });

  test("uses the generated runtime adapter for asset queries and delegates other requests", async () => {
    const { index, manifest } = await createRuntime();
    const assetBindingFetch = vi.fn(async (request: Request) => {
      if (new URL(request.url).pathname === manifest[0].indexPath) {
        return Response.json(index);
      }
      return new Response(null, { status: 404 });
    });
    const fallback = vi.fn<typeof fetch>(async () => new Response("fallback"));
    const generatedFetch = await createGeneratedAssetResourceFetch({
      request: new Request("https://site.example/blog/post"),
      context: {
        cloudflare: { env: { ASSETS: { fetch: assetBindingFetch } } },
      },
      deploymentId: "build-1",
      manifest,
      fallback,
    });

    const queryResponse = await generatedFetch(createQueryRequest());
    expect(await queryResponse.json()).toMatchObject({
      ok: true,
      data: { assets: { items: [{ properties: { title: "Post" } }] } },
    });
    expect(assetBindingFetch).toHaveBeenCalledOnce();

    const fallbackResponse = await generatedFetch(
      "https://external.example/data"
    );
    expect(await fallbackResponse.text()).toBe("fallback");

    const externalQueryResponse = await generatedFetch(
      "https://external.example/$resources/assets/query",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, variables: { slug: "post" } }),
      }
    );
    expect(await externalQueryResponse.text()).toBe("fallback");
    expect(fallback).toHaveBeenCalledTimes(2);
  });

  test("isolates parsed indexes for deployments that use the same public path", async () => {
    const first = await createRuntime();
    const secondIndex = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "posts",
      query,
      assetRevision: `sha256:${"b".repeat(64)}`,
      documents: [
        {
          ...first.index.documents[0],
          revision: `sha256:${"b".repeat(64)}`,
          properties: { slug: "post", title: "Other deployment" },
        },
      ],
    });
    const secondManifest = [
      {
        ...first.manifest[0],
        revision: secondIndex.integrity.checksum,
        assetRevision: secondIndex.assetRevision,
      },
    ];
    const secondFetchAsset = vi.fn(async () => Response.json(secondIndex));
    const secondRuntime = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "build-2",
      manifest: secondManifest,
      fetchAsset: secondFetchAsset,
    });

    expect(
      await (await first.runtimeFetch(createQueryRequest()))?.json()
    ).toMatchObject({
      data: { assets: { items: [{ properties: { title: "Post" } }] } },
    });
    expect(
      await (await secondRuntime(createQueryRequest()))?.json()
    ).toMatchObject({
      data: {
        assets: { items: [{ properties: { title: "Other deployment" } }] },
      },
    });
    expect(secondFetchAsset).toHaveBeenCalledOnce();
  });

  test("selects identical queries by resource identity", async () => {
    const first = await createRuntime();
    const secondIndex = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "other-posts",
      query,
      assetRevision: revision,
      documents: first.index.documents,
    });
    const manifest = [
      first.manifest[0],
      {
        resourceId: "other-posts",
        revision: secondIndex.integrity.checksum,
        queryHash: secondIndex.queryHash,
        assetRevision: secondIndex.assetRevision,
        indexPath: "/resource-indexes/other-posts.json",
      },
    ];
    const fetchAsset = vi.fn(async (path: string) =>
      Response.json(
        path === "/resource-indexes/other-posts.json"
          ? secondIndex
          : first.index
      )
    );
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "build-1",
      manifest,
      fetchAsset,
    });

    const ambiguous = await runtimeFetch(createQueryRequest());
    expect(await ambiguous?.json()).toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST" },
    });
    const selected = await runtimeFetch(
      withResourceId(createQueryRequest(), "other-posts")
    );
    expect((await selected?.json())?.ok).toBe(true);
    expect(fetchAsset).toHaveBeenCalledWith(
      "/resource-indexes/other-posts.json"
    );
  });

  test("executes successfully when the optional result cache fails", async () => {
    const { manifest, fetchAsset } = await createRuntime();
    const cache = {
      match: vi.fn(async () => {
        throw new Error("Cache read failed");
      }),
      put: vi.fn(async () => {
        throw new Error("Cache write failed");
      }),
    };
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://site.example",
      deploymentId: "build-1",
      manifest,
      fetchAsset,
      cache,
    });
    const request = createQueryRequest();
    request.headers.set("cache-control", "public, max-age=60");

    const response = await runtimeFetch(request);

    expect(response?.status).toBe(200);
    expect(await response?.json()).toMatchObject({
      ok: true,
      data: { assets: { items: [{ properties: { title: "Post" } }] } },
    });
    expect(cache.match).toHaveBeenCalledOnce();
    expect(cache.put).toHaveBeenCalledOnce();
  });

  test("rejects stale revisions and keys caches by deployment, revision, variables, hydration, and policy", async () => {
    const { runtimeFetch, manifest } = await createRuntime();
    const staleRequest = createQueryRequest();
    const body = await staleRequest.json();
    const staleResponse = await runtimeFetch(
      new Request(staleRequest.url, {
        method: "POST",
        body: JSON.stringify({ ...body, indexRevision: revision }),
      })
    );
    expect(await staleResponse?.json()).toMatchObject({
      ok: false,
      error: { code: "STALE_INDEX" },
    });

    const getKey = (
      deploymentId: string,
      entry: (typeof manifest)[number],
      request: Request
    ) => getPublishedAssetResourceCacheKey({ deploymentId, entry, request });
    const first = await getKey("build-1", manifest[0], createQueryRequest());
    const changedDeployment = await getKey(
      "build-2",
      manifest[0],
      createQueryRequest()
    );
    const changedRevision = await getKey(
      "build-1",
      { ...manifest[0], revision },
      createQueryRequest()
    );
    const changedQuery = await getKey(
      "build-1",
      manifest[0],
      createQueryRequest(contentQuery)
    );
    const changedParameters = await getKey(
      "build-1",
      manifest[0],
      new Request("https://site.example/$resources/assets/query", {
        method: "POST",
        body: JSON.stringify({
          query,
          variables: { slug: "other" },
        }),
      })
    );
    const changedCachePolicyRequest = createQueryRequest();
    changedCachePolicyRequest.headers.set(
      "cache-control",
      "public, max-age=60"
    );
    const changedCachePolicy = await getKey(
      "build-1",
      manifest[0],
      changedCachePolicyRequest
    );
    expect(
      new Set([
        first.url,
        changedDeployment.url,
        changedRevision.url,
        changedQuery.url,
        changedParameters.url,
        changedCachePolicy.url,
      ])
    ).toHaveLength(6);
  });

  test("rejects an operation name that does not match the published plan", async () => {
    const { runtimeFetch } = await createRuntime();
    const request = createQueryRequest();
    const body = await request.json();

    const response = await runtimeFetch(
      new Request(request.url, {
        method: "POST",
        body: JSON.stringify({ ...body, operationName: "Other" }),
      })
    );

    expect(response?.status).toBe(400);
    expect(await response?.json()).toMatchObject({
      ok: false,
      error: { code: "INVALID_QUERY" },
    });
  });
});
