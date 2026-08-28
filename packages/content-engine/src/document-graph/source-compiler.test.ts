import { describe, expect, test } from "vitest";
import {
  compileDocumentSourceGraph,
  createDocumentSourceUrl,
  DocumentSourceCompilationError,
} from "./source-compiler";

const documents = [
  {
    id: "post",
    documentUrl: "https://content.webstudio.test/posts/hello.json",
    revision: "post-r1",
    contentRef: "content:post",
    format: "json" as const,
    source:
      '{"author":{"$ref":"../authors/ada.md#frontmatter"},"body":{"$ref":"../authors/ada.md#body"}}',
  },
  {
    id: "author",
    documentUrl: "https://content.webstudio.test/authors/ada.md",
    revision: "author-r1",
    contentRef: "content:author",
    format: "markdown" as const,
    source:
      "---\nname: Ada\navatar:\n  $ref: ../media/ada.json#/url\n---\nWriter.\n",
  },
  {
    id: "avatar",
    documentUrl: "https://content.webstudio.test/media/ada.json",
    revision: "avatar-r1",
    contentRef: "content:avatar",
    format: "json" as const,
    source: '{"url":"/ada.png"}',
  },
];

describe("document source graph compiler", () => {
  test("encodes every Asset path segment as document URL data", () => {
    expect(createDocumentSourceUrl("authors/Ada #1/プロフィール.md")).toBe(
      "https://content.webstudio.local/authors/Ada%20%231/%E3%83%97%E3%83%AD%E3%83%95%E3%82%A3%E3%83%BC%E3%83%AB.md"
    );
  });

  test("discovers mixed-format references and compiles a deterministic graph", async () => {
    const graph = await compileDocumentSourceGraph({
      documents: [...documents].reverse(),
      concurrency: 2,
    });

    expect(graph.nodes.map(({ id }) => id)).toEqual([
      "author",
      "avatar",
      "post",
    ]);
    expect(graph.nodes.map(({ id, format }) => [id, format])).toEqual([
      ["author", "markdown"],
      ["avatar", "json"],
      ["post", "json"],
    ]);
    expect(graph.edges).toEqual([
      {
        sourceId: "author",
        referenceId: "#frontmatter/avatar",
        reference: {
          documentId: "avatar",
          revision: "avatar-r1",
          representation: { type: "json", path: ["url"] },
        },
      },
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
        referenceId: "#/body",
        reference: {
          documentId: "author",
          revision: "author-r1",
          representation: { type: "markdown-body" },
        },
      },
    ]);
  });

  test("reports analysis failures with their source document", async () => {
    await expect(
      compileDocumentSourceGraph({
        documents: [
          {
            ...documents[0],
            source: '{"author":{"$ref":42}}',
          },
        ],
        concurrency: 1,
      })
    ).rejects.toMatchObject({
      code: "DOCUMENT_ANALYSIS_FAILED",
      documentId: "post",
      cause: expect.objectContaining({
        code: "INVALID_REFERENCE_MARKER",
        referenceId: "#/author",
      }),
    } satisfies Partial<DocumentSourceCompilationError>);
  });

  test("rejects an already-cancelled compilation before reading sources", async () => {
    const controller = new AbortController();
    controller.abort("cancelled");
    let read = false;

    await expect(
      compileDocumentSourceGraph({
        documents: [
          {
            ...documents[0],
            source: {
              async *[Symbol.asyncIterator]() {
                read = true;
                yield new Uint8Array();
              },
            },
          },
        ],
        concurrency: 1,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ code: "REQUEST_CANCELLED" });
    expect(read).toBe(false);
  });
});
