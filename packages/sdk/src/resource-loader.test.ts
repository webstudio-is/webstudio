import {
  afterEach,
  describe,
  expect,
  test,
  beforeEach,
  vi,
  type Mock,
} from "vitest";

import {
  assetsUploadsApiUrl,
  createResourceFetchBatchProvider,
  getAssetApiUrl,
  getAssetContentApiUrl,
  getAssetFolderApiUrl,
  getAssetUploadApiUrl,
  getResourceCacheKey,
  isLocalResource,
  loadResource,
} from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";

test("builds canonical Assets command URLs", () => {
  expect(assetsUploadsApiUrl).toBe("/rest/assets/uploads");
  expect(getAssetUploadApiUrl("folder/name.png")).toBe(
    "/rest/assets/uploads/folder%2Fname.png"
  );
  expect(getAssetContentApiUrl("asset/id")).toBe(
    "/rest/assets/asset%2Fid/content"
  );
  expect(getAssetApiUrl("asset/id")).toBe("/rest/assets/asset%2Fid");
  expect(getAssetFolderApiUrl("folder/id")).toBe(
    "/rest/assets/folders/folder%2Fid"
  );
});

describe("resource fetch batch provider", () => {
  test("collects matching requests and maps responses in request order", async () => {
    const execute = vi.fn(async (requests: readonly Request[]) =>
      requests.map(
        (request) => new Response(new URL(request.url).searchParams.get("id"))
      )
    );
    const provider = createResourceFetchBatchProvider({
      baseUrl: "https://example.com/builder",
      shouldBatch: (input) =>
        typeof input === "string" && input.startsWith("/$resources/assets"),
      execute,
    });

    const first = provider.fetch("/$resources/assets?id=first", {
      method: "POST",
    });
    const second = provider.fetch("/$resources/assets?id=second", {
      method: "POST",
    });

    expect(provider.fetch("https://example.com/posts")).toBeUndefined();

    await Promise.all([provider.flush(), provider.flush()]);
    await provider.flush();

    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith([
      expect.objectContaining({
        url: "https://example.com/$resources/assets?id=first",
      }),
      expect.objectContaining({
        url: "https://example.com/$resources/assets?id=second",
      }),
    ]);
    await expect(first).resolves.toHaveProperty("url");
    await expect(first?.then((response) => response.text())).resolves.toBe(
      "first"
    );
    await expect(second?.then((response) => response.text())).resolves.toBe(
      "second"
    );
    expect(provider.fetch("/$resources/assets?id=late")).toBeUndefined();
  });

  test("uses the in-flight execution as the completion barrier for every flush", async () => {
    let finishExecution!: (responses: readonly Response[]) => void;
    const execute = vi.fn(
      () =>
        new Promise<readonly Response[]>((resolve) => {
          finishExecution = resolve;
        })
    );
    const provider = createResourceFetchBatchProvider({
      baseUrl: "https://example.com",
      shouldBatch: () => true,
      execute,
    });
    const response = provider.fetch("/first");
    const settled: string[] = [];

    const firstBarrier = provider.flush();
    const concurrentBarrier = provider.flush();
    const usesSameBarrier = firstBarrier === concurrentBarrier;
    const firstFlush = firstBarrier.then(() => {
      settled.push("first");
    });
    const concurrentFlush = concurrentBarrier.then(() => {
      settled.push("concurrent");
    });
    await Promise.resolve();
    const settledBeforeExecution = [...settled];

    finishExecution([new Response("done")]);
    await Promise.all([firstFlush, concurrentFlush]);

    expect(usesSameBarrier).toBe(true);
    expect(settledBeforeExecution).toEqual([]);
    expect(settled).toEqual(["first", "concurrent"]);
    await expect(provider.flush()).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledOnce();
    await expect(response?.then((item) => item.text())).resolves.toBe("done");
  });

  test("rejects every request when execution fails", async () => {
    const error = new Error("batch failed");
    const provider = createResourceFetchBatchProvider({
      baseUrl: "https://example.com",
      shouldBatch: () => true,
      execute: vi.fn().mockRejectedValue(error),
    });
    const first = provider.fetch("/first");
    const second = provider.fetch("/second");

    await provider.flush();

    await expect(first).rejects.toBe(error);
    await expect(second).rejects.toBe(error);
  });

  test("rejects every request when the response count does not match", async () => {
    const provider = createResourceFetchBatchProvider({
      baseUrl: "https://example.com",
      shouldBatch: () => true,
      execute: vi.fn().mockResolvedValue([new Response("first")]),
    });
    const first = provider.fetch("/first");
    const second = provider.fetch("/second");

    await provider.flush();

    await expect(first).rejects.toThrow(
      "Resource batch response count does not match requests"
    );
    await expect(second).rejects.toThrow(
      "Resource batch response count does not match requests"
    );
  });
});

// Mock the fetch function

