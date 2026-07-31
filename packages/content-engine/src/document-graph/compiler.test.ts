import { describe, expect, test } from "vitest";
import { parseSourceDocumentReference } from "./reference-codec";
import {
  compileDocumentGraph,
  DocumentGraphCompilationError,
} from "./compiler";

const documents = [
  {
    id: "post",
    documentUrl: "https://content.webstudio.test/posts/hello.json",
    revision: "post-r1",
    contentRef: "content:post",
  },
  {
    id: "author",
    documentUrl: "https://content.webstudio.test/authors/ada.json",
    revision: "author-r2",
    contentRef: "content:author",
  },
  {
    id: "avatar",
    documentUrl: "https://content.webstudio.test/media/ada.json",
    revision: "avatar-r3",
    contentRef: "content:avatar",
  },
];

const references = [
  {
    sourceDocumentId: "post",
    referenceId: "author",
    reference: parseSourceDocumentReference({
      value: "../authors/ada.json#/name",
      baseUrl: documents[0].documentUrl,
    }),
  },
  {
    sourceDocumentId: "author",
    referenceId: "avatar",
    reference: parseSourceDocumentReference({
      value: "../media/ada.json",
      baseUrl: documents[1].documentUrl,
    }),
  },
];

describe("document graph compiler", () => {
  test("resolves source references to deterministic graph edges", () => {
    const graph = compileDocumentGraph({
      documents: [...documents].reverse(),
      references: [...references].reverse(),
    });

    expect(graph.nodes).toEqual([
      { id: "author", revision: "author-r2", contentRef: "content:author" },
      { id: "avatar", revision: "avatar-r3", contentRef: "content:avatar" },
      { id: "post", revision: "post-r1", contentRef: "content:post" },
    ]);
    expect(graph.edges).toEqual([
      {
        sourceId: "author",
        referenceId: "avatar",
        reference: {
          documentId: "avatar",
          revision: "avatar-r3",
          representation: { type: "document" },
        },
      },
      {
        sourceId: "post",
        referenceId: "author",
        reference: {
          documentId: "author",
          revision: "author-r2",
          representation: { type: "json", path: ["name"] },
        },
      },
    ]);
  });

  test("matches canonical document URLs", () => {
    const graph = compileDocumentGraph({
      documents,
      references: [
        {
          ...references[0],
          reference: {
            ...references[0].reference,
            documentUrl:
              "https://CONTENT.webstudio.test/authors/../authors/ada.json",
          },
        },
      ],
    });

    expect(graph.edges[0].reference.documentId).toBe("author");
  });

  test("reports a missing target with source occurrence context", () => {
    expect(() =>
      compileDocumentGraph({
        documents,
        references: [
          {
            ...references[0],
            referenceId: "missing-author",
            reference: {
              ...references[0].reference,
              documentUrl:
                "https://content.webstudio.test/authors/missing.json",
            },
          },
        ],
      })
    ).toThrowError(
      expect.objectContaining({
        code: "TARGET_NOT_FOUND",
        sourceDocumentId: "post",
        referenceId: "missing-author",
        documentUrl: "https://content.webstudio.test/authors/missing.json",
      } satisfies Partial<DocumentGraphCompilationError>)
    );
  });

  test("reports a missing source with reference context", () => {
    expect(() =>
      compileDocumentGraph({
        documents,
        references: [{ ...references[0], sourceDocumentId: "missing-post" }],
      })
    ).toThrowError(
      expect.objectContaining({
        code: "SOURCE_NOT_FOUND",
        sourceDocumentId: "missing-post",
        referenceId: "author",
      } satisfies Partial<DocumentGraphCompilationError>)
    );
  });

  test("rejects duplicate canonical document URLs", () => {
    expect(() =>
      compileDocumentGraph({
        documents: [
          ...documents,
          {
            id: "author-alias",
            documentUrl:
              "https://CONTENT.webstudio.test/people/../authors/ada.json",
            revision: "author-r2",
            contentRef: "content:author",
          },
        ],
        references: [],
      })
    ).toThrowError(
      expect.objectContaining({
        code: "DUPLICATE_DOCUMENT_URL",
        documentIds: ["author", "author-alias"],
      } satisfies Partial<DocumentGraphCompilationError>)
    );
  });

  test("rejects duplicate document IDs before resolving references", () => {
    expect(() =>
      compileDocumentGraph({
        documents: [
          ...documents,
          {
            id: "author",
            documentUrl: "https://content.webstudio.test/authors/grace.json",
            revision: "author-r4",
            contentRef: "content:grace",
          },
        ].reverse(),
        references,
      })
    ).toThrowError(
      expect.objectContaining({
        code: "DUPLICATE_DOCUMENT_ID",
        documentIds: ["author"],
      } satisfies Partial<DocumentGraphCompilationError>)
    );
  });

  test("validates cycles across disconnected components", () => {
    const cycleReferences = [
      {
        sourceDocumentId: "author",
        referenceId: "avatar",
        reference: parseSourceDocumentReference({
          value: documents[2].documentUrl,
          baseUrl: documents[1].documentUrl,
        }),
      },
      {
        sourceDocumentId: "avatar",
        referenceId: "author",
        reference: parseSourceDocumentReference({
          value: documents[1].documentUrl,
          baseUrl: documents[2].documentUrl,
        }),
      },
    ];

    expect(() =>
      compileDocumentGraph({ documents, references: cycleReferences })
    ).toThrowError(
      expect.objectContaining({
        code: "CYCLE",
        documentIds: ["author", "avatar", "author"],
      } satisfies Partial<DocumentGraphCompilationError>)
    );
  });
});
