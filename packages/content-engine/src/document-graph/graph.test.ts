import { describe, expect, test } from "vitest";
import {
  createDocumentGraph,
  DocumentGraphError,
  getDocumentGraphClosure,
  getDocumentGraphDependencies,
} from "./graph";

const nodes = [
  { id: "post", revision: "post-r1", contentRef: "content:post" },
  { id: "author", revision: "author-r1", contentRef: "content:author" },
  { id: "avatar", revision: "avatar-r1", contentRef: "content:avatar" },
];

const edges = [
  {
    sourceId: "post",
    referenceId: "author",
    reference: {
      documentId: "author",
      revision: "author-r1",
      representation: { type: "document" as const },
    },
  },
  {
    sourceId: "author",
    referenceId: "avatar",
    reference: {
      documentId: "avatar",
      revision: "avatar-r1",
      representation: { type: "document" as const },
    },
  },
];

describe("document graph", () => {
  test("normalizes nodes and edges deterministically", () => {
    const graph = createDocumentGraph({
      nodes: [...nodes].reverse(),
      edges: [...edges].reverse(),
    });

    expect(graph.nodes.map(({ id }) => id)).toEqual([
      "author",
      "avatar",
      "post",
    ]);
    expect(
      graph.edges.map(({ sourceId, referenceId }) => [sourceId, referenceId])
    ).toEqual([
      ["author", "avatar"],
      ["post", "author"],
    ]);
    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.nodes)).toBe(true);
    expect(Object.isFrozen(graph.edges)).toBe(true);
  });

  test("returns direct dependencies and a dependency-first closure", () => {
    const graph = createDocumentGraph({ nodes, edges });

    expect(
      getDocumentGraphDependencies(graph, "post").map(({ id }) => id)
    ).toEqual(["author"]);
    expect(
      getDocumentGraphClosure({ graph, rootIds: ["post"] }).map(({ id }) => id)
    ).toEqual(["avatar", "author", "post"]);
  });

  test("rejects missing nodes, stale revisions, and duplicate reference IDs", () => {
    expect(() =>
      createDocumentGraph({
        nodes,
        edges: [{ ...edges[0], sourceId: "missing" }],
      })
    ).toThrowError(DocumentGraphError);
    expect(() =>
      createDocumentGraph({
        nodes,
        edges: [
          {
            ...edges[0],
            reference: { ...edges[0].reference, revision: "author-r0" },
          },
        ],
      })
    ).toThrow("revision");
    expect(() =>
      createDocumentGraph({ nodes, edges: [edges[0], edges[0]] })
    ).toThrow("reference ID");
  });

  test("reports the reachable cycle", () => {
    const graph = createDocumentGraph({
      nodes,
      edges: [
        ...edges,
        {
          sourceId: "avatar",
          referenceId: "post",
          reference: {
            documentId: "post",
            revision: "post-r1",
            representation: { type: "document" },
          },
        },
      ],
    });

    expect(() => getDocumentGraphClosure({ graph, rootIds: ["post"] })).toThrow(
      "post -> author -> avatar -> post"
    );
  });
});
