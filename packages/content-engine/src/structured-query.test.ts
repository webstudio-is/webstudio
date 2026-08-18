import { describe, expect, test, vi } from "vitest";
import {
  assetQuery,
  type AssetFileDocument,
  type BuilderAssetFieldCatalog,
} from "./schema";
import {
  executeAssetQuery,
  executeAssetQueries,
  getAssetQueryFieldValue,
  validateAssetQueryAgainstCatalog,
} from "./structured-query";
import { contentEngineLimits } from "./limits";

const document = ({
  id,
  properties,
  description,
  excerpt,
  createdAt,
}: {
  id: string;
  properties: AssetFileDocument["properties"];
  description?: string;
  excerpt?: string;
  createdAt?: string;
}): AssetFileDocument => ({
  _id: id,
  _type: "asset.file",
  name: `${id}.md`,
  description,
  path: `blog/${id}.md`,
  key: `key-${id}`,
  extension: "md",
  mimeType: "text/markdown",
  size: 20,
  createdAt,
  revision: `revision-${id}`,
  contentRef: `files/${id}.md`,
  properties,
  excerpt,
});

const documents = [
  document({
    id: "alpha",
    description: "Alpha description",
    createdAt: "2026-07-27T00:00:00.000Z",
    excerpt: "Alpha excerpt",
    properties: {
      title: "Alpha",
      publishedAt: "2025-01-01",
      draft: false,
      tags: ["news", "alpha"],
    },
  }),
  document({
    id: "beta",
    properties: {
      title: "Beta",
      publishedAt: "2024-01-01",
      draft: true,
      tags: ["private"],
    },
  }),
  document({
    id: "gamma",
    properties: {
      title: "Gamma",
      publishedAt: "2026-01-01",
      tags: ["news"],
    },
  }),
];

const catalog: BuilderAssetFieldCatalog = {
  format: "webstudio-builder-asset-field-catalog",
  version: 1,
  canonicalRevision: `sha256:${"0".repeat(64)}`,
  documentCount: documents.length,
  fields: {
    "properties.title": { types: ["string"], occurrences: 3 },
    "properties.publishedAt": { types: ["string"], occurrences: 3 },
    "properties.draft": {
      types: ["boolean"],
      occurrences: 2,
      optional: true,
    },
    "properties.tags": { types: ["array"], occurrences: 3 },
  },
};

const runtimeAssets = Object.fromEntries(
  documents.map(({ _id }) => [_id, { url: `/assets/${_id}` }])
);

