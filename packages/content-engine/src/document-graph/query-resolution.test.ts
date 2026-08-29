import { describe, expect, test, vi } from "vitest";
import { compileContentArtifact } from "../asset-index";
import { createCanonicalAssetFileEntry } from "../canonical";
import { createContentDatabase } from "../content-database";
import {
  assetQuery,
  type AssetQuery,
  type AssetQueryRequestInput,
} from "../schema";
import {
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
} from "../compilation-plan";
import { contentEngineLimits } from "../limits";
import { createDocumentGraph } from "./graph";

const createPostEntry = (id: string, authorPath: string) =>
  createCanonicalAssetFileEntry({
    projectId: "project",
    document: {
      _id: id,
      _type: "asset.file",
      name: `${id}.json`,
      path: `posts/${id}.json`,
      key: id,
      extension: "json",
      mimeType: "application/json",
      size: 1,
      revision: `${id}-r1`,
      contentRef: `content:${id}`,
      properties: {
        author: { $ref: authorPath },
        featureImage: "./assets/hero.png",
      },
    },
  });

const createCategorizedGraphFixture = async ({
  categoryCounts,
  sharedAuthor = true,
}: {
  categoryCounts: Readonly<Record<string, number>>;
  sharedAuthor?: boolean;
}) => {
  const definitions = Object.entries(categoryCounts).flatMap(
    ([category, count]) =>
      Array.from({ length: count }, (_, index) => ({
        id: `${category.toLowerCase()}-${String(index).padStart(2, "0")}`,
        category,
        authorId: sharedAuthor ? "author" : `author-${category.toLowerCase()}`,
      }))
  );
  const entries = definitions.map(({ id, category, authorId }) =>
    createCanonicalAssetFileEntry({
      projectId: "project",
      document: {
        _id: id,
        _type: "asset.file",
        name: `${id}.json`,
        path: `posts/${id}.json`,
        key: id,
        extension: "json",
        mimeType: "application/json",
        size: 1,
        revision: `${id}-r1`,
        contentRef: `content:${id}`,
        properties: {
          category,
          author: { $ref: `../authors/${authorId}.json` },
        },
      },
    })
  );
  const authorIds = [...new Set(definitions.map(({ authorId }) => authorId))];
  const graph = createDocumentGraph({
    nodes: [
      ...entries.map(({ assetId, revision, document }) => ({
        id: assetId,
        revision,
        contentRef: document.contentRef,
        format: "json" as const,
      })),
      ...authorIds.map((id) => ({
        id,
        revision: `${id}-r1`,
        contentRef: `content:${id}`,
        format: "json" as const,
      })),
    ],
    edges: definitions.map(({ id, authorId }) => ({
      sourceId: id,
      referenceId: "#/author",
      reference: {
        documentId: authorId,
        revision: `${authorId}-r1`,
        representation: { type: "document" as const },
      },
    })),
  });
  const { artifact } = await compileContentArtifact({
    projectId: "project",
    entries,
    documentGraph: graph,
  });
  const sources = Object.fromEntries([
    ...definitions.map(({ id, category, authorId }) => [
      id,
      JSON.stringify({
        category,
        author: { $ref: `../authors/${authorId}.json` },
      }),
    ]),
    ...authorIds.map((id) => [id, JSON.stringify({ name: id })]),
  ]);
  return { artifact, entries, graph, sources };
};

const createCategoryRequests = (categories: readonly string[]) =>
  categories.map((category) => ({
    query: assetQuery.parse({
      where: {
        all: [
          {
            field: ["properties", "category"],
            operator: "eq",
            value: category,
          },
        ],
      },
      sort: [{ field: ["id"], direction: "asc" }],
      limit: 20,
      output: {
        mode: "fields",
        includeMetadata: false,
        fields: [["properties", "author"]],
      },
      content: { mode: "none" },
    }),
  }));

const normalizeSettlements = (
  settlements: readonly PromiseSettledResult<unknown>[]
) =>
  settlements.map((settlement) => {
    if (settlement.status === "fulfilled") {
      return settlement;
    }
    const reason = settlement.reason;
    const error =
      typeof reason === "object" && reason !== null
        ? (reason as Record<string, unknown>)
        : undefined;
    const cause =
      typeof error?.cause === "object" && error.cause !== null
        ? (error.cause as Record<string, unknown>)
        : undefined;
    return {
      status: settlement.status,
      reason: {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        causeCode: cause?.code,
      },
    };
  });

