import { afterEach, expect, test, vi } from "vitest";
import type { ResourceRequest } from "@webstudio-is/sdk";
import {
  __testing__,
  $hasPendingResources,
  $resourcesCache,
  getResourceKey,
  invalidateResource,
  preloadResources,
} from "./resources";

const { loadResources, reset } = __testing__;

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

  preloadResources([request]);
  $resourcesCache.get().set(key, { stale: true });
  expect($hasPendingResources.get()).toBe(true);

  preloadResources([]);

  expect($resourcesCache.get().has(key)).toBe(true);
  expect($hasPendingResources.get()).toBe(false);
});

test("dispatches resources without a debounce", async () => {
  vi.useFakeTimers();
  const request: ResourceRequest = {
    name: "Immediate",
    method: "get",
    url: "https://example.com/immediate",
    searchParams: [],
    headers: [],
  };
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  preloadResources([request]);
  expect($hasPendingResources.get()).toBe(true);
  await vi.advanceTimersByTimeAsync(0);

  expect($hasPendingResources.get()).toBe(false);
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
  const fetch = vi.fn(async () => Response.json([]));

  preloadResources(requests);
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
  const fetch = vi.fn(async () => Response.json([]));

  preloadResources([request, request]);
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
  const firstFetch = vi.fn(async () =>
    Response.json([[key, { data: "first" }]])
  );
  preloadResources([request]);
  await loadResources(firstFetch as typeof globalThis.fetch);
  expect($resourcesCache.get().get(key)).toEqual({ data: "first" });

  const secondFetch = vi.fn(async () =>
    Response.json([[key, { data: "second" }]])
  );
  invalidateResource(request);
  await loadResources(secondFetch as typeof globalThis.fetch);

  expect(secondFetch).toHaveBeenCalledOnce();
  expect($resourcesCache.get().get(key)).toEqual({ data: "second" });
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
  const fetch = vi.fn(async () => Response.json([]));

  preloadResources(requests);
  await loadResources(fetch as typeof globalThis.fetch);
  await loadResources(fetch as typeof globalThis.fetch);

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toHaveLength(5);
  expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toHaveLength(1);
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

  preloadResources([request]);
  await loadResources(fetch as typeof globalThis.fetch);

  expect($hasPendingResources.get()).toBe(false);
  error.mockRestore();
});
