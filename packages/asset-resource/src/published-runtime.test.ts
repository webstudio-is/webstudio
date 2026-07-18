import { beforeEach, describe, expect, test, vi } from "vitest";
import { createAssetResourceIndex } from "./resource-index";
import {
  __testing,
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

describe("published asset resource runtime", () => {
  beforeEach(() => __testing.clearParsedIndexCache());

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

  test("rejects stale revisions and keys caches by deployment, revision, parameters, and hydration", async () => {
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
    expect(
      new Set([
        first.url,
        changedDeployment.url,
        changedRevision.url,
        changedHydration.url,
        changedParameters.url,
      ])
    ).toHaveLength(5);
  });
});
