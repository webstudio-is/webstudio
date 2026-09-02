import { afterEach, expect, test, vi } from "vitest";
import type { ResourceRequest } from "@webstudio-is/sdk";
import {
  __testing__,
  $hasPendingResources,
  $resourceDiagnosticsCache,
  $resourceDiagnosticsErrorCache,
  $resourcePerformanceCache,
  $resourcesCache,
  getResourceKey,
  loadResourceDiagnostics,
  preloadResources,
} from "./resources";

const {
  getLoaderState,
  loadResources,
  queueInvalidatedResource,
  queueResources,
  reset,
  startLoading,
} = __testing__;

afterEach(() => {
  reset();
  vi.useRealTimers();
});

test("removes obsolete queued requests but keeps cached results", () => {
  vi.useFakeTimers();
  const request: ResourceRequest = {
    name: "Posts",
    method: "get",
    url: "https://example.com/posts",
    searchParams: [],
    headers: [],
  };
  const key = getResourceKey(request);

  queueResources([request]);
  $resourcesCache.get().set(key, { stale: true });
  expect($hasPendingResources.get()).toBe(true);

  const resourceCacheListener = vi.fn();
  const unlisten = $resourcesCache.listen(resourceCacheListener);
  resourceCacheListener.mockClear();
  queueResources([]);

  expect($resourcesCache.get().has(key)).toBe(true);
  expect($hasPendingResources.get()).toBe(false);
  expect(resourceCacheListener).not.toHaveBeenCalled();
  unlisten();
});

test("dispatches resources synchronously", async () => {
  const request: ResourceRequest = {
    name: "Immediate",
    method: "get",
    url: "https://example.com/immediate",
    searchParams: [],
    headers: [],
  };
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  preloadResources([request]);
  expect(getLoaderState()).toEqual({ queueSize: 0, pendingSize: 1 });
  await vi.waitFor(() => {
    expect($hasPendingResources.get()).toBe(false);
  });
  error.mockRestore();
});

test("batches all resources from one computation", async () => {
  vi.useFakeTimers();
  const requests: ResourceRequest[] = [
    {
      name: "Posts",
      method: "get",
      url: "https://example.com/batch-posts",
      searchParams: [],
      headers: [],
    },
    {
      name: "Authors",
      method: "get",
      url: "https://example.com/authors",
      searchParams: [],
      headers: [],
    },
  ];
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json([]));

  queueResources(requests);
  await loadResources(fetch as typeof globalThis.fetch);
  expect(fetch).toHaveBeenCalledOnce();
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual(requests);
});

test("deduplicates identical requests", async () => {
  vi.useFakeTimers();
  const request: ResourceRequest = {
    name: "Posts",
    method: "get",
    url: "https://example.com/deduplicated-posts",
    searchParams: [],
    headers: [],
  };
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json([]));

  queueResources([request, request]);
  await loadResources(fetch as typeof globalThis.fetch);

  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual([request]);
});

test("reloads an invalidated cached request", async () => {
  vi.useFakeTimers();
  const request: ResourceRequest = {
    name: "Posts",
    method: "get",
    url: "https://example.com/invalidated-posts",
    searchParams: [],
    headers: [],
  };
  const key = getResourceKey(request);
  const firstFetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json([[key, { data: "first" }]])
  );
  queueResources([request]);
  await loadResources(firstFetch as typeof globalThis.fetch);
  expect($resourcesCache.get().get(key)).toEqual({ data: "first" });

  const secondFetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json([[key, { data: "second" }]])
  );
  queueInvalidatedResource(request);
  await loadResources(secondFetch as typeof globalThis.fetch);

  expect(secondFetch).toHaveBeenCalledOnce();
  expect($resourcesCache.get().get(key)).toEqual({ data: "second" });
});

