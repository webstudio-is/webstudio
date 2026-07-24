import { describe, expect, test } from "vitest";
import {
  assetFileDocument,
  assetResourceIndexV1,
  assetResourceIndexStatus,
  assetResourceLimits,
  assetResourceQueryRequest,
  assetResourceQueryResponse,
  assetResourceQuerySuccess,
  builderAssetFieldCatalog,
} from "./asset-resource";

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

describe("assetResourceIndexV1", () => {
  const index = {
    format: "webstudio-resource-index" as const,
    version: 1 as const,
    resourceId: "resource-1",
    queryHash: `sha256:${"a".repeat(64)}`,
    assetRevision: `sha256:${"b".repeat(64)}`,
    plan: {
      format: "webstudio-asset-query-plan",
      version: 1,
      kind: "asset-list",
      queryHash: `sha256:${"a".repeat(64)}`,
      assetRevision: `sha256:${"b".repeat(64)}`,
      rootResponseKey: "assets",
      variables: [{ name: "locale" }, { name: "slug" }],
      orderBy: [],
      first: 100,
      skip: 0,
      fields: [],
    },
    documents: [document],
    integrity: {
      algorithm: "sha256" as const,
      checksum: `sha256:${"c".repeat(64)}`,
    },
  };

  test("accepts a bounded versioned index", () => {
    expect(assetResourceIndexV1.parse(index)).toEqual(index);
  });

  test("requires deterministic document ordering", () => {
    expect(
      assetResourceIndexV1.safeParse({
        ...index,
        documents: [
          { ...document, _id: "two" },
          { ...document, _id: "one" },
        ],
      }).success
    ).toBe(false);
  });
});

describe("assetResourceIndexStatus", () => {
  const status = {
    resourceId: "posts",
    state: "active" as const,
    queryHash: `sha256:${"a".repeat(64)}`,
    assetRevision: `sha256:${"b".repeat(64)}`,
    activeRevision: `sha256:${"c".repeat(64)}`,
    updatedAt: "2026-07-18T12:00:00.000Z",
  };

  test("accepts active and rebuilding states with an active revision", () => {
    expect(assetResourceIndexStatus.parse(status)).toEqual(status);
    expect(
      assetResourceIndexStatus.parse({ ...status, state: "indexing" })
    ).toEqual({ ...status, state: "indexing" });
  });

  test("requires an active revision for the active state", () => {
    const { activeRevision: _activeRevision, ...invalid } = status;
    expect(assetResourceIndexStatus.safeParse(invalid).success).toBe(false);
  });
});

describe("assetResourceQueryRequest", () => {
  test("defaults to no variables", () => {
    expect(
      assetResourceQueryRequest.parse({ query: "{ assets { totalCount } }" })
    ).toEqual({
      query: "{ assets { totalCount } }",
      variables: {},
    });
  });

  test("accepts JSON variables, an operation name, and a pinned index", () => {
    const request = {
      query: "query Post($slug: String!) { assets { items { id } } }",
      variables: { slug: "hello-world", locale: { language: "en" } },
      operationName: "Post",
      indexRevision: "index-7",
    };

    expect(assetResourceQueryRequest.parse(request)).toEqual(request);
  });

  test.each(["slug-value", "$slug", "0slug"])(
    "rejects invalid variable name %s",
    (name) => {
      expect(
        assetResourceQueryRequest.safeParse({
          query: "{ assets { totalCount } }",
          variables: { [name]: "value" },
        }).success
      ).toBe(false);
    }
  );

  test("measures query and variable limits as serialized UTF-8", () => {
    expect(
      assetResourceQueryRequest.safeParse({
        query: "😀".repeat(assetResourceLimits.queryBytes / 2),
      }).success
    ).toBe(false);
    expect(
      assetResourceQueryRequest.safeParse({
        query: "{ assets { totalCount } }",
        variables: {
          value: "😀".repeat(assetResourceLimits.variableBytes / 2),
        },
      }).success
    ).toBe(false);
  });
});

describe("assetResourceQuerySuccess", () => {
  test("returns GraphQL data with immutable index metadata", () => {
    const response = {
      ok: true as const,
      data: { asset: { id: "asset-1", title: "Hello world" } },
      meta: {
        queryHash: "sha256:query-hash",
        indexRevision: "index-7",
        assetRevision: "asset-revision-12",
      },
    };

    expect(assetResourceQuerySuccess.parse(response)).toEqual(response);
  });
});

describe("assetResourceQueryResponse", () => {
  test("accepts a structured retryable stale-index error", () => {
    const response = {
      ok: false as const,
      error: {
        code: "STALE_INDEX" as const,
        message: "The active index does not match the asset revision.",
        retryable: true,
        details: { expectedAssetRevision: "asset-revision-13" },
      },
      meta: {
        queryHash: "sha256:query-hash",
        indexRevision: "index-7",
        assetRevision: "asset-revision-12",
      },
    };

    expect(assetResourceQueryResponse.parse(response)).toEqual(response);
  });
});