describe("document graph query resolution", () => {
  test("matches independent query policy for materialized results and errors", async () => {
    const entry = createCanonicalAssetFileEntry({
      projectId: "project",
      document: {
        _id: "post",
        _type: "asset.file",
        name: "post.json",
        path: "posts/post.json",
        key: "post",
        extension: "json",
        mimeType: "application/json",
        size: 1,
        revision: "post-r1",
        contentRef: "content:post",
        properties: {},
      },
    });
    const graph = createDocumentGraph({
      nodes: [
        {
          id: "post",
          revision: "post-r1",
          contentRef: "content:post",
          format: "json",
        },
      ],
      edges: [],
    });
    const materializedQuery = assetQuery.parse({
      limit: 1,
      output: {
        mode: "fields",
        includeMetadata: false,
        fields: [["id"]],
      },
      content: { mode: "none" },
    });
    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries: [entry],
      documentGraph: graph,
      plan: createContentCompilationPlan([
        createLiteralContentCompilationQuery({
          id: "post",
          query: materializedQuery,
        }),
      ]),
    });
    const staleRevision = `${artifact.integrity.checksum}-stale`;
    const requests = [
      { query: { ...materializedQuery, limit: 2 } },
      { query: materializedQuery, indexRevision: staleRevision },
      { query: materializedQuery },
      { query: { ...materializedQuery, limit: -1 } },
      {
        query: { ...materializedQuery, limit: -1 },
        indexRevision: staleRevision,
      },
      { query: materializedQuery },
    ] satisfies AssetQueryRequestInput[];
    const database = createContentDatabase({ artifact });
    const independentLoad = vi.fn();
    const independent = await Promise.allSettled(
      requests.map((request) =>
        database.queryWithDocumentGraph({
          request,
          load: independentLoad,
        })
      )
    );
    const batchLoad = vi.fn();

    const batch = await database.queryManyWithDocumentGraph({
      requests,
      load: batchLoad,
    });

    expect(normalizeSettlements(batch)).toEqual(
      normalizeSettlements(independent)
    );
    expect(batch.map(({ status }) => status)).toEqual([
      "fulfilled",
      "rejected",
      "fulfilled",
      "rejected",
      "rejected",
      "fulfilled",
    ]);
    expect(batch[2]).toMatchObject({
      status: "fulfilled",
      value: { items: [{ id: "post" }], totalCount: 1 },
    });
    expect(batch[4]).toMatchObject({
      status: "rejected",
      reason: { name: "AssetIndexRevisionError" },
    });
    expect(independentLoad).not.toHaveBeenCalled();
    expect(batchLoad).not.toHaveBeenCalled();
  });

  test("resolves referenced fields before filtering and projection", async () => {
    const entries = [
      createPostEntry("post-ada", "../authors/ada.json"),
      createPostEntry("post-grace", "../authors/grace.json"),
    ];
    const graph = createDocumentGraph({
      nodes: [
        ...entries.map(({ assetId, revision, document }) => ({
          id: assetId,
          revision,
          contentRef: document.contentRef,
          format: "json" as const,
        })),
        {
          id: "author-ada",
          revision: "author-ada-r1",
          contentRef: "content:author-ada",
          format: "json",
        },
        {
          id: "author-grace",
          revision: "author-grace-r1",
          contentRef: "content:author-grace",
          format: "json",
        },
      ],
      edges: [
        {
          sourceId: "post-ada",
          referenceId: "#/author",
          reference: {
            documentId: "author-ada",
            revision: "author-ada-r1",
            representation: { type: "document" },
          },
        },
        {
          sourceId: "post-grace",
          referenceId: "#/author",
          reference: {
            documentId: "author-grace",
            revision: "author-grace-r1",
            representation: { type: "document" },
          },
        },
      ],
    });
    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries,
      assetValueReferences: {
        ...Object.fromEntries(
          entries.map(({ assetId }) => [
            assetId,
            [
              {
                path: ["properties", "featureImage"],
                assetId: "hero",
              },
            ],
          ])
        ),
        "author-ada": [
          {
            path: ["properties", "profileImage"],
            assetId: "ada-avatar",
            structured: true,
          },
        ],
      },
      documentGraph: graph,
    });
    const sources: Record<string, string> = {
      "post-ada":
        '{"author":{"$ref":"../authors/ada.json"},"featureImage":"./assets/hero.png"}',
      "post-grace":
        '{"author":{"$ref":"../authors/grace.json"},"featureImage":"./assets/hero.png"}',
      "author-ada": '{"name":"Ada","profileImage":{"$ref":"./ada.png"}}',
      "author-grace": '{"name":"Grace"}',
    };
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => ({
      format: "json" as const,
      revision: node.revision,
      source: sources[node.id],
    }));

    const database = createContentDatabase({ artifact });
    const result = await database.queryWithDocumentGraph({
      request: {
        query: {
          where: {
            all: [
              {
                field: ["properties", "author", "name"],
                operator: "eq",
                value: "Ada",
              },
              {
                field: ["properties", "featureImage"],
                operator: "startsWith",
                value: "/cgi/image/",
              },
            ],
          },
          sort: [
            {
              field: ["properties", "author", "name"],
              direction: "asc",
            },
          ],
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [
              ["properties", "author", "name"],
              ["properties", "author", "profileImage", "src"],
              ["properties", "featureImage"],
            ],
          },
          content: { mode: "none" },
        },
      },
      load,
      runtimeAssets: {
        hero: { url: "/cgi/image/hero.png?format=raw" },
        "ada-avatar": {
          url: "/cgi/image/ada.png?format=raw",
          description: "Portrait of Ada",
        },
      },
    });

    expect(result).toEqual({
      items: [
        {
          id: "post-ada",
          properties: {
            author: {
              name: "Ada",
              profileImage: {
                src: "/cgi/image/ada.png?format=raw",
              },
            },
            featureImage: "/cgi/image/hero.png?format=raw",
          },
        },
      ],
      totalCount: 1,
      hasMore: false,
    });
    const sorted = await database.queryWithDocumentGraph({
      request: {
        query: {
          where: { all: [] },
          sort: [
            {
              field: ["properties", "author", "name"],
              direction: "desc",
            },
          ],
          limit: 1,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["properties", "author", "name"]],
          },
          content: { mode: "none" },
        },
      },
      load,
    });
    expect(sorted.items).toEqual([
      {
        id: "post-grace",
        properties: { author: { name: "Grace" } },
      },
    ]);
    expect(load).toHaveBeenCalledTimes(8);

    const graphQuery = {
      where: {
        all: [
          {
            field: ["properties", "author", "name"],
            operator: "eq",
            value: "Ada",
          },
        ],
      },
      sort: [],
      limit: 20,
      offset: 0,
      output: {
        mode: "fields",
        includeMetadata: false,
        fields: [["properties", "author"]],
      },
      content: { mode: "none" },
    } satisfies AssetQuery;
    const planned = await compileContentArtifact({
      projectId: "project",
      entries,
      documentGraph: graph,
      plan: createContentCompilationPlan([
        createLiteralContentCompilationQuery({
          id: "authors",
          query: graphQuery,
        }),
      ]),
    });
    expect(planned.artifact.queries).toBeUndefined();
    expect(planned.artifact.documents).toHaveLength(2);
  });

  test("narrows graph roots with static filters and skips unselected sibling references", async () => {
    const postCount = 12;
    const entries = Array.from({ length: postCount }, (_, index) => {
      const id = `post-${String(index).padStart(2, "0")}`;
      return createCanonicalAssetFileEntry({
        projectId: "project",
        document: {
          _id: id,
          _type: "asset.file",
          name: `${id}.json`,
          path: `posts/${id}.json`,
          key: id,
          extension: "json",
          mimeType: "application/json",
          size: 1,
          revision: `${id}-r1`,
          contentRef: `content:${id}`,
          properties: {
            slug: id,
            author: { $ref: "../author.json" },
            body: { $ref: `./${id}.md#body` },
          },
        },
      });
    });
    const graph = createDocumentGraph({
      nodes: [
        ...entries.map(({ assetId, revision, document }) => ({
          id: assetId,
          revision,
          contentRef: document.contentRef,
          format: "json" as const,
        })),
        ...entries.map(({ assetId }) => ({
          id: `${assetId}-body`,
          revision: `${assetId}-body-r1`,
          contentRef: `content:${assetId}-body`,
          format: "markdown" as const,
        })),
        {
          id: "author",
          revision: "author-r1",
          contentRef: "content:author",
          format: "json" as const,
        },
      ],
      edges: entries.flatMap(({ assetId }) => [
        {
          sourceId: assetId,
          referenceId: "#/author",
          reference: {
            documentId: "author",
            revision: "author-r1",
            representation: { type: "document" as const },
          },
        },
        {
          sourceId: assetId,
          referenceId: "#/body",
          reference: {
            documentId: `${assetId}-body`,
            revision: `${assetId}-body-r1`,
            representation: { type: "markdown-body" as const },
          },
        },
      ]),
    });
    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries,
      documentGraph: graph,
    });
    const sources = Object.fromEntries([
      ...entries.map(({ assetId }) => [
        assetId,
        JSON.stringify({
          slug: assetId,
          author: { $ref: "../author.json" },
          body: { $ref: `./${assetId}.md#body` },
        }),
      ]),
      ...entries.map(({ assetId }) => [`${assetId}-body`, `# ${assetId}`]),
      ["author", '{"name":"Ada"}'],
    ]);
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => ({
      format: node.format as "json" | "markdown",
      revision: node.revision,
      source: sources[node.id],
    }));
    const database = createContentDatabase({ artifact });

    const detail = await database.queryWithDocumentGraph({
      request: {
        query: {
          where: {
            all: [
              {
                field: ["properties", "slug"],
                operator: "eq",
                value: "post-07",
              },
            ],
          },
          limit: 1,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["properties", "body"]],
          },
          content: { mode: "none" },
        },
      },
      load,
    });

    expect(detail.items).toEqual([
      { id: "post-07", properties: { body: "# post-07" } },
    ]);
    expect(load.mock.calls.map(([node]) => node.id).sort()).toEqual([
      "post-07",
      "post-07-body",
    ]);

    load.mockClear();
    const overview = await database.queryWithDocumentGraph({
      request: {
        query: {
          where: { all: [] },
          limit: postCount,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["properties", "author"]],
          },
          content: { mode: "none" },
        },
      },
      load,
    });

    expect(overview.items).toHaveLength(postCount);
    expect(load.mock.calls.map(([node]) => node.id).sort()).toEqual([
      "author",
      ...entries.map(({ assetId }) => assetId),
    ]);
  });

  test("reuses graph bytes and falls back to an explicit content reader", async () => {
    const { artifact, entries, graph, sources } =
      await createCategorizedGraphFixture({ categoryCounts: { Tools: 1 } });
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => ({
      format: "json" as const,
      revision: node.revision,
      source: sources[node.id],
    }));
    const rootSource = sources["tools-00"];
    const rootBytes = new TextEncoder().encode(rootSource);
    const hydratedArtifact = {
      ...artifact,
      documents: artifact.documents.map((document) =>
        document._id === "tools-00"
          ? { ...document, size: rootBytes.byteLength }
          : document
      ),
    };
    const request = createCategoryRequests(["Tools"])[0];
    const database = createContentDatabase({ artifact: hydratedArtifact });

    const result = await database.queryWithDocumentGraph({
      request: {
        query: { ...request.query, content: { mode: "full" } },
      },
      load,
    });

    expect(result.items[0].content?.text).toBe(rootSource);
    expect(load).toHaveBeenCalledTimes(2);

    load.mockClear();
    const readContent = vi.fn(async () => ({
      data: new Blob([new Uint8Array(rootBytes.byteLength)]).stream(),
      contentLength: rootBytes.byteLength,
    }));
    const explicit = await database.queryWithDocumentGraph({
      request: {
        query: { ...request.query, content: { mode: "full" } },
      },
      load,
      readContent,
    });

    expect(explicit.items[0].content?.text).toBe(rootSource);
    expect(load).toHaveBeenCalledTimes(2);
    expect(readContent).not.toHaveBeenCalled();

    load.mockClear();
    const { artifact: externalArtifact } = await compileContentArtifact({
      projectId: "project",
      entries: [
        ...entries,
        createCanonicalAssetFileEntry({
          projectId: "project",
          document: {
            _id: "external",
            _type: "asset.file",
            name: "external.json",
            path: "external.json",
            key: "external",
            extension: "json",
            mimeType: "application/json",
            size: rootBytes.byteLength,
            revision: "external-r1",
            contentRef: "content:external",
            properties: {},
          },
        }),
      ],
      documentGraph: graph,
    });
    const external = await createContentDatabase({
      artifact: externalArtifact,
    }).queryWithDocumentGraph({
      request: {
        query: {
          where: {
            all: [{ field: ["id"], operator: "eq", value: "external" }],
          },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "full" },
        },
      },
      load,
      readContent,
    });

    expect(external.items[0].content?.text).toBe(
      "\0".repeat(rootBytes.byteLength)
    );
    expect(load).not.toHaveBeenCalled();
    expect(readContent).toHaveBeenCalledOnce();
  });

  test("streams a small uncached range from a large graph document", async () => {
    const { artifact, graph, sources } = await createCategorizedGraphFixture({
      categoryCounts: { Tools: 1 },
    });
    const largeSource = "x".repeat(contentEngineLimits.hydratedFileBytes + 1);
    const rangedArtifact = {
      ...artifact,
      documents: artifact.documents.map((document) =>
        document._id === "tools-00"
          ? { ...document, size: largeSource.length }
          : document
      ),
    };
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => ({
      format: "json" as const,
      revision: node.revision,
      source: node.id === "tools-00" ? largeSource : sources[node.id],
    }));

    const result = await createContentDatabase({
      artifact: rangedArtifact,
    }).queryWithDocumentGraph({
      request: {
        query: {
          where: {
            all: [{ field: ["id"], operator: "eq", value: "tools-00" }],
          },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "range", offset: 0, length: 1 },
        },
      },
      load,
    });

    expect(result.items[0].content).toEqual({
      encoding: "utf-8",
      text: "x",
      range: { offset: 0, length: 1, total: largeSource.length },
    });
    expect(load).toHaveBeenCalledOnce();
  });

  test("keeps graph query limits independent while sharing document resolution", async () => {
    const { artifact, graph, sources } = await createCategorizedGraphFixture({
      categoryCounts: { Tools: 10, Strategy: 10 },
    });
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => ({
      format: "json" as const,
      revision: node.revision,
      source: sources[node.id],
    }));
    const onEvent = vi.fn();

    const database = createContentDatabase({ artifact });
    const requests = createCategoryRequests(["Tools", "Strategy"]);
    const results = await database.queryManyWithDocumentGraph({
      requests,
      load,
      onEvent,
    });
    const independentLoad = vi.fn(
      async (node: (typeof graph.nodes)[number]) => ({
        format: "json" as const,
        revision: node.revision,
        source: sources[node.id],
      })
    );
    const independent = await Promise.allSettled(
      requests.map((request) =>
        database.queryWithDocumentGraph({ request, load: independentLoad })
      )
    );

    expect(normalizeSettlements(results)).toEqual(
      normalizeSettlements(independent)
    );
    expect(results.map(({ status }) => status)).toEqual([
      "fulfilled",
      "fulfilled",
    ]);
    expect(
      results.map((result) =>
        result.status === "fulfilled" ? result.value.totalCount : undefined
      )
    ).toEqual([10, 10]);
    expect(load).toHaveBeenCalledTimes(21);
    expect(independentLoad).toHaveBeenCalledTimes(22);
    expect(
      onEvent.mock.calls
        .map(([event]) => event)
        .filter(({ type }) => type === "roots-selected")
    ).toEqual([
      { type: "roots-selected", rootCount: 10 },
      { type: "roots-selected", rootCount: 10 },
    ]);
  });

  test("keeps total byte budgets independent without replaying document loads", async () => {
    const categories = ["Tools", "Strategy", "Design"] as const;
    const { artifact, graph, sources } = await createCategorizedGraphFixture({
      categoryCounts: { Tools: 1, Strategy: 1, Design: 1 },
      sharedAuthor: false,
    });
    const authorBio = "x".repeat(
      Math.floor((contentEngineLimits.hydratedFileBytes * 3) / 4)
    );
    for (const category of categories) {
      const authorId = `author-${category.toLowerCase()}`;
      sources[authorId] = JSON.stringify({ name: authorId, bio: authorBio });
    }
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => ({
      format: "json" as const,
      revision: node.revision,
      source: sources[node.id],
    }));
    const onEvent = vi.fn();

    const database = createContentDatabase({ artifact });
    const requests = createCategoryRequests(categories);
    const results = await database.queryManyWithDocumentGraph({
      requests,
      load,
      onEvent,
    });
    const independentLoad = vi.fn(
      async (node: (typeof graph.nodes)[number]) => ({
        format: "json" as const,
        revision: node.revision,
        source: sources[node.id],
      })
    );
    const independent = await Promise.allSettled(
      requests.map((request) =>
        database.queryWithDocumentGraph({ request, load: independentLoad })
      )
    );

    expect(normalizeSettlements(results)).toEqual(
      normalizeSettlements(independent)
    );
    expect(results.map(({ status }) => status)).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled",
    ]);
    expect(
      results.map((result) =>
        result.status === "fulfilled" ? result.value.totalCount : undefined
      )
    ).toEqual([1, 1, 1]);
    const events = onEvent.mock.calls.map(([event]) => event);
    expect(events.filter(({ type }) => type === "resolution-failed")).toEqual(
      []
    );
    expect(events.filter(({ type }) => type === "roots-selected")).toEqual([
      { type: "roots-selected", rootCount: 1 },
      { type: "roots-selected", rootCount: 1 },
      { type: "roots-selected", rootCount: 1 },
    ]);
    expect(load).toHaveBeenCalledTimes(6);
  });

  test("isolates a broken dependency to the query that selects it", async () => {
    const { artifact, graph, sources } = await createCategorizedGraphFixture({
      categoryCounts: { Good: 1, Broken: 1 },
      sharedAuthor: false,
    });
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => {
      if (node.id === "author-broken") {
        throw new Error("Broken author");
      }
      return {
        format: "json" as const,
        revision: node.revision,
        source: sources[node.id],
      };
    });

    const database = createContentDatabase({ artifact });
    const requests = createCategoryRequests(["Good", "Broken"]);
    const results = await database.queryManyWithDocumentGraph({
      requests,
      load,
    });
    const independentLoad = vi.fn(
      async (node: (typeof graph.nodes)[number]) => {
        if (node.id === "author-broken") {
          throw new Error("Broken author");
        }
        return {
          format: "json" as const,
          revision: node.revision,
          source: sources[node.id],
        };
      }
    );
    const independent = await Promise.allSettled(
      requests.map((request) =>
        database.queryWithDocumentGraph({ request, load: independentLoad })
      )
    );
    const [good, broken] = results;

    expect(normalizeSettlements(results)).toEqual(
      normalizeSettlements(independent)
    );
    expect(good).toMatchObject({
      status: "fulfilled",
      value: { totalCount: 1 },
    });
    expect(broken.status).toBe("rejected");
    expect(load.mock.calls.map(([node]) => node.id).sort()).toEqual([
      "author-broken",
      "author-good",
      "broken-00",
      "good-00",
    ]);
  });

  test("settles cancelled queries without replaying document loads", async () => {
    const { artifact, graph, sources } = await createCategorizedGraphFixture({
      categoryCounts: { Tools: 1, Strategy: 1 },
    });
    const controller = new AbortController();
    const onEvent = vi.fn();
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => {
      controller.abort();
      controller.signal.throwIfAborted();
      return {
        format: "json" as const,
        revision: node.revision,
        source: sources[node.id],
      };
    });

    const results = await createContentDatabase({
      artifact,
    }).queryManyWithDocumentGraph({
      requests: createCategoryRequests(["Tools", "Strategy"]),
      load,
      signal: controller.signal,
      onEvent,
    });

    expect(results.map(({ status }) => status)).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(
      onEvent.mock.calls
        .map(([event]) => event)
        .filter(({ type }) => type === "roots-selected")
    ).toEqual([
      { type: "roots-selected", rootCount: 1 },
      { type: "roots-selected", rootCount: 1 },
    ]);
    expect(load).toHaveBeenCalledOnce();
  });
});
