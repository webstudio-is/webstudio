import { describe, expect, test } from "vitest";
import {
  analyzeMarkdownDocument,
  assembleMarkdownDocument,
  MarkdownDocumentError,
  selectMarkdownDocumentRepresentation,
} from "./markdown-document";

const documentUrl = "https://content.webstudio.test/posts/hello.md";
const source = `---
title: Hello
author:
  $ref: ../authors/ada.json
seo:
  image:
    $ref: ../media/card.json#/url
---
# Hello

The body can contain { "$ref": "ordinary text" }.
`;

describe("Markdown document adapter", () => {
  test("parses source, body, frontmatter, and compiler-ready references", async () => {
    const analyzed = await analyzeMarkdownDocument({
      source,
      sourceDocumentId: "post",
      documentUrl,
    });

    expect(analyzed.document.source).toBe(source);
    expect(analyzed.document.body).toBe(
      '# Hello\n\nThe body can contain { "$ref": "ordinary text" }.\n'
    );
    expect(analyzed.document.frontmatter).toEqual({
      title: "Hello",
      author: { $ref: "../authors/ada.json" },
      seo: { image: { $ref: "../media/card.json#/url" } },
    });
    expect(analyzed.references).toEqual([
      {
        sourceDocumentId: "post",
        referenceId: "#frontmatter/author",
        reference: {
          documentUrl: "https://content.webstudio.test/authors/ada.json",
          representation: { type: "document" },
        },
      },
      {
        sourceDocumentId: "post",
        referenceId: "#frontmatter/seo/image",
        reference: {
          documentUrl: "https://content.webstudio.test/media/card.json",
          representation: { type: "json", path: ["url"] },
        },
      },
    ]);
  });

  test("selects complete source, body, and assembled frontmatter", async () => {
    const { document } = await analyzeMarkdownDocument({
      source,
      sourceDocumentId: "post",
      documentUrl,
    });
    const assembled = assembleMarkdownDocument({
      document,
      references: new Map<string, unknown>([
        ["#frontmatter/author", { name: "Ada" }],
        ["#frontmatter/seo/image", "/card.png"],
      ]),
    });

    expect(
      selectMarkdownDocumentRepresentation({
        document: assembled,
        representation: { type: "document" },
      })
    ).toBe(source);
    expect(
      selectMarkdownDocumentRepresentation({
        document: assembled,
        representation: { type: "markdown-body" },
      })
    ).toBe('# Hello\n\nThe body can contain { "$ref": "ordinary text" }.\n');
    expect(
      selectMarkdownDocumentRepresentation({
        document: assembled,
        representation: { type: "markdown-frontmatter" },
      })
    ).toEqual({
      title: "Hello",
      author: { name: "Ada" },
      seo: { image: "/card.png" },
    });
    expect(document.frontmatter).toHaveProperty("author.$ref");
  });

  test("reports unsupported representations", async () => {
    const { document } = await analyzeMarkdownDocument({
      source: "# Hello",
      sourceDocumentId: "post",
      documentUrl,
    });

    expect(() =>
      selectMarkdownDocumentRepresentation({
        document,
        representation: { type: "json", path: ["title"] },
      })
    ).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_REPRESENTATION" })
    );
  });

  test("reports frontmatter reference failures with namespaced IDs", async () => {
    const { document } = await analyzeMarkdownDocument({
      source,
      sourceDocumentId: "post",
      documentUrl,
    });

    expect(() =>
      assembleMarkdownDocument({ document, references: new Map() })
    ).toThrowError(
      expect.objectContaining({
        code: "REFERENCE_NOT_FOUND",
        referenceId: "#frontmatter/author",
      } satisfies Partial<MarkdownDocumentError>)
    );
    expect(() =>
      assembleMarkdownDocument({
        document: {
          source: "---\nauthor:\n  $ref: 42\n---\n",
          body: "",
          frontmatter: { author: { $ref: 42 } },
        },
        references: new Map(),
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_REFERENCE_MARKER",
        referenceId: "#frontmatter/author",
      } satisfies Partial<MarkdownDocumentError>)
    );
  });
});
