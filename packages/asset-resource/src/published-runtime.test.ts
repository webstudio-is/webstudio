import { beforeEach, describe, expect, test, vi } from "vitest";
import { createAssetResourceIndex } from "./resource-index";
import {
  __testing,
  createGeneratedAssetResourceFetch,
  createPublishedAssetResourceFetch,
  getPublishedAssetResourceCacheKey,
} from "./published-runtime";

const revision = `sha256:${"a".repeat(64)}`;
const query =
  '*[properties.slug == $slug][0]{_id, revision, contentRef, "title": properties.title}';

const createRuntime = async () => {
  const index = await createAssetResourceIndex({
    format: "webstudio-resource-index",
    version: 1,
    resourceId: "posts",
    query,
    assetRevision: revision,
    queryMode: "parameterized",
    parameterNames: ["slug"],
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

const createQueryRequest = (content: unknown = { mode: "none" }) =>
  new Request("https://site.example/$resources/assets/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      parameters: { slug: "post" },
      resultLimit: 1,
      content,
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
      body: JSON.stringify({ query, parameters: { slug: "hello" } }),
    });

    expect(response?.status).toBe(200);
  });

  test("evaluates runtime parameters and caches one parsed immutable index per isolate", async () => {
    const { runtimeFetch, fetchAsset } = await createRuntime();
    const first = await runtimeFetch(createQueryRequest());
    const second = await runtimeFetch(createQueryRequest());

    expect(await first?.json()).toMatchObject({
      ok: true,
      result: { _id: "post-1", title: "Post" },
      content: {},
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

  test("hydrates exactly the selected complete Markdown file", async () => {
    const { runtimeFetch, fetchAsset } = await createRuntime();
    const response = await runtimeFetch(createQueryRequest({ mode: "full" }));
    expect(await response?.json()).toMatchObject({
      ok: true,
      content: { "post-1": { text: "Post" } },
      meta: { hydratedFileCount: 1, hydratedBytes: 4 },
    });
    expect(fetchAsset).toHaveBeenCalledWith("/assets/post.md", {
      headers: expect.any(Headers),
    });
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
      result: { _id: "post-1", title: "Post" },
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
        body: JSON.stringify({ query, parameters: { slug: "post" } }),
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
      queryMode: "parameterized",
      parameterNames: ["slug"],
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
    ).toMatchObject({ result: { title: "Post" } });
    expect(
      await (await secondRuntime(createQueryRequest()))?.json()
    ).toMatchObject({ result: { title: "Other deployment" } });
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
      queryMode: "parameterized",
      parameterNames: ["slug"],
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
      result: { title: "Post" },
    });
    expect(cache.match).toHaveBeenCalledOnce();
    expect(cache.put).toHaveBeenCalledOnce();
  });

  test("rejects stale revisions and keys caches by deployment, revision, parameters, hydration, and policy", async () => {
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
    const changedHydration = await getKey(
      "build-1",
      manifest[0],
      createQueryRequest({ mode: "full" })
    );
    const changedParameters = await getKey(
      "build-1",
      manifest[0],
      new Request("https://site.example/$resources/assets/query", {
        method: "POST",
        body: JSON.stringify({
          query,
          parameters: { slug: "other" },
          resultLimit: 1,
          content: { mode: "none" },
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
        changedHydration.url,
        changedParameters.url,
        changedCachePolicy.url,
      ])
    ).toHaveLength(6);
  });
});
