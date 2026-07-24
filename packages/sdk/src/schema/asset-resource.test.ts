import { describe, expect, test } from "vitest";
import { assetFileDocument, builderAssetFieldCatalog } from "./asset-resource";

const document = {
  _id: "asset-1",
  _type: "asset.file" as const,
  name: "hello-world.md",
  path: "blog/hello-world.md",
  key: "hello-world",
  folderId: "blog-folder",
  extension: "md",
  mimeType: "text/markdown",
  size: 4280,
  revision: "sha256:content-hash",
  contentRef: "asset-1/sha256:content-hash",
  properties: {
    title: "Hello world",
    draft: false,
    author: { name: "Oleg" },
    tags: ["news", "release"],
  },
  excerpt: "The beginning of the article...",
};

describe("assetFileDocument", () => {
  test("accepts a schema-less Markdown document", () => {
    expect(assetFileDocument.parse(document)).toEqual(document);
  });

  test("accepts a root asset without optional Markdown fields", () => {
    const {
      excerpt: _excerpt,
      folderId: _folderId,
      ...rootDocument
    } = document;

    expect(assetFileDocument.parse(rootDocument)).toEqual(rootDocument);
  });

  test.each([
    "/blog/post.md",
    "blog/../post.md",
    "./post.md",
    "blog//post.md",
    "blog\\post.md",
  ])("rejects unsafe path %s", (path) => {
    expect(assetFileDocument.safeParse({ ...document, path }).success).toBe(
      false
    );
  });

  test("rejects non-JSON frontmatter values", () => {
    expect(
      assetFileDocument.safeParse({
        ...document,
        properties: { publishedAt: new Date() },
      }).success
    ).toBe(false);
  });
});

describe("builderAssetFieldCatalog", () => {
  test("accepts the compact versioned Builder representation", () => {
    const catalog = {
      format: "webstudio-builder-asset-field-catalog" as const,
      version: 1 as const,
      canonicalRevision: `sha256:${"a".repeat(64)}`,
      documentCount: 2,
      fields: {
        name: { types: ["string" as const], occurrences: 2 },
        "properties.title": {
          types: ["number" as const, "string" as const],
          occurrences: 1,
          optional: true as const,
          mixed: true as const,
        },
      },
    };
    expect(builderAssetFieldCatalog.parse(catalog)).toEqual(catalog);
  });

  test("rejects invalid revisions and non-compact false flags", () => {
    expect(
      builderAssetFieldCatalog.safeParse({
        format: "webstudio-builder-asset-field-catalog",
        version: 1,
        canonicalRevision: "revision-1",
        documentCount: 0,
        fields: {},
      }).success
    ).toBe(false);
    expect(
      builderAssetFieldCatalog.safeParse({
        format: "webstudio-builder-asset-field-catalog",
        version: 1,
        canonicalRevision: `sha256:${"a".repeat(64)}`,
        documentCount: 1,
        fields: {
          name: {
            types: ["string"],
            occurrences: 1,
            optional: false,
          },
        },
      }).success
    ).toBe(false);
  });

  test("rejects contradictory occurrence, optional, and mixed metadata", () => {
    const base = {
      format: "webstudio-builder-asset-field-catalog",
      version: 1,
      canonicalRevision: `sha256:${"a".repeat(64)}`,
      documentCount: 1,
    };
    expect(
      builderAssetFieldCatalog.safeParse({
        ...base,
        fields: {
          name: { types: ["string"], occurrences: 2 },
        },
      }).success
    ).toBe(false);
    expect(
      builderAssetFieldCatalog.safeParse({
        ...base,
        documentCount: 2,
        fields: {
          name: { types: ["string"], occurrences: 1 },
        },
      }).success
    ).toBe(false);
    expect(
      builderAssetFieldCatalog.safeParse({
        ...base,
        fields: {
          name: { types: ["string", "number"], occurrences: 1 },
        },
      }).success
    ).toBe(false);
  });
});
