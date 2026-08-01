import { expect, test } from "vitest";
import { assetQuery } from "../schema";
import { createDocumentGraph } from "./graph";
import {
  getDocumentGraphQueryRootIds,
  isDocumentGraphFieldAffected,
} from "./query-references";

test("ignores reference IDs that are not valid property pointers", () => {
  const graph = createDocumentGraph({
    nodes: [
      { id: "post", revision: "post-r1", contentRef: "content:post" },
      { id: "author", revision: "author-r1", contentRef: "content:author" },
    ],
    edges: [
      {
        sourceId: "post",
        referenceId: "#/~",
        reference: {
          documentId: "author",
          revision: "author-r1",
          representation: { type: "document" },
        },
      },
    ],
  });
  const query = assetQuery.parse({
    output: {
      mode: "fields",
      fields: [["properties", "author"]],
      includeMetadata: false,
    },
  });

  expect(
    isDocumentGraphFieldAffected({
      graph,
      sourceId: "post",
      field: ["properties", "author"],
    })
  ).toBe(false);
  expect(getDocumentGraphQueryRootIds({ graph, query })).toEqual([]);
});
