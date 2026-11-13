import { describe, expect, test } from "vitest";
import {
  analyzeDocumentSource,
  assembleDocument,
  getAdaptedDocumentProperties,
  parseDocumentSource,
  selectDocumentRepresentation,
} from "./document-adapter";
import { getDocumentFormatByContentType } from "./document-format";

const documentUrl = "https://content.webstudio.test/posts/hello";

describe("document adapter", () => {
  test.each([
    {
      format: "json" as const,
      source: '{"title":"Hello","author":{"$ref":"../authors/ada.json"}}',
      referenceId: "#/author",
    },
    {
      format: "markdown" as const,
      source: "---\nauthor:\n  $ref: ../authors/ada.json\n---\n# Hello\n",
      referenceId: "#frontmatter/author",
    },
    {
      format: "mdx" as const,
      source:
        '---\nauthor:\n  $ref: ../authors/ada.json\n---\n<ws.element ws:name="Hero">Hello</ws.element>\n',
      referenceId: "#frontmatter/author",
    },
  ])("analyzes $format sources through one contract", async (fixture) => {
    const analyzed = await analyzeDocumentSource({
      format: fixture.format,
      source: fixture.source,
      sourceDocumentId: "post",
      documentUrl,
    });

    expect(analyzed.format).toBe(fixture.format);
    expect(analyzed.references).toEqual([
      expect.objectContaining({ referenceId: fixture.referenceId }),
    ]);
  });

  test("maps MDX content types without changing Markdown", () => {
    expect(getDocumentFormatByContentType("text/mdx; charset=utf-8")).toBe(
      "mdx"
    );
    expect(getDocumentFormatByContentType("text/markdown")).toBe("markdown");
  });

  test("analyzes valid MDX frontmatter independently from an invalid body", async () => {
    const analyzed = await analyzeDocumentSource({
      format: "mdx",
      source:
        "---\ntitle: Visible metadata\n---\n<figure><p>Invalid MDX<br></p></figure>\n",
      sourceDocumentId: "post",
      documentUrl,
    });

    expect(getAdaptedDocumentProperties(analyzed)).toEqual({
      title: "Visible metadata",
    });
    expect(
      selectDocumentRepresentation({
        document: analyzed,
        representation: { type: "markdown-body" },
      })
    ).toBe("<figure><p>Invalid MDX<br></p></figure>\n");
  });

  test("assembles and selects JSON representations without losing the format", async () => {
    const analyzed = await analyzeDocumentSource({
      format: "json",
      source: '{"author":{"$ref":"../authors/ada.json"},"title":"Hello"}',
      sourceDocumentId: "post",
      documentUrl,
    });
    const assembled = assembleDocument({
      document: analyzed,
      references: new Map([["#/author", { name: "Ada" }]]),
    });

    expect(assembled).toEqual({
      format: "json",
      value: { author: { name: "Ada" }, title: "Hello" },
    });
    expect(
      selectDocumentRepresentation({
        document: assembled,
        representation: { type: "json", path: ["author", "name"] },
      })
    ).toBe("Ada");
  });

  test("assembles and selects Markdown representations without losing the format", async () => {
    const analyzed = await analyzeDocumentSource({
      format: "markdown",
      source: "---\nauthor:\n  $ref: ../authors/ada.json\n---\n# Hello\n",
      sourceDocumentId: "post",
      documentUrl,
    });
    const assembled = assembleDocument({
      document: analyzed,
      references: new Map([["#frontmatter/author", { name: "Ada" }]]),
    });

    expect(assembled.format).toBe("markdown");
    expect(
      selectDocumentRepresentation({
        document: assembled,
        representation: { type: "markdown-frontmatter" },
      })
    ).toEqual({ author: { name: "Ada" } });
    expect(
      selectDocumentRepresentation({
        document: assembled,
        representation: { type: "markdown-body" },
      })
    ).toBe("# Hello\n");
  });

  test("parses MDX through the shared Markdown data representations", async () => {
    const source =
      '---\ntitle: Hello\n---\n<ws.element ws:name="Hero">Body</ws.element>\n';
    const parsed = await parseDocumentSource({ format: "mdx", source });

    expect(parsed.format).toBe("mdx");
    if (parsed.format !== "mdx") {
      throw new Error("Expected an MDX document");
    }
    expect(parsed.value.body).toBe(
      '<ws.element ws:name="Hero">Body</ws.element>\n'
    );
    expect(
      selectDocumentRepresentation({
        document: parsed,
        representation: { type: "markdown-frontmatter" },
      })
    ).toEqual({ title: "Hello" });
    expect(
      selectDocumentRepresentation({
        document: parsed,
        representation: { type: "markdown-body" },
      })
    ).toBe('<ws.element ws:name="Hero">Body</ws.element>\n');
  });

  test("resolves MDX frontmatter without changing the body", async () => {
    const analyzed = await analyzeDocumentSource({
      format: "mdx",
      source: "---\nauthor:\n  $ref: ../authors/ada.json\n---\n# Hello\n",
      sourceDocumentId: "post",
      documentUrl,
    });
    const assembled = assembleDocument({
      document: analyzed,
      references: new Map([["#frontmatter/author", { name: "Ada" }]]),
    });

    expect(assembled.format).toBe("mdx");
    if (assembled.format !== "mdx") {
      throw new Error("Expected an MDX document");
    }
    expect(assembled.value.frontmatter).toEqual({ author: { name: "Ada" } });
    expect(assembled.value.body).toBe("# Hello\n");
  });
});
