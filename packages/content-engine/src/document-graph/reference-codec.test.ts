import { describe, expect, test } from "vitest";
import {
  parseSourceDocumentReference,
  serializeSourceDocumentReference,
} from "./reference-codec";

const baseUrl = "https://content.webstudio.test/posts/hello.json";

describe("source document reference codec", () => {
  test("resolves a relative document and decodes an RFC 6901 JSON Pointer", () => {
    const reference = parseSourceDocumentReference({
      value: "../authors/ada.json#/profile/display~1name",
      baseUrl,
    });

    expect(reference).toEqual({
      documentUrl: "https://content.webstudio.test/authors/ada.json",
      representation: {
        type: "json",
        path: ["profile", "display/name"],
      },
    });
    expect(Object.isFrozen(reference)).toBe(true);
    expect(Object.isFrozen(reference.representation)).toBe(true);
  });

  test("supports URI-encoded JSON Pointer fragments", () => {
    expect(
      parseSourceDocumentReference({
        value: "../authors/ada.json#%2Fprofile%2Fdisplay%20name",
        baseUrl,
      }).representation
    ).toEqual({ type: "json", path: ["profile", "display name"] });
  });

  test.each([
    ["../about.md", { type: "document" }],
    ["../about.md#body", { type: "markdown-body" }],
    ["../about.md#frontmatter", { type: "markdown-frontmatter" }],
  ])("parses the representation in %s", (value, representation) => {
    expect(parseSourceDocumentReference({ value, baseUrl })).toEqual({
      documentUrl: "https://content.webstudio.test/about.md",
      representation,
    });
  });

  test("resolves a same-document reference without retaining the base fragment", () => {
    expect(
      parseSourceDocumentReference({
        value: "#/author/name",
        baseUrl: `${baseUrl}#body`,
      })
    ).toEqual({
      documentUrl: baseUrl,
      representation: { type: "json", path: ["author", "name"] },
    });
  });

  test("serializes references canonically and round trips them", () => {
    const reference = parseSourceDocumentReference({
      value: "../authors/ada.json#/profile/display~1name",
      baseUrl,
    });
    const serialized = serializeSourceDocumentReference(reference);

    expect(serialized).toBe(
      "https://content.webstudio.test/authors/ada.json#%2Fprofile%2Fdisplay~1name"
    );
    expect(
      parseSourceDocumentReference({ value: serialized, baseUrl })
    ).toEqual(reference);
    expect(
      serializeSourceDocumentReference({
        documentUrl: "https://content.webstudio.test/about.md",
        representation: { type: "markdown-body" },
      })
    ).toBe("https://content.webstudio.test/about.md#body");
  });

  test.each([
    ["../about.md#unknown", "INVALID_FRAGMENT"],
    ["../author.json#/invalid~2escape", "INVALID_JSON_POINTER"],
    ["../author.json#%E0%A4%A", "INVALID_FRAGMENT_ENCODING"],
  ])("rejects invalid reference %s", (value, code) => {
    expect(() => parseSourceDocumentReference({ value, baseUrl })).toThrowError(
      expect.objectContaining({ code })
    );
  });

  test("rejects a relative base URL", () => {
    expect(() =>
      parseSourceDocumentReference({
        value: "author.json",
        baseUrl: "posts/hello.json",
      })
    ).toThrowError(expect.objectContaining({ code: "INVALID_BASE_URL" }));
  });

  test("rejects a non-string authored reference", () => {
    expect(() =>
      parseSourceDocumentReference({ value: 42, baseUrl })
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_REFERENCE_URL", value: 42 })
    );
  });
});
