import { describe, expect, test } from "vitest";
import { createDocumentGraph } from "./graph";
import { resolveAdaptedDocumentGraph } from "./document-resolution";

const graph = createDocumentGraph({
  nodes: [
    { id: "post", revision: "post-r1", contentRef: "content:post" },
    { id: "author", revision: "author-r1", contentRef: "content:author" },
    { id: "avatar", revision: "avatar-r1", contentRef: "content:avatar" },
  ],
  edges: [
    {
      sourceId: "post",
      referenceId: "#/author",
      reference: {
        documentId: "author",
        revision: "author-r1",
        representation: { type: "markdown-frontmatter" },
      },
    },
    {
      sourceId: "post",
      referenceId: "#/bio",
      reference: {
        documentId: "author",
        revision: "author-r1",
        representation: { type: "markdown-body" },
      },
    },
    {
      sourceId: "author",
      referenceId: "#frontmatter/avatar",
      reference: {
        documentId: "avatar",
        revision: "avatar-r1",
        representation: { type: "json", path: ["url"] },
      },
    },
  ],
});

describe("adapted document graph resolution", () => {
  test("parses once and assembles nested shared cross-format references", async () => {
    const sources = new Map([
      [
        "content:post",
        {
          format: "json" as const,
          source:
            '{"title":"Hello","author":{"$ref":"./author.md#frontmatter"},"bio":{"$ref":"./author.md#body"}}',
        },
      ],
      [
        "content:author",
        {
          format: "markdown" as const,
          source:
            "---\nname: Ada\navatar:\n  $ref: ./avatar.json#/url\n---\nWrites about the web.\n",
        },
      ],
      [
        "content:avatar",
        {
          format: "json" as const,
          source: '{"url":"/ada.png"}',
        },
      ],
    ]);
    const loaded: string[] = [];

    const result = await resolveAdaptedDocumentGraph({
      graph,
      rootIds: ["post"],
      concurrency: 3,
      load: async (node) => {
        loaded.push(node.contentRef);
        const source = sources.get(node.contentRef);
        if (source === undefined) {
          throw new Error("missing fixture source");
        }
        return source;
      },
    });

    expect(loaded.sort()).toEqual([...sources.keys()].sort());
    expect(result.roots).toEqual([
      {
        format: "json",
        value: {
          title: "Hello",
          author: { name: "Ada", avatar: "/ada.png" },
          bio: "Writes about the web.\n",
        },
      },
    ]);
    expect(result.values.get("author")).toMatchObject({
      format: "markdown",
      value: { frontmatter: { name: "Ada", avatar: "/ada.png" } },
    });
  });

  test("applies the byte limit while loading document sources", async () => {
    await expect(
      resolveAdaptedDocumentGraph({
        graph: createDocumentGraph({
          nodes: [
            { id: "post", revision: "post-r1", contentRef: "content:post" },
          ],
          edges: [],
        }),
        rootIds: ["post"],
        concurrency: 1,
        maximumBytes: 4,
        load: async () => ({ format: "json", source: '{"title":"Hello"}' }),
      })
    ).rejects.toMatchObject({
      code: "DOCUMENT_LOAD_FAILED",
      documentId: "post",
      cause: expect.objectContaining({ code: "CONTENT_LIMIT_EXCEEDED" }),
    });
  });
});
