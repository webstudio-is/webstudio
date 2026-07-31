import { describe, expect, test, vi } from "vitest";
import { compileContentArtifact } from "../asset-index";
import { createCanonicalAssetFileEntry } from "../canonical";
import { createContentDatabase } from "../content-database";
import {
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
} from "../compilation-plan";
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
      properties: { author: { $ref: authorPath } },
    },
  });

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
      documentGraph: graph,
    });
    const sources: Record<string, string> = {
      "post-ada": '{"author":{"$ref":"../authors/ada.json"}}',
      "post-grace": '{"author":{"$ref":"../authors/grace.json"}}',
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
            fields: [["properties", "author", "name"]],
          },
          content: { mode: "none" },
        },
      },
      load,
    });

    expect(result).toEqual({
      items: [
        {
          id: "post-ada",
          properties: { author: { name: "Ada" } },
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

    const materializableQuery = {
      where: { all: [] },
      sort: [],
      limit: 20,
      offset: 0,
      output: {
        mode: "fields" as const,
        includeMetadata: false,
        fields: [["properties", "author"] as ["properties", "author"]],
      },
      content: { mode: "none" as const },
    };
    const planned = await compileContentArtifact({
      projectId: "project",
      entries,
      documentGraph: graph,
      plan: createContentCompilationPlan([
        createLiteralContentCompilationQuery({
          id: "authors",
          query: materializableQuery,
        }),
      ]),
    });
    expect(planned.artifact.queries).toBeUndefined();
    expect(planned.artifact.documents).toHaveLength(2);
  });
});