test("replaces an invalidated in-flight request without caching stale data", async () => {
  vi.useFakeTimers();
  const request: ResourceRequest = {
    name: "Posts",
    method: "get",
    url: "https://example.com/in-flight-posts",
    searchParams: [],
    headers: [],
  };
  const key = getResourceKey(request);
  let resolveFirst: (response: Response) => void = () => {};
  const firstResponse = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });
  const requestFetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementationOnce(() => firstResponse)
    .mockResolvedValueOnce(Response.json([]));

  queueResources([request]);
  const firstLoad = loadResources(requestFetch as typeof globalThis.fetch);
  queueInvalidatedResource(request);
  startLoading(requestFetch as typeof globalThis.fetch);
  resolveFirst(Response.json([[key, { data: "stale" }]]));
  await firstLoad;
  expect($resourcesCache.get().has(key)).toBe(false);

  await vi.waitFor(() => {
    expect(requestFetch).toHaveBeenCalledTimes(2);
  });

  expect(JSON.parse(String(requestFetch.mock.calls[1][1]?.body))).toEqual([
    request,
  ]);
});

test("loads fresh page resources alongside a still-current pending resource", async () => {
  const shared: ResourceRequest = {
    name: "Shared navigation",
    method: "get",
    url: "https://example.com/shared-navigation",
    searchParams: [],
    headers: [],
  };
  const obsolete: ResourceRequest = {
    name: "Obsolete page",
    method: "get",
    url: "https://example.com/obsolete-page",
    searchParams: [],
    headers: [],
  };
  const fresh: ResourceRequest = {
    name: "Fresh page",
    method: "get",
    url: "https://example.com/fresh-page",
    searchParams: [],
    headers: [],
  };
  let resolveFirst: (response: Response) => void = () => {};
  let resolveSecond: (response: Response) => void = () => {};
  const firstResponse = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });
  const secondResponse = new Promise<Response>((resolve) => {
    resolveSecond = resolve;
  });
  const requestFetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementationOnce(() => firstResponse)
    .mockImplementationOnce(() => secondResponse);

  queueResources([shared, obsolete]);
  const firstLoad = loadResources(requestFetch as typeof globalThis.fetch);
  queueResources([shared, fresh]);
  startLoading(requestFetch as typeof globalThis.fetch);

  await vi.waitFor(() => {
    expect(requestFetch).toHaveBeenCalledTimes(2);
  });
  expect(JSON.parse(String(requestFetch.mock.calls[1][1]?.body))).toEqual([
    fresh,
  ]);
  expect(requestFetch.mock.calls[0][1]?.signal?.aborted).toBe(false);
  expect(getLoaderState()).toEqual({ queueSize: 0, pendingSize: 2 });

  resolveFirst(
    Response.json([
      [getResourceKey(shared), { data: "shared" }],
      [getResourceKey(obsolete), { data: "obsolete" }],
    ])
  );
  await firstLoad;
  expect($resourcesCache.get().get(getResourceKey(shared))).toEqual({
    data: "shared",
  });
  expect($resourcesCache.get().has(getResourceKey(obsolete))).toBe(false);
  expect(getLoaderState()).toEqual({ queueSize: 0, pendingSize: 1 });

  resolveSecond(Response.json([[getResourceKey(fresh), { data: "fresh" }]]));
  await vi.waitFor(() => {
    expect(getLoaderState()).toEqual({ queueSize: 0, pendingSize: 0 });
  });
  expect($resourcesCache.get().get(getResourceKey(fresh))).toEqual({
    data: "fresh",
  });
});

test("aborts a resource batch when all dispatched resources become obsolete", async () => {
  const obsolete: ResourceRequest = {
    name: "Obsolete page",
    method: "get",
    url: "https://example.com/obsolete-page",
    searchParams: [],
    headers: [],
  };
  const fresh: ResourceRequest = {
    name: "Fresh page",
    method: "get",
    url: "https://example.com/fresh-page",
    searchParams: [],
    headers: [],
  };
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const requestFetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementationOnce(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          );
        })
    )
    .mockResolvedValueOnce(Response.json([]));

  queueResources([obsolete]);
  const obsoleteLoad = loadResources(requestFetch as typeof globalThis.fetch);
  queueResources([fresh]);
  startLoading(requestFetch as typeof globalThis.fetch);

  expect(requestFetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  await obsoleteLoad;
  await vi.waitFor(() => {
    expect(requestFetch).toHaveBeenCalledTimes(2);
  });
  expect(JSON.parse(String(requestFetch.mock.calls[1][1]?.body))).toEqual([
    fresh,
  ]);
  expect(error).not.toHaveBeenCalled();
  error.mockRestore();
});

