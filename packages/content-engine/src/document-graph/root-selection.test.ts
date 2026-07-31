import { describe, expect, test } from "vitest";
import type { AssetQueryResult, ContentDatabaseDocument } from "../schema";
import { createDocumentGraph } from "./graph";
import { compileContentArtifact } from "../asset-index";
import { createCanonicalAssetFileEntry } from "../canonical";
import { createContentDatabase } from "../content-database";
import {
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
} from "../compilation-plan";
import {
  DocumentGraphRootSelectionError,
  selectAssetQueryDocumentGraphRoots,
} from "./root-selection";

const documents: readonly ContentDatabaseDocument[] = [
  {
    _id: "first",
    revision: "first-r1",
    contentRef: "content:first",
  },
  {
    _id: "second",
    revision: "second-r1",
    contentRef: "content:second",
  },
];

const graph = createDocumentGraph({
  nodes: documents.map(({ _id, revision, contentRef }) => ({
    id: _id,
    revision: revision as string,
    contentRef: contentRef as string,
  })),
  edges: [],
});

const result = (ids: readonly string[]): AssetQueryResult => ({
  items: ids.map((id) => ({ id })),
  totalCount: ids.length,
  hasMore: false,
});

describe("Assets query document graph root selection", () => {
  test("selects every overview item and one detail item in query order", () => {
    expect(
      selectAssetQueryDocumentGraphRoots({
        graph,
        documents,
        result: result(["second", "first"]),
      }),
    ).toEqual(["second", "first"]);

    expect(
      selectAssetQueryDocumentGraphRoots({
        graph,
        documents,
        result: result(["first"]),
      }),
    ).toEqual(["first"]);
  });

  test("ignores selected assets that are not document graph nodes", () => {
    expect(
      selectAssetQueryDocumentGraphRoots({
        graph,
        documents,
        result: result(["image", "first"]),
      }),
    ).toEqual(["first"]);
  });

  test("rejects unavailable and stale selected document identities", () => {
    for (const selectedDocuments of [
      documents.slice(1),
      [{ ...documents[0], revision: "first-r0" }, documents[1]],
      [{ ...documents[0], contentRef: "content:stale" }, documents[1]],
    ]) {
      expect(() =>
        selectAssetQueryDocumentGraphRoots({
          graph,
          documents: selectedDocuments,
          result: result(["first"]),
        }),
      ).toThrow(DocumentGraphRootSelectionError);
    }
  });

  test("connects content database query results to graph roots", async () => {
    const entries = documents.map((document) =>
      createCanonicalAssetFileEntry({
        projectId: "project",
        document: {
          _id: document._id,
          _type: "asset.file",
          name: `${document._id}.md`,
          path: `blog/${document._id}.md`,
          key: document._id,
          extension: "md",
          mimeType: "text/markdown",
          size: 1,
          revision: document.revision as string,
          contentRef: document.contentRef as string,
          properties: {},
        },
      }),
    );
    const query = {
      where: { all: [] },
      sort: [{ field: ["id"] as ["id"], direction: "desc" as const }],
      limit: 20,
      offset: 0,
      output: {
        mode: "fields" as const,
        includeMetadata: false,
        fields: [["id"] as ["id"]],
      },
      content: { mode: "none" as const },
    };
    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries,
      documentGraph: graph,
      plan: createContentCompilationPlan([
        createLiteralContentCompilationQuery({ id: "overview", query }),
      ]),
    });
    expect(artifact.documents).toEqual([]);

    const selected = await createContentDatabase({
      artifact,
    }).queryWithDocumentGraphRoots({ query });

    expect(selected.result.items).toEqual([{ id: "second" }, { id: "first" }]);
    expect(selected.rootIds).toEqual(["second", "first"]);
  });
});