describe("loadResource", () => {
  let mockFetch: Mock<typeof fetch>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("should successfully fetch a resource and return a JSON response", async () => {
    const mockResponse = new Response(JSON.stringify({ key: "value" }), {
      status: 200,
    });
    mockFetch.mockResolvedValue(mockResponse);

    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [],
      method: "get",
      headers: [],
      body: undefined,
    };

    const result = await loadResource(mockFetch, resourceRequest);

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/resource", {
      method: "get",
      headers: new Headers(),
    });

    expect(result).toEqual({
      data: {
        key: "value",
      },
      ok: true,
      status: 200,
      statusText: "",
    });
  });

  test("should fetch resource successfully with non-JSON response", async () => {
    const mockResponse = new Response("nonjson", {
      status: 200,
    });
    mockFetch.mockResolvedValue(mockResponse);

    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [],
      method: "get",
      headers: [],
      body: undefined,
    };

    const result = await loadResource(mockFetch, resourceRequest);

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/resource", {
      method: "get",
      headers: new Headers(),
    });

    expect(result).toEqual({
      data: "nonjson",
      ok: true,
      status: 200,
      statusText: "",
    });
  });

  test("exposes Assets query results as an ID-keyed resource value", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            items: [
              { id: "second", name: "Second" },
              { id: "first", name: "First" },
            ],
            totalCount: 5,
            hasMore: true,
          },
          __diagnostics__: { scope: "query-preview" },
        })
      )
    );

    const result = await loadResource(mockFetch, {
      name: "assets",
      url: "/$resources/assets",
      searchParams: [],
      method: "post",
      headers: [],
      body: {},
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      statusText: "",
      data: {
        second: { name: "Second" },
        first: { name: "First" },
      },
      meta: { totalCount: 5, hasMore: true },
      __diagnostics__: { scope: "query-preview" },
    });
    expect(Object.keys(result.data)).toEqual(["second", "first"]);
  });

  test("retains ID in Assets values only when selected", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ id: "asset", name: "Asset" }],
          totalCount: 1,
          hasMore: false,
        })
      )
    );

    const result = await loadResource(mockFetch, {
      name: "assets",
      url: "/$resources/assets",
      searchParams: [],
      method: "post",
      headers: [],
      body: {
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
        },
      },
    });

    expect(result.data).toEqual({ asset: { id: "asset", name: "Asset" } });
  });

  test("does not reshape arbitrary POST resources", async () => {
    const collection = {
      items: [{ id: "item" }],
      totalCount: 1,
      hasMore: false,
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(collection)));

    await expect(
      loadResource(
        mockFetch,
        {
          name: "posts",
          url: "/api/posts",
          searchParams: [],
          method: "post",
          headers: [],
          body: {},
        },
        "https://example.com"
      )
    ).resolves.toMatchObject({ data: collection });
  });

  test("should fetch resource with search params", async () => {
    const mockResponse = new Response(JSON.stringify({ key: "value" }), {
      status: 200,
    });
    mockFetch.mockResolvedValue(mockResponse);

    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [
        { name: "search", value: "term1" },
        { name: "search", value: "term2" },
        { name: "filter", value: "привет" },
      ],
      method: "get",
      headers: [],
    };

    await loadResource(mockFetch, resourceRequest);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/resource?search=term1&search=term2&filter=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82",
      {
        method: "get",
        headers: new Headers(),
      }
    );
  });

  test("resolves a root-relative URL against the request origin", async () => {
    mockFetch.mockResolvedValue(new Response("ok"));
    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "/api/posts",
      searchParams: [{ name: "tag", value: "news" }],
      method: "get",
      headers: [],
    };

    await loadResource(
      mockFetch,
      resourceRequest,
      "https://example.com/blog/post"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/api/posts?tag=news",
      {
        method: "get",
        headers: new Headers(),
      }
    );
  });

  test("resolves a path-relative URL against the request origin", async () => {
    mockFetch.mockResolvedValue(new Response("ok"));
    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "api/posts",
      searchParams: [],
      method: "get",
      headers: [],
    };

    await loadResource(
      mockFetch,
      resourceRequest,
      "https://example.com/blog/post"
    );

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/posts", {
      method: "get",
      headers: new Headers(),
    });
  });

  test("does not intercept an external URL that resembles a local resource", () => {
    expect(
      isLocalResource("https://example.com/$resources/assets", "assets")
    ).toBe(false);
    expect(isLocalResource("//$resources/assets", "assets")).toBe(false);
    expect(isLocalResource("//example.com/$resources/assets", "assets")).toBe(
      false
    );
  });

  test("matches only the exact Assets resource path", () => {
    expect(isLocalResource("/$resources/assets", "assets")).toBe(true);
    expect(isLocalResource("/$resources/assets/query", "assets")).toBe(false);
  });

  test("keeps a local resource relative while resolving ordinary URLs", async () => {
    mockFetch.mockResolvedValue(new Response("ok"));
    await loadResource(
      mockFetch,
      {
        name: "assets",
        url: "/$resources/assets",
        searchParams: [{ name: "page", value: 1 }],
        method: "get",
        headers: [],
      },
      "https://example.com/blog/post"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "/$resources/assets?page=1",
      expect.any(Object)
    );
  });

  test("returns a structured cancellation failure", async () => {
    const controller = new AbortController();
    controller.abort();
    mockFetch.mockImplementation((_input, init) => {
      if (init?.signal?.aborted) {
        return Promise.reject(new DOMException("Aborted", "AbortError"));
      }
      return Promise.resolve(new Response("unexpected"));
    });
    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [],
      method: "get",
      headers: [],
    };

    await expect(
      loadResource(mockFetch, resourceRequest, undefined, {
        signal: controller.signal,
      })
    ).resolves.toEqual({
      ok: false,
      data: {
        ok: false,
        error: {
          code: "REQUEST_CANCELLED",
          message: "Resource request was cancelled",
          retryable: false,
        },
      },
      status: 499,
      statusText: "Resource request was cancelled",
    });
  });

  test("aborts at the deadline and returns a structured timeout", async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );
    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [],
      method: "get",
      headers: [],
    };

    const pending = loadResource(mockFetch, resourceRequest, undefined, {
      timeoutMs: 100,
    });
    await vi.advanceTimersByTimeAsync(100);

    await expect(pending).resolves.toEqual({
      ok: false,
      data: {
        ok: false,
        error: {
          code: "REQUEST_TIMEOUT",
          message: "Resource request exceeded 100ms",
          retryable: true,
        },
      },
      status: 504,
      statusText: "Resource request exceeded 100ms",
    });
  });

  test("returns a safe structured network failure", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error("secret upstream detail"));
    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [],
      method: "get",
      headers: [],
    };

    await expect(loadResource(mockFetch, resourceRequest)).resolves.toEqual({
      ok: false,
      data: {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Resource request failed",
          retryable: true,
        },
      },
      status: 502,
      statusText: "Resource request failed",
    });
    expect(errorLog).toHaveBeenCalledWith("Resource request failed");
    expect(errorLog).not.toHaveBeenCalledWith(
      expect.stringContaining("secret upstream detail")
    );
  });

  test("should fetch resource with JSON search params", async () => {
    const mockResponse = new Response(JSON.stringify({ key: "value" }), {
      status: 200,
    });
    mockFetch.mockResolvedValue(mockResponse);

    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [
        { name: "filter", value: { type: "AND", left: "a", right: "b" } },
      ],
      method: "get",
      headers: [],
    };

    await loadResource(mockFetch, resourceRequest);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/resource?filter=%7B%22type%22%3A%22AND%22%2C%22left%22%3A%22a%22%2C%22right%22%3A%22b%22%7D",
      {
        method: "get",
        headers: new Headers(),
      }
    );
  });

  test("should fetch resource with JSON headers", async () => {
    const mockResponse = new Response(JSON.stringify({ key: "value" }), {
      status: 200,
    });
    mockFetch.mockResolvedValue(mockResponse);

    const resourceRequest: ResourceRequest = {
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [],
      method: "get",
      headers: [
        { name: "filter", value: { type: "AND", left: "a", right: "b" } },
      ],
    };

    await loadResource(mockFetch, resourceRequest);

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/resource", {
      method: "get",
      headers: new Headers([
        ["filter", '{"type":"AND","left":"a","right":"b"}'],
      ]),
    });
  });
  test("loads configured Assets queries on the standard endpoint", async () => {
    mockFetch.mockResolvedValue(Response.json({ ok: true }));

    await loadResource(mockFetch, {
      name: "Posts",
      control: "system",
      url: "/$resources/assets",
      searchParams: [],
      method: "post",
      headers: [{ name: "content-type", value: "application/json" }],
      body: { query: { where: { all: [] }, limit: 20, offset: 0 } },
    });

    expect(mockFetch).toHaveBeenCalledWith("/$resources/assets", {
      method: "post",
      headers: new Headers([["content-type", "application/json"]]),
      body: JSON.stringify({
        query: { where: { all: [] }, limit: 20, offset: 0 },
      }),
    });
  });
});

describe("getResourceCacheKey", () => {
  test("separates structured Assets queries and index revisions", async () => {
    const createRequest = (body: Record<string, unknown>) =>
      new Request("https://example.com/$resources/assets", {
        method: "POST",
        headers: { "cache-control": "public, max-age=60" },
        body: JSON.stringify(body),
      });
    const base = {
      query: {
        where: {
          all: [
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "first",
            },
          ],
        },
        sort: [{ field: ["createdAt"], direction: "desc" }],
        limit: 1,
        offset: 0,
        output: { mode: "all", includeMetadata: true },
        content: { mode: "none" },
      },
      indexRevision: "index-1",
    };
    const requests = [
      base,
      { ...base, query: { ...base.query, limit: 2 } },
      {
        ...base,
        query: {
          ...base.query,
          content: { mode: "markdown-body-ref", maxBytes: 1024 },
        },
      },
      { ...base, indexRevision: "index-2" },
    ];
    const keys = await Promise.all(
      requests.map(
        async (body) => (await getResourceCacheKey(createRequest(body))).href
      )
    );

    expect(new Set(keys).size).toBe(requests.length);
  });
});
