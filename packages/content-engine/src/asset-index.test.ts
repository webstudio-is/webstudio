import { describe, expect, test } from "vitest";
import { contentEngineLimits, parseContentDatabaseMaxBytes } from "./limits";
import { createCanonicalAssetFileEntry } from "./canonical";
import { createContentDatabase } from "./content-database";
import {
  assetQuery,
  assetQueryResult,
  type AssetResourceOutputSelection,
} from "./schema";
import {
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
} from "./compilation-plan";
import { compileContentArtifact, createAssetIndex } from "./asset-index";
import {
  getContentArtifactReferencedAssetIds,
  getContentArtifactRuntimeAssetIds,
  serializeContentArtifact,
  verifyContentArtifact,
} from "./content-artifact";
import { createDocumentGraph } from "./document-graph";

const entry = ({
  projectId = "project",
  id,
}: {
  projectId?: string;
  id: string;
}) =>
  createCanonicalAssetFileEntry({
    projectId,
    document: {
      _id: id,
      _type: "asset.file",
      name: `${id}.md`,
      path: `blog/${id}.md`,
      key: id,
      extension: "md",
      mimeType: "text/markdown",
      size: 20,
      revision: `revision-${id}`,
      contentRef: `files/${id}.md`,
      properties: { title: id, nested: { published: true } },
      excerpt: `${id} excerpt`,
    },
  });

