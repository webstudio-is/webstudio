import { describe, expect, test, vi } from "vitest";
import { parseDocumentSource } from "./document-adapter";
import {
  createCachedDocumentSourceLoader,
  getDocumentSourceCacheKey,
  type CachedDocumentSource,
} from "./cached-document-loader";

const node = {
  id: "post",
  revision: "post-r1",
  contentRef: "content:post",
};

describe("cached document source loader", () => {
  test("returns replayable bytes from a revision-keyed cache hit", async () => {
    const cached: CachedDocumentSource = {
      format: "json",
      revision: "post-r1",
      bytes: new TextEncoder().encode('{"title":"Cached"}'),
    };
    const cache = {
      get: vi.fn(async () => cached),
      set: vi.fn(async () => undefined),
    };
    const load = vi.fn(async () => {
      throw new Error("source loader must not run");
    });
    const cachedLoad = createCachedDocumentSourceLoader({ cache, load });

    const result = await cachedLoad(node, {});
    expect(cache.get).toHaveBeenCalledWith(
      getDocumentSourceCacheKey({
        contentRef: "content:post",
        revision: "post-r1",
      })
    );
    expect(load).not.toHaveBeenCalled();
    await expect(parseDocumentSource(result)).resolves.toEqual({
      format: "json",
      value: { title: "Cached" },
    });
  });

  test("materializes and stores one bounded miss for concurrent callers", async () => {
    const cache = {
      get: vi.fn(async () => undefined),
      set: vi.fn(async () => undefined),
    };
    const load = vi.fn(async () => ({
      format: "json" as const,
      revision: "post-r1",
      source: {
        async *[Symbol.asyncIterator]() {
          yield new TextEncoder().encode('{"title":');
          await Promise.resolve();
          yield new TextEncoder().encode('"Fresh"}');
        },
      },
    }));
    const cachedLoad = createCachedDocumentSourceLoader({ cache, load });

    const [first, second] = await Promise.all([
      cachedLoad(node, {}),
      cachedLoad(node, {}),
    ]);

    expect(load).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledOnce();
    expect(first).toBe(second);
    expect(first.source).toBeInstanceOf(Uint8Array);
  });

  test("replaces stale cache entries and rejects oversized misses", async () => {
    const set = vi.fn(async () => undefined);
    const load = vi.fn(async () => ({
      format: "json" as const,
      revision: "post-r1",
      source: '{"title":"Fresh"}',
    }));
    const staleLoad = createCachedDocumentSourceLoader({
      cache: {
        get: async () => ({
          format: "json",
          revision: "stale-r1",
          bytes: new Uint8Array(),
        }),
        set,
      },
      load,
    });
    const refreshed = await staleLoad(node, {});
    await expect(parseDocumentSource(refreshed)).resolves.toEqual({
      format: "json",
      value: { title: "Fresh" },
    });
    expect(load).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledOnce();

    const cache = {
      get: async () => undefined,
      set: vi.fn(async () => undefined),
    };
    const oversizedLoad = createCachedDocumentSourceLoader({
      cache,
      maximumBytes: 2,
      load: async () => ({
        format: "json",
        revision: "post-r1",
        source: "{}\n",
      }),
    });
    await expect(oversizedLoad(node, {})).rejects.toMatchObject({
      code: "CONTENT_LIMIT_EXCEEDED",
      documentId: "post",
    });
    expect(cache.set).not.toHaveBeenCalled();
  });
});