describe("structured asset query", () => {
  test("returns direct items for single-result modes", async () => {
    const empty = await executeAssetQuery({
      documents,
      query: {
        result: "one",
        where: {
          all: [
            {
              field: ["properties", "title"],
              operator: "eq",
              value: "Missing",
            },
          ],
        },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
      },
    });
    const one = await executeAssetQuery({
      documents,
      query: {
        result: "one",
        where: {
          all: [
            {
              field: ["properties", "title"],
              operator: "eq",
              value: "Alpha",
            },
          ],
        },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
      },
    });

    expect(empty).toEqual({ item: null, totalCount: 0 });
    expect(one).toEqual({
      item: { id: "alpha", properties: { title: "Alpha" } },
      totalCount: 1,
    });
  });

  test("rejects ambiguous exactly-one results before pagination", async () => {
    await expect(
      executeAssetQuery({
        documents,
        query: {
          result: "one",
          where: { all: [] },
          limit: 1,
          offset: 2,
        },
        runtimeAssets,
      })
    ).rejects.toMatchObject({
      code: "MULTIPLE_RESULTS",
      matchedCount: 3,
    });
  });

  test("returns deterministic first and last results", async () => {
    const tied = [
      document({ id: "charlie", properties: { order: 1 } }),
      document({ id: "alpha", properties: { order: 1 } }),
      document({ id: "bravo", properties: { order: 1 } }),
    ];
    const query = {
      where: { all: [] as never[] },
      sort: [
        {
          field: ["properties", "order"],
          direction: "asc" as const,
        },
      ],
      output: {
        mode: "fields" as const,
        includeMetadata: false,
        fields: [["properties", "order"]],
      },
    };

    await expect(
      executeAssetQuery({
        documents: tied,
        query: { ...query, result: "first" },
      })
    ).resolves.toEqual({
      item: { id: "alpha", properties: { order: 1 } },
      totalCount: 3,
    });
    await expect(
      executeAssetQuery({
        documents: tied,
        query: { ...query, result: "last" },
      })
    ).resolves.toEqual({
      item: { id: "charlie", properties: { order: 1 } },
      totalCount: 3,
    });
  });

  test("requires sorting for first and last results", async () => {
    for (const result of ["first", "last"] as const) {
      await expect(
        executeAssetQuery({
          documents,
          query: { result, sort: [] },
          runtimeAssets,
        })
      ).rejects.toThrow("Add sorting to define which item is first.");
    }
  });

  test("hydrates only the selected single Markdown result", async () => {
    const body = new TextEncoder().encode("# Body\n");
    const read = vi.fn(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield body;
        },
      },
      contentLength: body.byteLength,
    }));
    const result = await executeAssetQuery({
      documents: documents.map((item) => ({ ...item, size: body.byteLength })),
      query: {
        result: "first",
        sort: [{ field: ["properties", "publishedAt"], direction: "desc" }],
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
        content: { mode: "markdown-body-ref" },
      },
      read,
    });

    expect(result).toMatchObject({
      item: {
        id: "gamma",
        content: { text: "# Body\n" },
      },
      totalCount: 3,
    });
    expect(read).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledWith("files/gamma.md", {
      offset: 0,
      length: body.byteLength,
    });
  });

  test("executes sibling queries in one scan with independent windows and counts", async () => {
    const readCommon = vi.fn(() => "blog");
    const candidates = [
      document({
        id: "tools-newest",
        properties: {
          category: "Tools",
          publishedAt: "2026-04-03",
        },
      }),
      document({
        id: "tools-middle",
        properties: {
          category: "Tools",
          publishedAt: "2026-04-02",
        },
      }),
      document({
        id: "tools-oldest",
        properties: {
          category: "Tools",
          publishedAt: "2026-04-01",
        },
      }),
      document({
        id: "strategy",
        properties: {
          category: "Strategy",
          publishedAt: "2026-04-04",
        },
      }),
    ];
    for (const candidate of candidates) {
      Object.defineProperty(candidate.properties, "common", {
        configurable: true,
        enumerable: true,
        get: readCommon,
      });
    }
    const requests = [
      { category: "Tools", offset: 1 },
      { category: "Strategy", offset: 0 },
    ];

    const results = await executeAssetQueries({
      documents: candidates,
      queries: requests.map(({ category, offset }) => ({
        where: {
          all: [
            {
              field: ["properties", "common"],
              operator: "eq",
              value: "blog",
            },
            {
              field: ["properties", "category"],
              operator: "eq",
              value: category,
            },
          ],
        },
        sort: [
          {
            field: ["properties", "publishedAt"],
            direction: "desc",
          },
        ],
        limit: 1,
        offset,
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["id"]],
        },
        content: { mode: "none" },
      })),
    });

    expect(results).toEqual([
      {
        status: "fulfilled",
        value: {
          items: [{ id: "tools-middle" }],
          totalCount: 3,
          hasMore: true,
        },
      },
      {
        status: "fulfilled",
        value: {
          items: [{ id: "strategy" }],
          totalCount: 1,
          hasMore: false,
        },
      },
    ]);
    expect(readCommon).toHaveBeenCalledTimes(candidates.length);
  });

  test("isolates failures between batched queries", async () => {
    const [failed, succeeded] = await executeAssetQueries({
      documents: [document({ id: "post", properties: {} })],
      queries: [
        {
          where: { all: [] },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["url"]],
          },
          content: { mode: "none" },
        },
        {
          where: { all: [] },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "none" },
        },
      ],
    });

    expect(failed.status).toBe("rejected");
    expect(succeeded).toEqual({
      status: "fulfilled",
      value: {
        items: [{ id: "post" }],
        totalCount: 1,
        hasMore: false,
      },
    });
  });

  test("filters, sorts, and projects resolved structured asset values", async () => {
    const result = await executeAssetQuery({
      documents: [
        document({
          id: "alpha",
          properties: { featureImage: "./alpha.png" },
        }),
        document({
          id: "beta",
          properties: { featureImage: "./beta.png" },
        }),
      ],
      assetValueReferences: {
        alpha: [
          {
            path: ["properties", "featureImage"],
            assetId: "alpha-image",
          },
        ],
        beta: [
          {
            path: ["properties", "featureImage"],
            assetId: "beta-image",
          },
        ],
      },
      runtimeAssets: {
        "alpha-image": { url: "/cgi/image/z-alpha.png?format=raw" },
        "beta-image": { url: "/cgi/image/a-beta.png?format=raw" },
      },
      query: {
        where: {
          all: [
            {
              field: ["properties", "featureImage"],
              operator: "startsWith",
              value: "/cgi/image/",
            },
          ],
        },
        sort: [
          {
            field: ["properties", "featureImage"],
            direction: "asc",
          },
        ],
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["properties", "featureImage"]],
        },
        content: { mode: "none" },
      },
    });

    expect(result.items).toEqual([
      {
        id: "beta",
        properties: {
          featureImage: "/cgi/image/a-beta.png?format=raw",
        },
      },
      {
        id: "alpha",
        properties: {
          featureImage: "/cgi/image/z-alpha.png?format=raw",
        },
      },
    ]);
  });

  test("expands selected asset reference metadata without changing legacy queries", async () => {
    const legacyPost = document({
      id: "post",
      properties: { title: "Post", featureImage: "./hero.png" },
    });
    const runtimeAssets = {
      hero: {
        url: "/cgi/image/hero.png?format=raw",
        name: "hero.png",
        description: "A person presenting Webstudio",
        mimeType: "image/png",
        size: 1024,
        meta: { width: 1600, height: 900 },
        width: 1600,
        height: 900,
      },
    };

    await expect(
      executeAssetQuery({
        documents: [legacyPost],
        assetValueReferences: {
          post: [
            {
              path: ["properties", "featureImage"],
              assetId: "hero",
            },
          ],
        },
        runtimeAssets,
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["properties", "featureImage"]],
          },
        },
      })
    ).resolves.toMatchObject({
      items: [
        {
          properties: {
            featureImage: "/cgi/image/hero.png?format=raw",
          },
        },
      ],
    });

    const structuredPost = document({
      id: "post",
      properties: {
        title: "Post",
        featureImage: { $ref: "./hero.png" },
      },
    });
    await expect(
      executeAssetQuery({
        documents: [structuredPost],
        assetValueReferences: {
          post: [
            {
              path: ["properties", "featureImage"],
              assetId: "hero",
              structured: true,
            },
          ],
        },
        runtimeAssets,
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [
              ["properties", "featureImage", "src"],
              ["properties", "featureImage", "description"],
              ["properties", "featureImage", "size"],
            ],
          },
        },
      })
    ).resolves.toEqual({
      items: [
        {
          id: "post",
          properties: {
            featureImage: {
              src: "/cgi/image/hero.png?format=raw",
              description: "A person presenting Webstudio",
              size: 1024,
            },
          },
        },
      ],
      totalCount: 1,
      hasMore: false,
    });
  });

  test("counts expanded metadata toward the result byte limit", async () => {
    await expect(
      executeAssetQuery({
        documents: [
          document({
            id: "post",
            properties: { featureImage: { $ref: "./hero.png" } },
          }),
        ],
        assetValueReferences: {
          post: [
            {
              path: ["properties", "featureImage"],
              assetId: "hero",
              structured: true,
            },
          ],
        },
        runtimeAssets: {
          hero: {
            url: "/hero.png",
            description: "x".repeat(contentEngineLimits.resultBytes),
          },
        },
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [
              ["properties", "featureImage", "src"],
              ["properties", "featureImage", "description"],
            ],
          },
        },
      })
    ).rejects.toThrow("Asset query result exceeds the byte limit");
  });

  test("projects selected metadata from asset references nested in arrays", async () => {
    await expect(
      executeAssetQuery({
        documents: [
          document({
            id: "post",
            properties: {
              showcase: {
                images: [
                  { src: { $ref: "./one.png" } },
                  { src: { $ref: "./two.png" } },
                ],
              },
            },
          }),
        ],
        assetValueReferences: {
          post: [
            {
              path: ["properties", "showcase", "images", 0, "src"],
              assetId: "one",
              structured: true,
            },
            {
              path: ["properties", "showcase", "images", 1, "src"],
              assetId: "two",
              structured: true,
            },
          ],
        },
        runtimeAssets: {
          one: { url: "/one.png", description: "First image" },
          two: { url: "/two.png", description: "Second image" },
        },
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [
              ["properties", "showcase", "images", "*", "src", "src"],
              ["properties", "showcase", "images", "*", "src", "description"],
            ],
          },
        },
      })
    ).resolves.toMatchObject({
      items: [
        {
          properties: {
            showcase: {
              images: [
                { src: { src: "/one.png", description: "First image" } },
                { src: { src: "/two.png", description: "Second image" } },
              ],
            },
          },
        },
      ],
    });
  });

  test("accepts only referenced Markdown body queries", () => {
    expect(
      assetQuery.safeParse({ content: { mode: "markdown-body-ref" } }).success
    ).toBe(true);
    expect(
      assetQuery.safeParse({ content: { mode: "markdown-body" } }).success
    ).toBe(false);
  });

  test("combines nested all and any filter groups", async () => {
    const result = await executeAssetQuery({
      catalog,
      documents,
      query: {
        where: {
          all: [
            {
              field: ["properties", "draft"],
              operator: "ne",
              value: true,
            },
            {
              any: [
                {
                  field: ["properties", "title"],
                  operator: "eq",
                  value: "Alpha",
                },
                {
                  field: ["properties", "publishedAt"],
                  operator: "eq",
                  value: "2026-01-01",
                },
              ],
            },
          ],
        },
      },
      runtimeAssets: {
        alpha: { url: "/assets/alpha.png", width: 1200, height: 800 },
        gamma: { url: "/assets/gamma.md" },
      },
    });

    expect(result.items).toEqual([
      {
        id: "alpha",
        url: "/assets/alpha.png",
        width: 1200,
        height: 800,
      },
      { id: "gamma", url: "/assets/gamma.md" },
    ]);
  });

  test("filters and sorts by target-specific runtime fields", async () => {
    const result = await executeAssetQuery({
      catalog,
      documents,
      runtimeAssets: {
        alpha: { url: "/assets/alpha", width: 1200, height: 800 },
        beta: { url: "/assets/beta", width: 640, height: 480 },
        gamma: { url: "/assets/gamma" },
      },
      query: {
        where: {
          all: [{ field: ["width"], operator: "gte", value: 600 }],
        },
        sort: [{ field: ["width"], direction: "asc" }],
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["id"], ["width"]],
        },
        content: { mode: "none" },
      },
    });

    expect(result.items).toEqual([
      { id: "beta", width: 640 },
      { id: "alpha", width: 1200 },
    ]);
  });

  test("reads only own JSON properties from dynamic field paths", () => {
    const inheritedNames = document({ id: "plain", properties: {} });
    expect(
      getAssetQueryFieldValue(inheritedNames, ["properties", "constructor"])
    ).toBeUndefined();
    expect(
      getAssetQueryFieldValue(inheritedNames, ["properties", "toString"])
    ).toBeUndefined();

    const ownNames = document({
      id: "own",
      properties: JSON.parse(
        '{"constructor":"constructor value","toString":"string value","__proto__":"prototype value"}'
      ),
    });
    expect(
      getAssetQueryFieldValue(ownNames, ["properties", "constructor"])
    ).toBe("constructor value");
    expect(getAssetQueryFieldValue(ownNames, ["properties", "toString"])).toBe(
      "string value"
    );
    expect(getAssetQueryFieldValue(ownNames, ["properties", "__proto__"])).toBe(
      "prototype value"
    );

    expect(
      validateAssetQueryAgainstCatalog({
        catalog,
        query: {
          where: {
            all: [
              {
                field: ["properties", "constructor"],
                operator: "eq",
                value: "missing",
              },
            ],
          },
        },
      }).warnings
    ).toEqual(["Asset field properties.constructor is not currently observed"]);
  });

  test("treats dynamic fields absent from the current catalog as missing", async () => {
    const query = {
      where: {
        all: [
          {
            field: ["properties", "missing"] as [string, string],
            operator: "eq" as const,
            value: true,
          },
        ],
      },
      content: { mode: "none" as const },
    };
    expect(
      validateAssetQueryAgainstCatalog({ catalog, query }).warnings
    ).toEqual(["Asset field properties.missing is not currently observed"]);
    const result = await executeAssetQuery({
      catalog,
      documents,
      query,
    });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  test("keeps sorting deterministic when a dynamic field becomes mixed", async () => {
    const mixedDocuments = [
      ...documents,
      document({ id: "delta", properties: { publishedAt: { year: 2027 } } }),
    ];
    const result = await executeAssetQuery({
      catalog: {
        ...catalog,
        documentCount: mixedDocuments.length,
        fields: {
          ...catalog.fields,
          "properties.publishedAt": {
            types: ["object", "string"],
            occurrences: mixedDocuments.length,
            mixed: true,
          },
        },
      },
      documents: mixedDocuments,
      runtimeAssets: {
        ...runtimeAssets,
        delta: { url: "/assets/delta" },
      },
      query: {
        sort: [{ field: ["properties", "publishedAt"], direction: "asc" }],
        content: { mode: "none" },
      },
    });

    expect(result.items.map(({ id }) => id)).toEqual([
      "beta",
      "alpha",
      "gamma",
      "delta",
    ]);
  });

  test("filters dynamic fields, sorts, paginates, and returns public records", async () => {
    const result = await executeAssetQuery({
      catalog,
      documents,
      runtimeAssets,
      query: {
        where: {
          all: [
            {
              field: ["properties", "draft"],
              operator: "ne",
              value: true,
            },
            {
              field: ["properties", "tags"],
              operator: "contains",
              value: "news",
            },
          ],
        },
        sort: [
          {
            field: ["properties", "publishedAt"],
            direction: "desc",
          },
        ],
        limit: 1,
        offset: 0,
        output: { mode: "all", includeMetadata: true },
        content: { mode: "none" },
      },
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: "gamma",
          path: "blog/gamma.md",
          properties: expect.objectContaining({ title: "Gamma" }),
        }),
      ],
      totalCount: 2,
      hasMore: true,
    });
    expect(result.items[0]).not.toHaveProperty("contentRef");
    expect(result.items[0]).not.toHaveProperty("_id");
  });

  test("hydrates only selected Markdown content without exposing storage identity", async () => {
    const bytes = new TextEncoder().encode(
      "---\ntitle: Alpha\n---\n# Alpha body\n"
    );
    const result = await executeAssetQuery({
      catalog,
      documents: [{ ...documents[0], size: bytes.byteLength }],
      runtimeAssets,
      query: {
        where: { all: [{ field: ["id"], operator: "eq", value: "alpha" }] },
        sort: [],
        limit: 1,
        offset: 0,
        content: { mode: "markdown-body-ref" },
      },
      read: async () => ({
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
        contentLength: bytes.byteLength,
      }),
    });

    expect(result.items[0].content).toEqual({
      encoding: "utf-8",
      text: "# Alpha body\n",
    });
    expect(result.items[0].content).not.toHaveProperty("contentRef");
  });

  test("excludes non-Markdown files from Markdown body queries", async () => {
    const markdown = new TextEncoder().encode("# Alpha body\n");
    const image = {
      ...documents[0],
      _id: "social-image",
      name: "social.png",
      path: "blog/social.png",
      key: "social-image",
      extension: "png",
      mimeType: "image/png",
      size: 100,
      revision: "social-image-revision",
      contentRef: "files/social.png",
    };
    const read = vi.fn(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield markdown;
        },
      },
      contentLength: markdown.byteLength,
    }));

    const result = await executeAssetQuery({
      documents: [{ ...documents[0], size: markdown.byteLength }, image],
      query: {
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["id"]],
        },
        content: { mode: "markdown-body-ref" },
      },
      read,
    });

    expect(result).toMatchObject({
      items: [
        {
          id: "alpha",
          content: { encoding: "utf-8", text: "# Alpha body\n" },
        },
      ],
      totalCount: 1,
      hasMore: false,
    });
    expect(read).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledWith("files/alpha.md", {
      offset: 0,
      length: markdown.byteLength,
    });
  });

  test("projects explicit output fields while retaining base file metadata", async () => {
    const selected = await executeAssetQuery({
      catalog,
      documents,
      runtimeAssets,
      query: {
        where: { all: [] },
        sort: [],
        limit: 1,
        offset: 0,
        output: {
          mode: "fields",
          includeMetadata: true,
          fields: [["properties", "title"], ["excerpt"]],
        },
        content: { mode: "none" },
      },
    });
    expect(selected.items[0]).toMatchObject({
      id: "alpha",
      name: "alpha.md",
      description: "Alpha description",
      properties: { title: "Alpha" },
      excerpt: "Alpha excerpt",
    });
    expect(selected.items[0]).not.toHaveProperty("url");
    expect(selected.items[0]).not.toHaveProperty("width");
    expect(selected.items[0]).not.toHaveProperty("height");
    expect(selected.items[0].properties).not.toHaveProperty("draft");

    const base = await executeAssetQuery({
      catalog,
      documents,
      runtimeAssets,
      query: {
        where: { all: [] },
        sort: [],
        limit: 1,
        offset: 0,
        output: { mode: "base", includeMetadata: true },
        content: { mode: "none" },
      },
    });
    expect(base.items[0]).toMatchObject({
      id: "alpha",
      name: "alpha.md",
    });
    expect(base.items[0]).not.toHaveProperty("properties");
    expect(base.items[0]).not.toHaveProperty("excerpt");

    const withoutMetadata = await executeAssetQuery({
      catalog,
      documents,
      query: {
        where: { all: [] },
        sort: [],
        limit: 1,
        offset: 0,
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["name"], ["properties", "title"]],
        },
        content: { mode: "none" },
      },
    });
    expect(withoutMetadata.items[0]).toEqual({
      id: "alpha",
      name: "alpha.md",
      properties: { title: "Alpha" },
    });
  });

  test("omits empty properties from query results", async () => {
    const empty = document({ id: "empty", properties: {} });
    const withExcerpt = document({
      id: "excerpt",
      properties: {},
      excerpt: "Excerpt",
    });
    const result = await executeAssetQuery({
      catalog,
      documents: [empty, withExcerpt],
      runtimeAssets: {
        empty: { url: "/assets/empty" },
        excerpt: { url: "/assets/excerpt" },
      },
      query: {
        where: { all: [] },
        sort: [],
        limit: 1,
        offset: 0,
        output: { mode: "all", includeMetadata: false },
        content: { mode: "none" },
      },
    });

    expect(result).toMatchObject({
      items: [{ id: "excerpt", excerpt: "Excerpt" }],
      totalCount: 1,
      hasMore: false,
    });
  });

  test("retains files when file content is the only available output", async () => {
    const bytes = new TextEncoder().encode("Body");
    const result = await executeAssetQuery({
      catalog,
      documents: [
        { ...document({ id: "content", properties: {} }), size: bytes.length },
      ],
      runtimeAssets: { content: { url: "/assets/content" } },
      query: {
        where: { all: [] },
        sort: [],
        limit: 1,
        offset: 0,
        output: { mode: "all", includeMetadata: false },
        content: { mode: "markdown-body-ref" },
      },
      read: async () => ({
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
        contentLength: bytes.length,
      }),
    });

    expect(result).toMatchObject({
      items: [{ id: "content", content: { encoding: "utf-8", text: "Body" } }],
      totalCount: 1,
    });
  });

  test("rejects a query without any output", async () => {
    await expect(
      executeAssetQuery({
        catalog,
        documents,
        query: {
          where: { all: [] },
          sort: [],
          limit: 1,
          offset: 0,
          output: { mode: "base", includeMetadata: false },
          content: { mode: "none" },
        },
      })
    ).rejects.toThrow("Select at least one asset query output");
  });

  test("supports lexical date ranges and missing-field checks", async () => {
    const result = await executeAssetQuery({
      catalog,
      documents,
      runtimeAssets,
      query: {
        where: {
          all: [
            {
              field: ["properties", "publishedAt"],
              operator: "gte",
              value: "2025-01-01",
            },
            {
              field: ["properties", "draft"],
              operator: "exists",
              value: false,
            },
          ],
        },
        sort: [],
        limit: 100,
        offset: 0,
        content: { mode: "none" },
      },
    });

    expect(result.items.map(({ id }) => id)).toEqual(["gamma"]);
  });

  test("requires target-specific URL data when URL is selected", async () => {
    await expect(
      executeAssetQuery({
        catalog,
        documents: [documents[0]],
        query: { content: { mode: "none" } },
      })
    ).rejects.toThrow("Asset URL is unavailable for alpha");
  });
});
