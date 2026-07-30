import { afterEach, expect, test, vi } from "vitest";
import type { ResourceRequest } from "@webstudio-is/sdk";
import {
  __testing__,
  $hasPendingResources,
  $resourcesCache,
  getResourceKey,
  preloadResources,
} from "./resources";

const { loadResources } = __testing__;

afterEach(() => {
  preloadResources([]);
  vi.useRealTimers();
});

test("removes obsolete queued requests and cached results", () => {
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

  expect($resourcesCache.get().has(key)).toBe(false);
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

  preloadResources([request]);
  await loadResources(fetch as typeof globalThis.fetch);

  expect($hasPendingResources.get()).toBe(false);
  error.mockRestore();
});
