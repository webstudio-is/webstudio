import { describe, expect, test, vi } from "vitest";
import { createCanonicalAssetFileEntry } from "./canonical";
import { prepareCanonicalContentMetadata } from "./document-metadata";

const createEntry = ({
  revision = "revision-1",
  properties = {},
  excerpt,
  prepared = false,
}: {
  revision?: string;
  properties?: Record<string, string>;
  excerpt?: string;
  prepared?: boolean;
} = {}) =>
  createCanonicalAssetFileEntry({
    projectId: "project",
    metadataRequirements: {
      structuredProperties: prepared,
      excerpt: prepared,
    },
    document: {
      _id: "post",
      _type: "asset.file",
      name: "post.md",
      path: "blog/post.md",
      key: "post",
      extension: "md",
      mimeType: "text/markdown",
      size: 44,
      revision,
      contentRef: "post.md",
      properties,
      ...(excerpt === undefined ? {} : { excerpt }),
    },
  });

describe("content metadata cache", () => {
  test("reuses a matching prepared entry without reading source bytes", async () => {
    const cached = createEntry({
      properties: { title: "Cached" },
      excerpt: "Cached excerpt",
      prepared: true,
    });
    const readBytes = vi.fn();
    const set = vi.fn();

    await expect(
      prepareCanonicalContentMetadata({
        base: createEntry(),
        requirements: { structuredProperties: true, excerpt: true },
        cache: { get: async () => cached, set },
        readBytes,
      })
    ).resolves.toMatchObject({
      document: {
        properties: { title: "Cached" },
        excerpt: "Cached excerpt",
      },
    });
    expect(readBytes).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledOnce();
  });

  test("ignores a cache entry from another source revision", async () => {
    const set = vi.fn();
    const source = "---\ntitle: Current\n---\nCurrent excerpt";

    await expect(
      prepareCanonicalContentMetadata({
        base: createEntry(),
        requirements: { structuredProperties: true, excerpt: true },
        cache: {
          get: async () =>
            createEntry({
              revision: "stale",
              properties: { title: "Stale" },
              prepared: true,
            }),
          set,
        },
        readBytes: async () => new TextEncoder().encode(source),
      })
    ).resolves.toMatchObject({
      document: {
        properties: { title: "Current" },
        excerpt: "Current excerpt",
      },
    });
    expect(set).toHaveBeenCalledOnce();
  });

  test("works without a persistence cache", async () => {
    await expect(
      prepareCanonicalContentMetadata({
        base: createEntry(),
        requirements: { structuredProperties: true, excerpt: false },
        readBytes: async () =>
          new TextEncoder().encode("---\ntitle: Local\n---\nBody"),
      })
    ).resolves.toMatchObject({
      document: { properties: { title: "Local" } },
    });
  });
});
