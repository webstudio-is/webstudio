import { describe, expect, test } from "vitest";
import { createDocumentGraph } from "./graph";
import { DocumentGraphResolutionError, resolveDocumentGraph } from "./resolver";

const graph = createDocumentGraph({
  nodes: [
    { id: "post", revision: "post-r1", contentRef: "content:post" },
    { id: "author", revision: "author-r1", contentRef: "content:author" },
    { id: "avatar", revision: "avatar-r1", contentRef: "content:avatar" },
    { id: "unused", revision: "unused-r1", contentRef: "content:unused" },
  ],
  edges: [
    {
      sourceId: "post",
      referenceId: "author",
      reference: {
        documentId: "author",
        revision: "author-r1",
        representation: { type: "json", path: ["name"] },
      },
    },
    {
      sourceId: "post",
      referenceId: "avatar",
      reference: {
        documentId: "avatar",
        revision: "avatar-r1",
        representation: { type: "document" },
      },
    },
    {
      sourceId: "author",
      referenceId: "avatar",
      reference: {
        documentId: "avatar",
        revision: "avatar-r1",
        representation: { type: "document" },
      },
    },
  ],
});

describe("document graph resolver", () => {
  test("loads the reachable closure once with bounded concurrency and assembles dependency-first", async () => {
    type Source = { id: string };
    type Value = { id: string; references: Record<string, unknown> };
    let active = 0;
    let maximumActive = 0;
    const loaded: string[] = [];
    const assembled: string[] = [];

    const result = await resolveDocumentGraph<Source, Value>({
      graph,
      rootIds: ["post"],
      concurrency: 2,
      load: async (node) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        loaded.push(node.id);
        await Promise.resolve();
        active -= 1;
        return { id: node.id };
      },
      select: ({ reference, value }) =>
        reference.representation.type === "json"
          ? `${value.id}:${reference.representation.path.join(".")}`
          : value.id,
      assemble: ({ node, references }) => {
        assembled.push(node.id);
        return {
          id: node.id,
          references: Object.fromEntries(references),
        };
      },
    });

    expect(new Set(loaded)).toEqual(new Set(["post", "author", "avatar"]));
    expect(loaded).toHaveLength(3);
    expect(loaded).not.toContain("unused");
    expect(maximumActive).toBe(2);
    expect(assembled).toEqual(["avatar", "author", "post"]);
    expect(result.roots).toEqual([
      {
        id: "post",
        references: {
          author: "author:name",
          avatar: "avatar",
        },
      },
    ]);
    expect(result.values.get("author")).toEqual({
      id: "author",
      references: { avatar: "avatar" },
    });
  });

  test("wraps a document load failure with document context", async () => {
    await expect(
      resolveDocumentGraph({
        graph,
        rootIds: ["post"],
        concurrency: 2,
        load: async (node) => {
          if (node.id === "author") {
            throw new Error("offline");
          }
          return node.id;
        },
        assemble: ({ source }) => source,
      })
    ).rejects.toMatchObject({
      code: "DOCUMENT_LOAD_FAILED",
      documentId: "author",
    } satisfies Partial<DocumentGraphResolutionError>);
  });

  test("loads a shared content reference once for multiple document identities", async () => {
    const aliasGraph = createDocumentGraph({
      nodes: [
        { id: "first", revision: "first-r1", contentRef: "content:shared" },
        { id: "second", revision: "second-r1", contentRef: "content:shared" },
      ],
      edges: [],
    });
    let loadCount = 0;

    const result = await resolveDocumentGraph({
      graph: aliasGraph,
      rootIds: ["first", "second"],
      concurrency: 2,
      load: async () => {
        loadCount += 1;
        return "shared";
      },
      assemble: ({ node, source }) => `${node.id}:${source}`,
    });

    expect(loadCount).toBe(1);
    expect(result.roots).toEqual(["first:shared", "second:shared"]);
  });
});
