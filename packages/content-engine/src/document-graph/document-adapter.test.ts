import { describe, expect, test } from "vitest";
import {
  analyzeDocumentSource,
  assembleDocument,
  selectDocumentRepresentation,
} from "./document-adapter";

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
});