describe("shared asset index", () => {
  test("selects runtime assets from documents and Markdown references", () => {
    const artifact = {
      documents: [{ _id: "document" }, { _id: "shared" }],
      assetReferences: {
        "post.md": [
          { start: 0, end: 1, assetId: "reference" },
          { start: 2, end: 3, assetId: "shared" },
        ],
      },
    };

    expect(getContentArtifactReferencedAssetIds(artifact)).toEqual([
      "reference",
      "shared",
    ]);
    expect(
      getContentArtifactRuntimeAssetIds({
        artifact,
        includeDocuments: true,
      })
    ).toEqual(["document", "reference", "shared"]);
  });

  test("stores only fields required by an ID-only query", async () => {
    const sourceEntries = [entry({ id: "alpha" })];
    const compile = (output: AssetResourceOutputSelection) =>
      compileContentArtifact({
        projectId: "project",
        entries: sourceEntries,
        plan: createContentCompilationPlan([
          createLiteralContentCompilationQuery({
            id: "posts",
            query: {
              where: { all: [] },
              sort: [],
              limit: 20,
              offset: 0,
              output,
              content: { mode: "none" },
            },
          }),
        ]),
      });

    const metadata = await compile({ mode: "base", includeMetadata: true });
    const idOnly = await compile({
      mode: "fields",
      includeMetadata: false,
      fields: [["id"]],
    });

    expect(idOnly.artifact.documents).toEqual([]);
    expect(Object.values(idOnly.artifact.queries ?? {})).toEqual([
      {
        fields: [["id"]],
        rows: [["alpha"]],
        totalCount: 1,
        hasMore: false,
      },
    ]);
    expect(idOnly.diagnostics.boundedBytes).toBeLessThan(
      metadata.diagnostics.boundedBytes
    );
    await expect(
      createContentDatabase({ artifact: idOnly.artifact }).query({
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
        },
      })
    ).resolves.toMatchObject({ items: [{ id: "alpha" }] });
  });

  test("materializes a static overview query without storing candidate documents", async () => {
    const posts = [
      {
        id: "newest",
        slug: "newest",
        title: "Newest",
        excerpt: "Newest excerpt",
        category: "Updates",
        publishedAt: "2026-07-05",
        readTime: "3 min read",
      },
      {
        id: "first",
        slug: "first",
        title: "First",
        excerpt: "First excerpt",
        category: "Guides",
        publishedAt: "2026-07-04",
        readTime: "4 min read",
      },
      {
        id: "second",
        slug: "second",
        title: "Second",
        excerpt: "Second excerpt",
        category: "Strategy",
        publishedAt: "2026-07-03",
        readTime: "5 min read",
      },
      {
        id: "third",
        slug: "third",
        title: "Third",
        excerpt: "Third excerpt",
        category: "Updates",
        publishedAt: "2026-07-02",
        readTime: "6 min read",
      },
      {
        id: "fourth",
        slug: "fourth",
        title: "Fourth",
        excerpt: "Fourth excerpt",
        category: "Guides",
        publishedAt: "2026-07-01",
        readTime: "7 min read",
      },
    ].map(({ id, ...properties }) =>
      createCanonicalAssetFileEntry({
        projectId: "project",
        document: {
          ...entry({ id }).document,
          properties,
        },
      })
    );
    const query = assetQuery.parse({
      where: {
        all: [{ field: ["extension"], operator: "eq", value: "md" }],
      },
      sort: [{ field: ["properties", "publishedAt"], direction: "desc" }],
      limit: 4,
      offset: 1,
      output: {
        mode: "fields",
        includeMetadata: false,
        fields: [
          ["properties", "slug"],
          ["properties", "title"],
          ["properties", "excerpt"],
          ["properties", "category"],
          ["properties", "publishedAt"],
          ["properties", "readTime"],
        ],
      },
      content: { mode: "none" },
    });
    const staticPlan = createContentCompilationPlan([
      createLiteralContentCompilationQuery({ id: "posts", query }),
    ]);
    const runtimePlan = createContentCompilationPlan([
      {
        ...createLiteralContentCompilationQuery({ id: "posts", query }),
        limit: { type: "dynamic" },
      },
    ]);
    const materialized = await compileContentArtifact({
      projectId: "project",
      entries: posts,
      plan: staticPlan,
    });
    const runtime = await compileContentArtifact({
      projectId: "project",
      entries: posts,
      plan: runtimePlan,
    });
    const bounded = await compileContentArtifact({
      projectId: "project",
      entries: posts,
      plan: staticPlan,
      maxBytes: materialized.diagnostics.boundedBytes - 200,
    });

    expect(materialized.artifact.documents).toEqual([]);
    expect(materialized.artifact.fieldCatalog.fields).toEqual({});
    expect(materialized.artifact.database).toMatchObject({
      sourceDocumentCount: 5,
      includedDocumentCount: 5,
    });
    expect(Object.values(materialized.artifact.queries ?? {})).toEqual([
      {
        fields: [
          ["id"],
          ["properties", "slug"],
          ["properties", "title"],
          ["properties", "excerpt"],
          ["properties", "category"],
          ["properties", "publishedAt"],
          ["properties", "readTime"],
        ],
        rows: [
          [
            "first",
            "first",
            "First",
            "First excerpt",
            "Guides",
            "2026-07-04",
            "4 min read",
          ],
          [
            "second",
            "second",
            "Second",
            "Second excerpt",
            "Strategy",
            "2026-07-03",
            "5 min read",
          ],
          [
            "third",
            "third",
            "Third",
            "Third excerpt",
            "Updates",
            "2026-07-02",
            "6 min read",
          ],
          [
            "fourth",
            "fourth",
            "Fourth",
            "Fourth excerpt",
            "Guides",
            "2026-07-01",
            "7 min read",
          ],
        ],
        totalCount: 5,
        hasMore: false,
      },
    ]);
    expect(materialized.diagnostics.boundedBytes).toBeLessThan(
      runtime.diagnostics.boundedBytes * 0.7
    );
    expect(bounded.diagnostics.boundedBytes).toBeLessThanOrEqual(
      materialized.diagnostics.boundedBytes - 200
    );
    expect(bounded.diagnostics.omittedDocumentCount).toBeGreaterThan(0);
    expect(
      createContentDatabase({ artifact: bounded.artifact }).getStats().truncated
    ).toBe(true);
    const result = await createContentDatabase({
      artifact: materialized.artifact,
    }).query({ query });
    expect(result.items.map(({ id }) => id)).toEqual([
      "first",
      "second",
      "third",
      "fourth",
    ]);
    expect(result.items[0]).toMatchObject({
      id: "first",
      properties: {
        slug: "first",
        title: "First",
        excerpt: "First excerpt",
      },
    });
    expect(result).toMatchObject({
      totalCount: 5,
      hasMore: false,
    });
    expect(
      createContentDatabase({
        artifact: materialized.artifact,
      }).getStats()
    ).toMatchObject({
      includedDocumentCount: 5,
      omittedDocumentCount: 0,
      omissionReason: undefined,
      truncated: false,
    });
    await expect(verifyContentArtifact(materialized.artifact)).resolves.toEqual(
      materialized.artifact
    );
  });

  test("stores overview-only fields outside dynamic detail documents", async () => {
    const sourceEntries = ["alpha", "beta"].map((id) =>
      createCanonicalAssetFileEntry({
        projectId: "project",
        document: {
          ...entry({ id }).document,
          properties: {
            slug: id,
            title: `${id} title`,
            excerpt: `${id} overview excerpt`,
          },
        },
      })
    );
    const overview = createLiteralContentCompilationQuery({
      id: "overview",
      query: {
        where: {
          all: [{ field: ["extension"], operator: "eq", value: "md" }],
        },
        sort: [],
        limit: 20,
        offset: 0,
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [
            ["properties", "slug"],
            ["properties", "title"],
            ["properties", "excerpt"],
          ],
        },
        content: { mode: "none" },
      },
    });
    const detail = {
      ...createLiteralContentCompilationQuery({
        id: "detail",
        query: {
          where: {
            all: [
              {
                field: ["properties", "slug"],
                operator: "eq",
                value: "alpha",
              },
            ],
          },
          sort: [],
          limit: 1,
          offset: 0,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["properties", "title"]],
          },
          content: { mode: "none" },
        },
      }),
      where: {
        field: ["properties", "slug"] as [string, string],
        operator: "eq" as const,
        value: { type: "dynamic" as const },
      },
    };
    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries: sourceEntries,
      plan: createContentCompilationPlan([overview, detail]),
    });

    expect(artifact.documents).toEqual([
      {
        _id: "alpha",
        properties: { slug: "alpha", title: "alpha title" },
      },
      {
        _id: "beta",
        properties: { slug: "beta", title: "beta title" },
      },
    ]);
    expect(artifact.fieldCatalog.fields).not.toHaveProperty(
      "properties.excerpt"
    );
    expect(Object.values(artifact.queries ?? {})[0]?.rows).toEqual([
      ["alpha", "alpha", "alpha title", "alpha overview excerpt"],
      ["beta", "beta", "beta title", "beta overview excerpt"],
    ]);
  });

  test("creates one deterministic complete index and field catalog", async () => {
    const index = await createAssetIndex({
      projectId: "project",
      entries: [entry({ id: "beta" }), entry({ id: "alpha" })],
    });

    expect(index.format).toBe("webstudio-content-database");
    expect(index.documents.map(({ _id }) => _id)).toEqual(["alpha", "beta"]);
    expect(index.fieldCatalog.canonicalRevision).toBe(index.assetRevision);
    expect(index.fieldCatalog.fields).toHaveProperty("properties.title");
    expect(index).not.toHaveProperty("resourceId");
    expect(index).not.toHaveProperty("queryHash");
    expect(index).not.toHaveProperty("plan");
    await expect(verifyContentArtifact(index)).resolves.toEqual(index);
  });

  test("rejects mixed projects, duplicate assets, and corrupted bytes", async () => {
    await expect(
      createAssetIndex({
        projectId: "project",
        entries: [
          entry({ id: "alpha" }),
          entry({ projectId: "other", id: "beta" }),
        ],
      })
    ).rejects.toThrow("multiple projects");
    await expect(
      createAssetIndex({
        projectId: "project",
        entries: [entry({ id: "alpha" }), entry({ id: "alpha" })],
      })
    ).rejects.toThrow("duplicate documents");
    const sharedReference = {
      ...entry({ id: "beta" }),
      document: {
        ...entry({ id: "beta" }).document,
        contentRef: "files/alpha.md",
      },
    };
    await expect(
      createAssetIndex({
        projectId: "project",
        entries: [entry({ id: "alpha" }), sharedReference],
      })
    ).resolves.toMatchObject({
      documents: [{ _id: "alpha" }, { _id: "beta" }],
    });
    await expect(
      createAssetIndex({
        projectId: "project",
        entries: [
          { ...entry({ id: "alpha" }), content: "alpha" },
          { ...sharedReference, content: "beta" },
        ],
      })
    ).rejects.toThrow("conflicting content for one reference");

    const index = await createAssetIndex({
      projectId: "project",
      entries: [entry({ id: "alpha" })],
    });
    await expect(
      verifyContentArtifact({
        ...index,
        documents: [{ ...index.documents[0], name: "changed.md" }],
      })
    ).rejects.toThrow("checksum");
    expect(serializeContentArtifact(index)).toContain(
      '"webstudio-content-database"'
    );
  });

  test("bounds the runtime database in creation order and continues after a document does not fit", async () => {
    const createSizedEntry = ({
      id,
      createdAt,
      bytes,
    }: {
      id: string;
      createdAt: string;
      bytes: number;
    }) =>
      createCanonicalAssetFileEntry({
        projectId: "project",
        document: {
          ...entry({ id }).document,
          createdAt,
          properties: { content: "x".repeat(bytes) },
        },
      });
    const entries = [
      createSizedEntry({
        id: "newest",
        createdAt: "2026-07-27T00:00:00.000Z",
        bytes: 1_000,
      }),
      createSizedEntry({
        id: "middle-too-large",
        createdAt: "2026-07-26T00:00:00.000Z",
        bytes: 10_000,
      }),
      createSizedEntry({
        id: "oldest-small",
        createdAt: "2026-07-25T00:00:00.000Z",
        bytes: 100,
      }),
    ];

    const { artifact, diagnostics } = await compileContentArtifact({
      projectId: "project",
      entries,
      maxBytes: 5_000,
      plan: createContentCompilationPlan([
        createLiteralContentCompilationQuery({
          id: "blog",
          query: {
            where: { all: [] },
            sort: [],
            limit: 100,
            offset: 0,
            output: { mode: "all", includeMetadata: true },
            content: { mode: "none" },
          },
        }),
      ]),
    });

    expect(artifact.documents.map(({ _id }) => _id)).toEqual([
      "newest",
      "oldest-small",
    ]);
    expect(diagnostics).toMatchObject({
      maxBytes: 5_000,
      includedDocumentCount: 2,
      omittedDocumentCount: 1,
      omittedDocuments: [{ id: "middle-too-large", queryIds: ["blog"] }],
      affectedQueryIds: ["blog"],
    });
    expect(diagnostics.largestDocuments[0]).not.toHaveProperty("queryIds");
    expect(diagnostics.unboundedBytes).toBeGreaterThan(5_000);
    expect(diagnostics.boundedBytes).toBeLessThanOrEqual(5_000);
    expect(
      createContentDatabase({
        artifact,
        readContent: async () => {
          throw new Error("Content should not be read");
        },
      }).getStats()
    ).toMatchObject({
      usedBytes: diagnostics.boundedBytes,
      maxBytes: 5_000,
      includedDocumentCount: 2,
      omittedDocumentCount: 1,
      omissionReason: "size",
      truncated: true,
    });
    expect(contentEngineLimits.databaseBytes).toBe(500 * 1024);
    expect(parseContentDatabaseMaxBytes(undefined)).toBe(500 * 1024);
    expect(parseContentDatabaseMaxBytes("2048")).toBe(2048);
    expect(() => parseContentDatabaseMaxBytes("invalid")).toThrow(
      "CONTENT_DATABASE_MAX_BYTES"
    );
  });

  test("counts embedded bodies and accepts an exact serialized boundary", async () => {
    const entries = [
      { ...entry({ id: "alpha" }), content: "a".repeat(1_000) },
      { ...entry({ id: "beta" }), content: "b".repeat(1_000) },
    ];
    const initial = await compileContentArtifact({
      projectId: "project",
      entries,
      maxBytes: 10_000,
    });
    const exact = await compileContentArtifact({
      projectId: "project",
      entries,
      maxBytes: initial.diagnostics.unboundedBytes,
    });

    expect(exact.diagnostics.omittedDocumentCount).toBe(0);
    expect(exact.diagnostics.boundedBytes).toBe(
      exact.diagnostics.unboundedBytes
    );
    expect(exact.artifact.contents).toEqual({
      "files/alpha.md": "a".repeat(1_000),
      "files/beta.md": "b".repeat(1_000),
    });
    expect(
      (
        await compileContentArtifact({
          projectId: "project",
          entries,
          maxBytes: exact.diagnostics.unboundedBytes - 1,
        })
      ).diagnostics.omittedDocumentCount
    ).toBeGreaterThan(0);
  });

  test("keeps Markdown bodies embedded when no document graph is available", async () => {
    const plan = createContentCompilationPlan([
      createLiteralContentCompilationQuery({
        id: "detail",
        query: {
          where: { all: [] },
          sort: [],
          limit: 1,
          offset: 0,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "markdown-body" },
        },
      }),
    ]);

    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries: [{ ...entry({ id: "post" }), content: "Post body" }],
      plan,
    });

    expect(artifact.contents).toEqual({
      "files/post.md": "Post body",
    });
  });

  test("keeps Markdown bodies embedded when their graph node is unavailable", async () => {
    const plan = createContentCompilationPlan([
      createLiteralContentCompilationQuery({
        id: "detail",
        query: {
          where: { all: [] },
          sort: [],
          limit: 1,
          offset: 0,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "markdown-body" },
        },
      }),
    ]);

    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries: [{ ...entry({ id: "post" }), content: "Post body" }],
      plan,
      documentGraph: createDocumentGraph({ nodes: [], edges: [] }),
    });

    expect(artifact.contents).toEqual({
      "files/post.md": "Post body",
    });
  });

  test("omits documents when their requested content was not materialized", async () => {
    const plan = createContentCompilationPlan([
      createLiteralContentCompilationQuery({
        id: "detail",
        query: {
          where: { all: [] },
          sort: [],
          limit: 20,
          offset: 0,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "full" },
        },
      }),
    ]);
    const missing = {
      ...entry({ id: "missing" }),
      contentRequired: true as const,
    };
    const available = {
      ...entry({ id: "available" }),
      contentRequired: true as const,
      content: "Available",
    };

    const { artifact, diagnostics } = await compileContentArtifact({
      projectId: "project",
      entries: [missing, available],
      plan,
    });

    expect(artifact.documents.map(({ _id }) => _id)).toEqual(["available"]);
    expect(artifact.contents).toEqual({
      "files/available.md": "Available",
    });
    expect(diagnostics).toMatchObject({
      includedDocumentCount: 1,
      omittedDocumentCount: 1,
      omittedDocuments: [{ id: "missing", queryIds: ["detail"] }],
      affectedQueryIds: ["detail"],
    });
    expect(diagnostics.unboundedBytes).toBeGreaterThan(
      diagnostics.boundedBytes
    );
    expect(createContentDatabase({ artifact }).getStats()).toMatchObject({
      includedDocumentCount: 1,
      omittedDocumentCount: 1,
      omissionReason: "unavailable",
      truncated: true,
    });
  });

  test("bounds a thousand oversized documents without rebuilding per document", async () => {
    const entries = Array.from({ length: 1_000 }, (_, index) =>
      createCanonicalAssetFileEntry({
        projectId: "project",
        document: {
          ...entry({ id: String(index) }).document,
          createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
          properties: { payload: "x".repeat(3_000) },
        },
      })
    );

    const { artifact, diagnostics } = await compileContentArtifact({
      projectId: "project",
      entries,
    });

    expect(artifact.documents.length).toBeGreaterThan(0);
    expect(diagnostics.omittedDocumentCount).toBeGreaterThan(0);
    expect(diagnostics.boundedBytes).toBeLessThanOrEqual(
      contentEngineLimits.databaseBytes
    );
  }, 10_000);

  test("uses a query-scoped content reader without retaining it", async () => {
    const index = await createAssetIndex({
      projectId: "project",
      entries: [entry({ id: "alpha" })],
    });
    const database = createContentDatabase({ artifact: index });
    const content = "Alpha content padded";
    const readContent = async () => ({
      data: new Blob([
        content,
      ]).stream() as unknown as AsyncIterable<Uint8Array>,
      contentLength: content.length,
    });

    const result = await database.query(
      {
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "full" },
        },
      },
      readContent
    );
    expect(result).toMatchObject({
      items: [{ content: { text: content } }],
    });
    expect(result).not.toHaveProperty("database");
    expect(result).not.toHaveProperty("__diagnostics__");
    expect(assetQueryResult.safeParse(result).success).toBe(true);
    await expect(
      database.query({
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "full" },
        },
      })
    ).rejects.toThrow("Content is not embedded");
  });
});
