import { describe, expect, test, vi } from "vitest";
import { createCanonicalAssetFileEntry } from "./canonical";
import { prepareCanonicalContentMetadata } from "./document-metadata";

const createEntry = ({
  revision = "revision-1",
  properties = {},
  excerpt,
  prepared = false,
  format = "markdown",
  size = 44,
}: {
  revision?: string;
  properties?: Record<string, string>;
  excerpt?: string;
  prepared?: boolean;
  format?: "markdown" | "mdx";
  size?: number;
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
      name: `post.${format === "markdown" ? "md" : "mdx"}`,
      path: `blog/post.${format === "markdown" ? "md" : "mdx"}`,
      key: "post",
      extension: format === "markdown" ? "md" : "mdx",
      mimeType: format === "markdown" ? "text/markdown" : "text/mdx",
      size,
      revision,
      contentRef: `post.${format === "markdown" ? "md" : "mdx"}`,
      properties,
      ...(excerpt === undefined ? {} : { excerpt }),
    },
  });

describe("content metadata cache", () => {
  test("indexes MDX frontmatter without generating a Markdown excerpt", async () => {
    const bytes = new TextEncoder().encode(
      "---\ntitle: MDX post\n---\n<ws.element>Body</ws.element>"
    );
    const readBytes = vi.fn(async () => bytes);

    const prepared = await prepareCanonicalContentMetadata({
      base: createEntry({ format: "mdx", size: bytes.byteLength }),
      requirements: { structuredProperties: true, excerpt: true },
      readBytes,
    });

    expect(prepared.document.properties).toEqual({ title: "MDX post" });
    expect(prepared.document).not.toHaveProperty("excerpt");
    expect(readBytes).toHaveBeenCalledWith(bytes.byteLength);
  });

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

  test("does not retain derived fields from an invalidated cache tier", async () => {
    const stale = createEntry({
      properties: { title: "Stale" },
      excerpt: "Stale excerpt",
    });
    stale.document.metadataError = {
      code: "STALE_ERROR",
      message: "Stale error",
    };

    const prepared = await prepareCanonicalContentMetadata({
      base: createEntry(),
      requirements: { structuredProperties: true, excerpt: true },
      cache: { get: async () => stale, set: vi.fn() },
      readBytes: async () =>
        new TextEncoder().encode("---\ntitle: One\ntitle: Two\n---"),
    });

    expect(prepared.document.properties).toEqual({});
    expect(prepared.document).not.toHaveProperty("excerpt");
    expect(prepared.document.metadataError).toMatchObject({
      code: "FRONTMATTER_INVALID",
      line: 3,
      column: 1,
    });
  });

  test("removes stale excerpts from non-Markdown cache entries", async () => {
    const markdown = createEntry({
      excerpt: "Stale description",
      prepared: true,
    });
    const binaryDocument = {
      ...markdown.document,
      name: "image.png",
      path: "image.png",
      extension: "png",
      mimeType: "image/png",
    };
    const cached = createCanonicalAssetFileEntry({
      projectId: markdown.projectId,
      metadataRequirements: {
        structuredProperties: true,
        excerpt: true,
      },
      document: binaryDocument,
    });
    const { excerpt: _excerpt, ...baseDocument } = binaryDocument;
    const readBytes = vi.fn();

    const prepared = await prepareCanonicalContentMetadata({
      base: createCanonicalAssetFileEntry({
        projectId: markdown.projectId,
        metadataRequirements: {
          structuredProperties: false,
          excerpt: false,
        },
        document: baseDocument,
      }),
      requirements: { structuredProperties: true, excerpt: true },
      cache: { get: async () => cached, set: vi.fn() },
      readBytes,
    });

    expect(prepared.document).not.toHaveProperty("excerpt");
    expect(readBytes).not.toHaveBeenCalled();
  });

  test("works without a persistence cache", async () => {
    const readBytes = vi.fn(async () =>
      new TextEncoder().encode("---\ntitle: Local\n---\nBody")
    );
    await expect(
      prepareCanonicalContentMetadata({
        base: createCanonicalAssetFileEntry({
          ...createEntry(),
          document: { ...createEntry().document, size: 1024 * 1024 },
        }),
        requirements: { structuredProperties: true, excerpt: false },
        readBytes,
      })
    ).resolves.toMatchObject({
      document: { properties: { title: "Local" } },
    });
    expect(readBytes).toHaveBeenCalledWith(64 * 1024 + 13);
  });

  test("retains the full Markdown budget when an excerpt is required", async () => {
    const readBytes = vi.fn(async () =>
      new TextEncoder().encode("---\ntitle: Local\n---\nBody")
    );

    await prepareCanonicalContentMetadata({
      base: createCanonicalAssetFileEntry({
        ...createEntry(),
        document: { ...createEntry().document, size: 2 * 1024 * 1024 },
      }),
      requirements: { structuredProperties: false, excerpt: true },
      readBytes,
    });

    expect(readBytes).toHaveBeenCalledWith(1024 * 1024);
  });

  test("ignores an incomplete UTF-8 code point at the excerpt prefix boundary", async () => {
    const prefix = new TextEncoder().encode("Body ");
    const truncated = new Uint8Array(prefix.byteLength + 1);
    truncated.set(prefix);
    truncated[prefix.byteLength] = 0xe2;

    await expect(
      prepareCanonicalContentMetadata({
        base: createCanonicalAssetFileEntry({
          ...createEntry(),
          document: {
            ...createEntry().document,
            size: 2 * 1024 * 1024,
          },
        }),
        requirements: { structuredProperties: false, excerpt: true },
        readBytes: async () => truncated,
      })
    ).resolves.toMatchObject({
      document: { excerpt: "Body" },
    });
  });

  test("reports malformed UTF-8 inside an excerpt prefix", async () => {
    const malformed = Uint8Array.from([0x42, 0xff, 0x64]);

    await expect(
      prepareCanonicalContentMetadata({
        base: createCanonicalAssetFileEntry({
          ...createEntry(),
          document: {
            ...createEntry().document,
            size: 2 * 1024 * 1024,
          },
        }),
        requirements: { structuredProperties: false, excerpt: true },
        readBytes: async () => malformed,
      })
    ).resolves.toMatchObject({
      document: {
        metadataError: { code: "MARKDOWN_BODY_DECODING_FAILED" },
      },
    });
  });
});
