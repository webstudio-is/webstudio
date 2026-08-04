import { describe, expect, test, vi } from "vitest";
import { compileContentArtifact } from "../asset-index";
import { createCanonicalAssetFileEntry } from "../canonical";
import { createContentDatabase } from "../content-database";
import { assetQuery, type AssetQuery } from "../schema";
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
  return { artifact, graph, sources };
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

describe("document graph query resolution", () => {
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
      assetValueReferences: Object.fromEntries(
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
      documentGraph: graph,
    });
    const sources: Record<string, string> = {
      "post-ada":
        '{"author":{"$ref":"../authors/ada.json"},"featureImage":"./assets/hero.png"}',
      "post-grace":
        '{"author":{"$ref":"../authors/grace.json"},"featureImage":"./assets/hero.png"}',
      "author-ada": '{"name":"Ada"}',
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
              ["properties", "featureImage"],
            ],
          },
          content: { mode: "none" },
        },
      },
      load,
      runtimeAssets: {
        hero: { url: "/cgi/image/hero.png?format=raw" },
      },
    });

    expect(result).toEqual({
      items: [
        {
          id: "post-ada",
          properties: {
            author: { name: "Ada" },
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

  test("stitches graph queries whose valid logical closures exceed the single-query limit in aggregate", async () => {
    const { artifact, graph, sources } = await createCategorizedGraphFixture({
      categoryCounts: { Tools: 10, Strategy: 10 },
    });
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => ({
      format: "json" as const,
      revision: node.revision,
      source: sources[node.id],
    }));
    const onEvent = vi.fn();

    const results = await createContentDatabase({
      artifact,
    }).queryManyWithDocumentGraph({
      requests: createCategoryRequests(["Tools", "Strategy"]),
      load,
      onEvent,
    });

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
    expect(
      onEvent.mock.calls
        .map(([event]) => event)
        .filter(({ type }) => type === "roots-selected")
    ).toEqual([{ type: "roots-selected", rootCount: 20 }]);
  });

  test("falls back when a stitched graph union exceeds the aggregate byte limit", async () => {
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

    const results = await createContentDatabase({
      artifact,
    }).queryManyWithDocumentGraph({
      requests: createCategoryRequests(categories),
      load,
      onEvent,
    });

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
    expect(events.filter(({ type }) => type === "resolution-failed")).toEqual([
      {
        type: "resolution-failed",
        rootCount: 3,
        documentCount: 6,
        errorCode: "DOCUMENT_LOAD_FAILED",
      },
    ]);
    expect(events.filter(({ type }) => type === "roots-selected")).toEqual([
      { type: "roots-selected", rootCount: 3 },
      { type: "roots-selected", rootCount: 1 },
      { type: "roots-selected", rootCount: 1 },
      { type: "roots-selected", rootCount: 1 },
    ]);
  });

  test("falls back to isolated graph execution when one stitched member fails", async () => {
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

    const [good, broken] = await createContentDatabase({
      artifact,
    }).queryManyWithDocumentGraph({
      requests: createCategoryRequests(["Good", "Broken"]),
      load,
    });

    expect(good).toMatchObject({
      status: "fulfilled",
      value: { totalCount: 1 },
    });
    expect(broken.status).toBe("rejected");
  });

  test("does not retry stitched graph queries after cancellation", async () => {
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
    ).toEqual([{ type: "roots-selected", rootCount: 2 }]);
  });
});
