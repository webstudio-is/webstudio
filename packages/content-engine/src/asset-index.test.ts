import { describe, expect, test } from "vitest";
import { contentEngineLimits, parseContentDatabaseMaxBytes } from "./limits";
import { createCanonicalAssetFileEntry } from "./canonical";
import { createContentDatabase } from "./content-database";
import { assetQueryResult, type AssetResourceOutputSelection } from "./schema";
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

    expect(idOnly.artifact.documents).toEqual([{ _id: "alpha" }]);
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