test("keeps a replacement pending when an obsolete same-key batch settles", async () => {
  const request: ResourceRequest = {
    name: "Posts",
    method: "get",
    url: "https://example.com/same-key-race",
    searchParams: [],
    headers: [],
  };
  const key = getResourceKey(request);
  let resolveFirst: (response: Response) => void = () => {};
  let resolveSecond: (response: Response) => void = () => {};
  const requestFetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        })
    )
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveSecond = resolve;
        })
    );

  queueResources([request]);
  const obsoleteLoad = loadResources(requestFetch as typeof globalThis.fetch);
  queueInvalidatedResource(request);
  startLoading(requestFetch as typeof globalThis.fetch);

  await vi.waitFor(() => {
    expect(requestFetch).toHaveBeenCalledTimes(2);
  });
  resolveFirst(Response.json([[key, { data: "stale" }]]));
  await obsoleteLoad;
  expect($resourcesCache.get().has(key)).toBe(false);
  expect(getLoaderState()).toEqual({ queueSize: 0, pendingSize: 1 });

  resolveSecond(Response.json([[key, { data: "fresh" }]]));
  await vi.waitFor(() => {
    expect(getLoaderState()).toEqual({ queueSize: 0, pendingSize: 0 });
  });
  expect($resourcesCache.get().get(key)).toEqual({ data: "fresh" });
});

test("fills capacity freed by obsolete resources in a mixed batch", async () => {
  const shared = Array.from({ length: 2 }, (_, index) => ({
    name: `Shared ${index}`,
    method: "get" as const,
    url: `https://example.com/shared-${index}`,
    searchParams: [],
    headers: [],
  }));
  const obsolete = Array.from({ length: 3 }, (_, index) => ({
    name: `Obsolete ${index}`,
    method: "get" as const,
    url: `https://example.com/obsolete-${index}`,
    searchParams: [],
    headers: [],
  }));
  const fresh = Array.from({ length: 3 }, (_, index) => ({
    name: `Fresh ${index}`,
    method: "get" as const,
    url: `https://example.com/fresh-${index}`,
    searchParams: [],
    headers: [],
  }));
  let resolveFirst: (response: Response) => void = () => {};
  const requestFetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        })
    )
    .mockResolvedValueOnce(Response.json([]));

  queueResources([...shared, ...obsolete]);
  const firstLoad = loadResources(requestFetch as typeof globalThis.fetch);
  queueResources([...shared, ...fresh]);
  startLoading(requestFetch as typeof globalThis.fetch);

  await vi.waitFor(() => {
    expect(requestFetch).toHaveBeenCalledTimes(2);
  });
  expect(JSON.parse(String(requestFetch.mock.calls[1][1]?.body))).toEqual(
    fresh
  );
  expect(getLoaderState()).toEqual({ queueSize: 0, pendingSize: 5 });

  resolveFirst(Response.json([]));
  await firstLoad;
});

test("drains bounded batches without an additional delay", async () => {
  vi.useFakeTimers();
  const requests: ResourceRequest[] = Array.from({ length: 6 }, (_, index) => ({
    name: `Resource ${index}`,
    method: "get",
    url: `https://example.com/resource-${index}`,
    searchParams: [],
    headers: [],
  }));
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json([]));

  queueResources(requests);
  await loadResources(fetch as typeof globalThis.fetch);
  await vi.waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toHaveLength(5);
  expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toHaveLength(1);
});

