import { describe, expect, test } from "vitest";
import {
  createCanonicalAssetFileEntry,
  getFieldContributions,
  normalizeAssetFileDocument,
} from "./canonical";

const asset = {
  id: "asset-1",
  name: "Hello.World.MD",
  folderId: "folder-blog",
  folderNames: ["content", "blog"],
  mimeType: "text/markdown",
  size: 420,
  revision: "sha256:content",
  contentRef: "private:asset-1:sha256:content",
};

describe("normalizeAssetFileDocument", () => {
  test("derives normalized standard metadata", () => {
    expect(
      normalizeAssetFileDocument({
        asset,
        properties: { title: "Hello" },
        excerpt: "Introduction",
      })
    ).toEqual({
      _id: "asset-1",
      _type: "asset.file",
      name: "Hello.World.MD",
      path: "content/blog/Hello.World.MD",
      key: "Hello.World",
      folderId: "folder-blog",
      extension: "md",
      mimeType: "text/markdown",
      size: 420,
      revision: "sha256:content",
      contentRef: "private:asset-1:sha256:content",
      properties: { title: "Hello" },
      excerpt: "Introduction",
    });
  });

  test("keeps colliding frontmatter keys inside properties", () => {
    const document = normalizeAssetFileDocument({
      asset,
      properties: {
        _id: "frontmatter-id",
        name: "frontmatter.md",
        revision: "frontmatter-revision",
        path: "other/path.md",
      },
    });

    expect(document._id).toBe("asset-1");
    expect(document.name).toBe("Hello.World.MD");
    expect(document.revision).toBe("sha256:content");
    expect(document.properties).toEqual({
      _id: "frontmatter-id",
      name: "frontmatter.md",
      revision: "frontmatter-revision",
      path: "other/path.md",
    });
  });

  test.each(["", ".", "..", "nested/name", "nested\\name"])(
    "rejects invalid path segment %j",
    (name) => {
      expect(() =>
        normalizeAssetFileDocument({
          asset: { ...asset, name },
          properties: {},
        })
      ).toThrow("one normalized path segment");
    }
  );

  test("rejects JSON-incompatible property values", () => {
    expect(() =>
      normalizeAssetFileDocument({
        asset,
        properties: { publishedAt: new Date() },
      })
    ).toThrow();
  });

  test("requires folder identity and path together", () => {
    expect(() =>
      normalizeAssetFileDocument({
        asset: { ...asset, folderNames: undefined },
        properties: {},
      })
    ).toThrow("provided together");
    expect(() =>
      normalizeAssetFileDocument({
        asset: { ...asset, folderId: undefined },
        properties: {},
      })
    ).toThrow("provided together");
  });

  test("normalizes root assets without a folder field", () => {
    const document = normalizeAssetFileDocument({
      asset: { ...asset, folderId: undefined, folderNames: undefined },
      properties: {},
    });
    expect(document.path).toBe("Hello.World.MD");
    expect(document).not.toHaveProperty("folderId");
  });
});

describe("field contributions", () => {
  test("records deterministic nested paths and mixed array element types", () => {
    expect(
      getFieldContributions({
        title: "Post",
        author: { name: "Oleg", social: { active: true } },
        authors: [{ name: "Ada" }, { name: "Ben" }, "Guest"],
        ratings: [5, null, 4],
      })
    ).toEqual([
      { path: "properties.author", type: "object" },
      { path: "properties.author.name", type: "string" },
      { path: "properties.author.social", type: "object" },
      { path: "properties.author.social.active", type: "boolean" },
      { path: "properties.authors", type: "array" },
      { path: "properties.authors[]", type: "object" },
      { path: "properties.authors[]", type: "string" },
      { path: "properties.authors[].name", type: "string" },
      { path: "properties.ratings", type: "array" },
      { path: "properties.ratings[]", type: "null" },
      { path: "properties.ratings[]", type: "number" },
      { path: "properties.title", type: "string" },
    ]);
  });

  test("deduplicates repeated types within one file", () => {
    expect(getFieldContributions({ tags: ["one", "two", "three"] })).toEqual([
      { path: "properties.tags", type: "array" },
      { path: "properties.tags[]", type: "string" },
    ]);
  });

  test("uses unambiguous GROQ paths for non-identifier property names", () => {
    expect(
      getFieldContributions({
        "author.name": "literal dot",
        "publish-date": "2026-07-18",
        nested: { "display name": "Oleg" },
      })
    ).toEqual([
      { path: "properties.nested", type: "object" },
      { path: 'properties.nested["display name"]', type: "string" },
      { path: 'properties["author.name"]', type: "string" },
      { path: 'properties["publish-date"]', type: "string" },
    ]);
  });

  test("stores the contribution on the canonical entry", () => {
    const document = normalizeAssetFileDocument({
      asset,
      properties: { author: { name: "Oleg" } },
    });
    expect(
      createCanonicalAssetFileEntry({ projectId: "project-1", document })
        .fieldContributions
    ).toEqual([
      { path: "properties.author", type: "object" },
      { path: "properties.author.name", type: "string" },
    ]);
  });
});
