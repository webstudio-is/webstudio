import { describe, expect, test } from "vitest";
import {
  analyzeJsonDocument,
  assembleJsonDocument,
  JsonDocumentError,
  selectJsonDocumentRepresentation,
} from "./json-document";

const documentUrl = "https://content.webstudio.test/posts/hello.json";

describe("JSON document adapter", () => {
  test("finds exact reference markers with stable JSON Pointer IDs", () => {
    const value = {
      title: "Hello",
      author: { $ref: "../authors/ada.json#/name" },
      blocks: [{ $ref: "../shared/cta.md#body" }],
      metadata: { $ref: "ordinary-data", label: "Not a reference marker" },
      "escaped/key~": { $ref: "../shared/value.json" },
    };

    const analyzed = analyzeJsonDocument({
      value,
      sourceDocumentId: "post",
      documentUrl,
    });

    expect(analyzed.document).toEqual(value);
    expect(analyzed.references).toEqual([
      {
        sourceDocumentId: "post",
        referenceId: "#/author",
        reference: {
          documentUrl: "https://content.webstudio.test/authors/ada.json",
          representation: { type: "json", path: ["name"] },
        },
      },
      {
        sourceDocumentId: "post",
        referenceId: "#/blocks/0",
        reference: {
          documentUrl: "https://content.webstudio.test/shared/cta.md",
          representation: { type: "markdown-body" },
        },
      },
      {
        sourceDocumentId: "post",
        referenceId: "#/escaped~1key~0",
        reference: {
          documentUrl: "https://content.webstudio.test/shared/value.json",
          representation: { type: "document" },
        },
      },
    ]);
  });

  test("supports a reference marker as the document root", () => {
    expect(
      analyzeJsonDocument({
        value: { $ref: "../shared/value.json" },
        sourceDocumentId: "post",
        documentUrl,
      }).references[0]
    ).toMatchObject({ referenceId: "#" });
  });

  test("reports an invalid exact reference marker with its location", () => {
    expect(() =>
      analyzeJsonDocument({
        value: { author: { $ref: 42 } },
        sourceDocumentId: "post",
        documentUrl,
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_REFERENCE_MARKER",
        referenceId: "#/author",
      } satisfies Partial<JsonDocumentError>)
    );
  });

  test("selects the whole document or a nested JSON path", () => {
    const document = {
      author: { "display/name": "Ada" },
    };

    expect(
      selectJsonDocumentRepresentation({
        document,
        representation: { type: "document" },
      })
    ).toEqual(document);
    expect(
      selectJsonDocumentRepresentation({
        document,
        representation: {
          type: "json",
          path: ["author", "display/name"],
        },
      })
    ).toBe("Ada");
  });

  test("reports missing paths and unsupported representations", () => {
    expect(() =>
      selectJsonDocumentRepresentation({
        document: { author: {} },
        representation: { type: "json", path: ["author", "name"] },
      })
    ).toThrowError(expect.objectContaining({ code: "JSON_PATH_NOT_FOUND" }));
    expect(() =>
      selectJsonDocumentRepresentation({
        document: {},
        representation: { type: "markdown-body" },
      })
    ).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_REPRESENTATION" })
    );
  });

  test("assembles nested references without mutating the source document", () => {
    const document = {
      title: "Hello",
      author: { $ref: "../authors/ada.json" },
      blocks: [{ $ref: "../shared/cta.md#body" }],
    };
    const result = assembleJsonDocument({
      document,
      references: new Map<string, unknown>([
        ["#/author", { name: "Ada" }],
        ["#/blocks/0", "Join us"],
      ]),
    });

    expect(result).toEqual({
      title: "Hello",
      author: { name: "Ada" },
      blocks: ["Join us"],
    });
    expect(document).toEqual({
      title: "Hello",
      author: { $ref: "../authors/ada.json" },
      blocks: [{ $ref: "../shared/cta.md#body" }],
    });
  });

  test("requires every marker and supplied reference to participate", () => {
    expect(() =>
      assembleJsonDocument({
        document: { author: { $ref: "../authors/ada.json" } },
        references: new Map(),
      })
    ).toThrowError(
      expect.objectContaining({
        code: "REFERENCE_NOT_FOUND",
        referenceId: "#/author",
      })
    );
    expect(() =>
      assembleJsonDocument({
        document: {},
        references: new Map([["#/unused", "value"]]),
      })
    ).toThrowError(
      expect.objectContaining({
        code: "UNUSED_REFERENCE",
        referenceId: "#/unused",
      })
    );
  });
});
