import { describe, expect, test } from "vitest";
import { createDocumentReference } from "./reference";

describe("document reference", () => {
  test("creates an immutable normalized reference", () => {
    const reference = createDocumentReference({
      documentId: "author",
      revision: "sha256:author",
      representation: { type: "json", path: ["profile", "name"] },
    });

    expect(reference).toEqual({
      documentId: "author",
      revision: "sha256:author",
      representation: { type: "json", path: ["profile", "name"] },
    });
    expect(Object.isFrozen(reference)).toBe(true);
    expect(Object.isFrozen(reference.representation)).toBe(true);
    expect(reference.representation.type).toBe("json");
    if (reference.representation.type === "json") {
      expect(Object.isFrozen(reference.representation.path)).toBe(true);
    }
  });

  test.each([
    {
      documentId: "",
      revision: "sha256:author",
      representation: { type: "document" },
    },
    {
      documentId: "author",
      revision: "",
      representation: { type: "document" },
    },
    {
      documentId: "author",
      revision: "sha256:author",
      representation: { type: "json", path: ["profile", 0] },
    },
    {
      documentId: "author",
      revision: "sha256:author",
      representation: { type: "json", path: [] },
    },
  ])("rejects an invalid normalized reference", (reference) => {
    expect(() => createDocumentReference(reference)).toThrow();
  });
});
