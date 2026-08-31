import { describe, expect, test, vi } from "vitest";
import { LRUCache } from "lru-cache";
import { parseDocumentSource } from "./document-adapter";
import {
  createCachedDocumentSourceLoader,
  createMemoryDocumentSourceCache,
  getDocumentSourceCacheKey,
  type CachedDocumentSource,
} from "./cached-document-loader";

const node = {
  id: "post",
  revision: "post-r1",
  contentRef: "content:post",
  format: "json" as const,
};

describe("cached document source loader", () => {
  test("exposes the byte-bounded memory cache as an LRU", () => {
    const cache = createMemoryDocumentSourceCache({ maximumBytes: 2 });
    const source: CachedDocumentSource = {
      format: "json",
      revision: "post-r1",
      bytes: new TextEncoder().encode("{}"),
    };

    expect(cache).toBeInstanceOf(LRUCache);
    cache.set("source", source);
    expect(cache.get("source")).toBe(source);
    cache.set("oversized", { ...source, bytes: new Uint8Array(3) });
    expect(cache.has("oversized")).toBe(false);
  });

  test("supports loader-defined formats", async () => {
    const cache = {
      get: vi.fn(async () => undefined),
      set: vi.fn(async () => undefined),
    };
    const load = vi.fn(async () => ({
      format: "json" as const,
      revision: "post-r1",
      source: "{}",
    }));
    const cachedLoad = createCachedDocumentSourceLoader({ cache, load });

    await expect(
      cachedLoad(
        {
          id: "post",
          revision: "post-r1",
          contentRef: "content:post",
        },
        {}
      )
    ).resolves.toMatchObject({ format: "json", revision: "post-r1" });
    expect(load).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledOnce();
  });

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
        format: "json",
      })
    );
    expect(load).not.toHaveBeenCalled();
    await expect(parseDocumentSource(result)).resolves.toEqual({
      format: "json",
      value: { title: "Cached" },
    });
  });

  test("reuses cached MDX sources", async () => {
    const cached: CachedDocumentSource = {
      format: "mdx",
      revision: "post-r1",
      bytes: new TextEncoder().encode("# Cached"),
    };
    const load = vi.fn(async () => {
      throw new Error("source loader must not run");
    });
    const result = await createCachedDocumentSourceLoader({
      cache: {
        get: async () => cached,
        set: async () => undefined,
      },
      load,
    })(
      {
        id: "post",
        revision: "post-r1",
        contentRef: "content:post",
        format: "mdx",
      },
      {}
    );

    expect(result.format).toBe("mdx");
    expect(load).not.toHaveBeenCalled();
    await expect(parseDocumentSource(result)).resolves.toMatchObject({
      format: "mdx",
    });
  });

  test("does not reuse a cached source with a different format", async () => {
    const load = vi.fn(async () => ({
      format: "json" as const,
      revision: "post-r1",
      source: "{}",
    }));
    const cache = {
      get: vi.fn(async () => ({
        format: "markdown" as const,
        revision: "post-r1",
        bytes: new TextEncoder().encode("# stale"),
      })),
      set: vi.fn(async () => undefined),
    };

    const result = await createCachedDocumentSourceLoader({ cache, load })(
      node,
      {}
    );

    expect(load).toHaveBeenCalledOnce();
    await expect(parseDocumentSource(result)).resolves.toEqual({
      format: "json",
      value: {},
    });
  });

  test("does not reuse a cached source above the active byte limit", async () => {
    const load = vi.fn(async () => ({
      format: "json" as const,
      revision: "post-r1",
      source: "{}",
    }));
    const cache = {
      get: vi.fn(async () => ({
        format: "json" as const,
        revision: "post-r1",
        bytes: new TextEncoder().encode("{}\n"),
      })),
      set: vi.fn(async () => undefined),
    };

    const result = await createCachedDocumentSourceLoader({
      cache,
      load,
      maximumBytes: 2,
    })(node, {});

    expect(load).toHaveBeenCalledOnce();
    expect(cache.set).toHaveBeenCalledOnce();
    await expect(parseDocumentSource(result)).resolves.toEqual({
      format: "json",
      value: {},
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

  test("reports cache hits, misses, and stores", async () => {
    const events: unknown[] = [];
    const cached: CachedDocumentSource = {
      format: "json",
      revision: "post-r1",
      bytes: new TextEncoder().encode("{}"),
    };
    const load = vi.fn(async () => ({
      format: "json" as const,
      revision: "post-r1",
      source: "{}",
    }));
    const cache = {
      get: vi.fn().mockResolvedValueOnce(undefined).mockResolvedValue(cached),
      set: vi.fn(async () => undefined),
    };
    const cachedLoad = createCachedDocumentSourceLoader({
      cache,
      load,
      onEvent: (event) => events.push(event),
    });

    await cachedLoad(node, {});
    await cachedLoad(node, {});

    expect(events).toEqual([
      { type: "document-cache-miss", documentId: "post", revision: "post-r1" },
      {
        type: "document-cache-stored",
        documentId: "post",
        revision: "post-r1",
      },
      { type: "document-cache-hit", documentId: "post", revision: "post-r1" },
    ]);
  });
});
