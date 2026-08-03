import { afterEach, expect, test, vi } from "vitest";
import type { ResourceRequest } from "@webstudio-is/sdk";
import {
  __testing__,
  $hasPendingResources,
  $resourceDiagnosticsCache,
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
  scheduleLoading,
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

  queueResources([]);

  expect($resourcesCache.get().has(key)).toBe(true);
  expect($hasPendingResources.get()).toBe(false);
});

test("defers resource dispatch until the next animation frame", () => {
  vi.useFakeTimers();
  const request: ResourceRequest = {
    name: "Immediate",
    method: "get",
    url: "https://example.com/immediate",
    searchParams: [],
    headers: [],
  };
  preloadResources([request]);
  expect(getLoaderState()).toEqual({ queueSize: 1, pendingSize: 0 });
});

test("coalesces synchronous resource computations before dispatch", async () => {
  vi.useFakeTimers();
  const firstRequest: ResourceRequest = {
    name: "First",
    method: "get",
    url: "https://example.com/first",
    searchParams: [],
    headers: [],
  };
  const finalRequest: ResourceRequest = {
    name: "Final",
    method: "get",
    url: "https://example.com/final",
    searchParams: [],
    headers: [],
  };

  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json([]));

  queueResources([firstRequest]);
  scheduleLoading(fetch);
  queueResources([finalRequest]);

  expect(getLoaderState()).toEqual({ queueSize: 1, pendingSize: 0 });
  expect(fetch).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(16);

  expect(fetch).toHaveBeenCalledOnce();
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual([
    finalRequest,
  ]);
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

test("loads detailed Assets diagnostics only on demand", async () => {
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
    Response.json([[key, { data: {}, __diagnostics__: diagnostics }]])
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
  const firstFetch = vi.fn<typeof globalThis.fetch>(() => firstResponse);
  const first = loadResourceDiagnostics(request, firstFetch);

  queueInvalidatedResource(request);
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