test("loads detailed Assets diagnostics and performance only on demand", async () => {
  const request: ResourceRequest = {
    name: "assets",
    method: "post",
    url: "/$resources/assets",
    searchParams: [],
    headers: [{ name: "content-type", value: "application/json" }],
    body: { query: {} },
  };
  const key = getResourceKey(request);
  const diagnostics = {
    scope: "query-preview",
    query: {
      usedBytes: 100,
      maxBytes: 512_000,
      unboundedBytes: 100,
      includedDocumentCount: 1,
      omittedDocumentCount: 0,
      truncated: false,
    },
    database: {
      usedBytes: 200,
      maxBytes: 512_000,
      unboundedBytes: 200,
      includedDocumentCount: 2,
      omittedDocumentCount: 0,
      truncated: false,
    },
    unresolved: { items: [], totalCount: 0, hasMore: false },
  };
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json([
      [
        key,
        {
          data: {},
          __diagnostics__: diagnostics,
          __performance__: {
            serverDurationMs: 75,
            assetQuery: {
              phases: { diagnosticsPreparation: 50 },
            },
          },
        },
      ],
    ])
  );
  const first = loadResourceDiagnostics(request, fetch);
  const second = loadResourceDiagnostics(request, fetch);
  expect(first).toBe(second);
  await first;

  expect(fetch).toHaveBeenCalledWith(
    "/rest/resources-loader?diagnostics=true",
    expect.objectContaining({ method: "POST" })
  );
  expect(fetch).toHaveBeenCalledOnce();
  expect($resourceDiagnosticsCache.get().get(key)).toEqual(diagnostics);
  expect($resourcePerformanceCache.get().get(key)).toMatchObject({
    serverDurationMs: 75,
    loaderDurationMs: expect.any(Number),
    assetQuery: {
      phases: { diagnosticsPreparation: 50 },
    },
  });
  expect($resourcesCache.get().has(key)).toBe(false);
});

test("keeps a diagnostics-only failure separate from the resource value", async () => {
  const request: ResourceRequest = {
    name: "assets",
    method: "post",
    url: "/$resources/assets",
    searchParams: [],
    headers: [],
    body: { query: {} },
  };
  const key = getResourceKey(request);
  $resourcesCache.get().set(key, { data: { items: [] } });
  const failure = {
    ok: false,
    status: 400,
    data: {
      error: {
        code: "INVALID_REQUEST",
        message: "Unexpected closing tag",
        details: { path: "posts/broken.mdx", line: 7, column: 4 },
      },
    },
  };
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json([[key, failure]])
  );

  await loadResourceDiagnostics(request, fetch);

  expect($resourcesCache.get().get(key)).toEqual({ data: { items: [] } });
  expect($resourceDiagnosticsCache.get().has(key)).toBe(false);
  expect($resourceDiagnosticsErrorCache.get().get(key)).toEqual(failure);
});

test("caches performance metrics separately from resource values", async () => {
  const request: ResourceRequest = {
    name: "Posts",
    method: "get",
    url: "https://example.com/performance",
    searchParams: [],
    headers: [],
  };
  const key = getResourceKey(request);
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json([
      [
        key,
        {
          data: { title: "Post" },
          __performance__: { serverDurationMs: 42, responseBytes: 128 },
        },
      ],
    ])
  );

  queueResources([request]);
  await loadResources(fetch);

  expect($resourcesCache.get().get(key)).toEqual({
    data: { title: "Post" },
  });
  expect($resourcePerformanceCache.get().get(key)).toMatchObject({
    serverDurationMs: 42,
    responseBytes: 128,
    loaderDurationMs: expect.any(Number),
  });
});

test("discards stale diagnostics after invalidation", async () => {
  vi.useFakeTimers();
  const request: ResourceRequest = {
    name: "assets",
    method: "post",
    url: "/$resources/assets",
    searchParams: [],
    headers: [{ name: "content-type", value: "application/json" }],
    body: { query: {} },
  };
  const key = getResourceKey(request);
  let resolveFirst: (response: Response) => void = () => {};
  const firstResponse = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });
  let firstSignal: AbortSignal | undefined;
  const firstFetch = vi.fn<typeof globalThis.fetch>((_input, init) => {
    firstSignal = init?.signal ?? undefined;
    return firstResponse;
  });
  const first = loadResourceDiagnostics(request, firstFetch);
  await Promise.resolve();

  queueInvalidatedResource(request);
  expect(firstSignal?.aborted).toBe(true);
  const freshDiagnostics = {
    scope: "query-preview",
    query: {
      usedBytes: 1,
      maxBytes: 512_000,
      unboundedBytes: 1,
      includedDocumentCount: 1,
      omittedDocumentCount: 0,
      truncated: false,
    },
    database: {
      usedBytes: 2,
      maxBytes: 512_000,
      unboundedBytes: 2,
      includedDocumentCount: 1,
      omittedDocumentCount: 0,
      truncated: false,
    },
  };
  const secondFetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json([[key, { data: {}, __diagnostics__: freshDiagnostics }]])
  );
  const second = loadResourceDiagnostics(request, secondFetch);

  expect(second).not.toBe(first);
  resolveFirst(
    Response.json([[key, { data: {}, __diagnostics__: { stale: true } }]])
  );
  await first;
  await second;

  expect($resourceDiagnosticsCache.get().get(key)).toEqual(freshDiagnostics);
});

test("does not retain a diagnostics request after a synchronous fetch failure", async () => {
  const request: ResourceRequest = {
    name: "assets",
    method: "post",
    url: "/$resources/assets",
    searchParams: [],
    headers: [],
    body: { query: {} },
  };
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetch = vi.fn<typeof globalThis.fetch>(() => {
    throw new Error("failed synchronously");
  });

  await loadResourceDiagnostics(request, fetch);
  await loadResourceDiagnostics(request, fetch);

  expect(fetch).toHaveBeenCalledTimes(2);
  error.mockRestore();
});

test("discards detailed diagnostics that settle after reset", async () => {
  const request: ResourceRequest = {
    name: "assets",
    method: "post",
    url: "/$resources/assets",
    searchParams: [],
    headers: [],
    body: { query: {} },
  };
  const key = getResourceKey(request);
  let resolveResponse: (response: Response) => void = () => {};
  const response = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  const fetch = vi.fn<typeof globalThis.fetch>(() => response);
  const pending = loadResourceDiagnostics(request, fetch);

  reset();
  resolveResponse(
    Response.json([
      [
        key,
        {
          data: {},
          __diagnostics__: {
            scope: "query-preview",
            query: {
              usedBytes: 1,
              maxBytes: 1,
              unboundedBytes: 1,
              includedDocumentCount: 1,
              omittedDocumentCount: 0,
              truncated: false,
            },
            database: {
              usedBytes: 1,
              maxBytes: 1,
              unboundedBytes: 1,
              includedDocumentCount: 1,
              omittedDocumentCount: 0,
              truncated: false,
            },
          },
        },
      ],
    ])
  );
  await pending;

  expect($resourceDiagnosticsCache.get().has(key)).toBe(false);
});

test("keeps loading distinct from a confirmed empty Assets result", async () => {
  vi.useFakeTimers();
  const request: ResourceRequest = {
    name: "assets",
    method: "post",
    url: "/$resources/assets",
    searchParams: [],
    headers: [{ name: "content-type", value: "application/json" }],
    body: { query: {} },
  };
  const key = getResourceKey(request);
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json([
      [
        key,
        {
          ok: true,
          data: {},
          meta: { totalCount: 0, hasMore: false },
        },
      ],
    ])
  );

  queueResources([request]);
  expect($resourcesCache.get().get(key)).toBeUndefined();
  expect($hasPendingResources.get()).toBe(true);

  await loadResources(fetch);

  expect($resourcesCache.get().get(key)).toMatchObject({
    meta: { totalCount: 0, hasMore: false },
  });
  expect($hasPendingResources.get()).toBe(false);
});

test.each([
  {
    name: "a rejected request",
    fetch: async () => {
      throw new Error("network failure");
    },
  },
  {
    name: "a non-success response",
    fetch: async () => new Response(null, { status: 503 }),
  },
  {
    name: "a response missing the dispatched result",
    fetch: async () => Response.json([]),
  },
])("settles pending resources after $name", async ({ fetch }) => {
  vi.useFakeTimers();
  const request: ResourceRequest = {
    name: "Posts",
    method: "get",
    url: "https://example.com/posts",
    searchParams: [],
    headers: [],
  };
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  queueResources([request]);
  await loadResources(fetch as typeof globalThis.fetch);

  expect($hasPendingResources.get()).toBe(false);
  error.mockRestore();
});
