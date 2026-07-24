import { describe, expect, test } from "vitest";
import type { AssetFileDocument } from "@webstudio-is/sdk";
import {
  encodeAssetGraphqlFieldName,
  executeAssetGraphqlQuery,
} from "./graphql";
import {
  compileAssetDetailGraphqlQuery,
  compileAssetListGraphqlQuery,
} from "./graphql-compiler";
import type { AssetResourceContentReader } from "./hydration";
import {
  executeAssetDetailQueryPlan,
  executeAssetListQueryPlan,
} from "./query-plan";
import { computeAssetResourceQueryHash } from "./resource-index";

const assetRevision = `sha256:${"a".repeat(64)}`;
const source = "hello world";
const bytes = new TextEncoder().encode(source);
const documents: AssetFileDocument[] = [
  {
    _id: "alpha",
    _type: "asset.file",
    name: "alpha.md",
    path: "posts/alpha.md",
    key: "alpha",
    extension: "md",
    mimeType: "text/markdown",
    size: bytes.byteLength,
    revision: "asset-alpha",
    contentRef: "content-alpha",
    properties: {
      title: "Alpha",
      "seo-title": "Alpha SEO",
      blocks: [{ heading: "First" }, null, { heading: "Second" }],
    },
  },
];

const read: AssetResourceContentReader = async (_contentRef, range) => {
  const selected =
    range === undefined
      ? bytes
      : bytes.subarray(range.offset, range.offset + range.length);
  return {
    data: {
      async *[Symbol.asyncIterator]() {
        yield selected;
      },
    },
  };
};

describe("asset GraphQL compiler", () => {
  test("compiles a detail operation to the same dependency-free result", async () => {
    const seoTitle = encodeAssetGraphqlFieldName("seo-title");
    const query = `
      query Post($path: String!, $length: Int = 5) {
        post: asset(path: $path) {
          id
          details: properties {
            title
            seo: ${seoTitle}
            blocks { heading }
            raw: _raw
          }
          body: content(mode: RANGE, offset: 0, length: $length) {
            text
            range { offset length total }
          }
        }
      }
    `;
    const compiled = await compileAssetDetailGraphqlQuery({
      documents,
      query,
      assetRevision,
      operationName: "Post",
    });
    const variables = { path: "posts/alpha.md" };
    const direct = await executeAssetGraphqlQuery({
      documents,
      query,
      operationName: "Post",
      variables,
      read,
    });
    const published = await executeAssetDetailQueryPlan({
      plan: compiled,
      documents,
      assetRevision,
      variables,
      read,
    });

    expect(compiled.queryHash).toBe(await computeAssetResourceQueryHash(query));
    expect(direct.errors).toBeUndefined();
    expect(published).toEqual(direct.data);
    expect(published).toEqual({
      post: {
        id: "alpha",
        details: {
          title: "Alpha",
          seo: "Alpha SEO",
          blocks: [{ heading: "First" }, null, { heading: "Second" }],
          raw: documents[0].properties,
        },
        body: {
          text: "hello",
          range: { offset: 0, length: 5, total: bytes.byteLength },
        },
      },
    });
  });

  test("selects a named operation and coerces an integer ID literal", async () => {
    const query = `
      query Other { asset(path: "missing.md") { id } }
      query Selected { asset(id: 7) { path } }
    `;
    const plan = await compileAssetDetailGraphqlQuery({
      documents: [{ ...documents[0], _id: "7" }],
      query,
      assetRevision,
      operationName: "Selected",
    });
    expect(plan.operationName).toBe("Selected");

    await expect(
      executeAssetDetailQueryPlan({
        plan,
        documents: [{ ...documents[0], _id: "7" }],
        assetRevision,
      })
    ).resolves.toEqual({ asset: { path: "posts/alpha.md" } });
    await expect(
      executeAssetDetailQueryPlan({
        plan,
        documents: [{ ...documents[0], _id: "7" }],
        assetRevision,
        operationName: "Other",
      })
    ).rejects.toThrow("operation does not match the published plan");
  });

  test("coerces numeric ID variables and preserves nullable lookup semantics", async () => {
    const query = "query Post($id: ID) { asset(id: $id) { path } }";
    const plan = await compileAssetDetailGraphqlQuery({
      documents: [{ ...documents[0], _id: "7" }],
      query,
      assetRevision,
    });
    const numeric = await executeAssetDetailQueryPlan({
      plan,
      documents: [{ ...documents[0], _id: "7" }],
      assetRevision,
      variables: { id: 7 },
    });
    const nullable = await executeAssetDetailQueryPlan({
      plan,
      documents,
      assetRevision,
      variables: { id: null },
    });

    expect(numeric).toEqual({ asset: { path: "posts/alpha.md" } });
    expect(nullable).toEqual({ asset: null });
  });

  test("compiles filters, ordering, pagination, and connection metadata", async () => {
    const listDocuments: AssetFileDocument[] = [
      {
        ...documents[0],
        properties: {
          ...documents[0].properties,
          draft: false,
          publishedAt: "2025-01-01",
          tags: ["news"],
        },
      },
      {
        ...documents[0],
        _id: "beta",
        name: "beta.md",
        path: "posts/beta.md",
        properties: {
          title: "Beta",
          draft: true,
          publishedAt: "2026-01-01",
          tags: ["private"],
        },
      },
      {
        ...documents[0],
        _id: "gamma",
        name: "gamma.md",
        path: "posts/gamma.md",
        properties: {
          title: "Gamma",
          draft: false,
          publishedAt: "2024-01-01",
          tags: ["news", "release"],
        },
      },
    ];
    const query = `
      query Posts(
        $draft: Boolean!
        $tag: String!
        $first: Int!
        $skip: Int!
        $direction: AssetOrderDirection = DESC
      ) {
        posts: assets(
          where: {
            properties: {
              draft: { eq: $draft }
              tags: { contains: $tag }
            }
          }
          orderBy: [{
            field: PROPERTIES_publishedAt
            direction: $direction
          }]
          first: $first
          skip: $skip
        ) {
          total: totalCount
          hasMore
          entries: items { id properties { title publishedAt } }
        }
      }
    `;
    const variables = { draft: false, tag: "news", first: 1, skip: 0 };
    const plan = await compileAssetListGraphqlQuery({
      documents: listDocuments,
      query,
      assetRevision,
    });
    const direct = await executeAssetGraphqlQuery({
      documents: listDocuments,
      query,
      variables,
    });
    const published = await executeAssetListQueryPlan({
      plan,
      documents: listDocuments,
      assetRevision,
      variables,
    });

    expect(direct.errors).toBeUndefined();
    expect(published).toEqual(direct.data);
    expect(published).toEqual({
      posts: {
        total: 2,
        hasMore: true,
        entries: [
          {
            id: "alpha",
            properties: { title: "Alpha", publishedAt: "2025-01-01" },
          },
        ],
      },
    });
  });

  test("bounds concurrent content reads in compiled list plans", async () => {
    const contentDocuments = Array.from({ length: 12 }, (_, index) => ({
      ...documents[0],
      _id: String(index),
      name: `${index}.md`,
      path: `posts/${index}.md`,
    }));
    let activeReads = 0;
    let maximumActiveReads = 0;
    const delayedRead: AssetResourceContentReader = async () => {
      activeReads += 1;
      maximumActiveReads = Math.max(maximumActiveReads, activeReads);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeReads -= 1;
      return {
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
      };
    };
    const query = "{ assets(first: 12) { items { id content { text } } } }";
    const plan = await compileAssetListGraphqlQuery({
      documents: contentDocuments,
      query,
      assetRevision,
    });

    const result = await executeAssetListQueryPlan({
      plan,
      documents: contentDocuments,
      assetRevision,
      read: delayedRead,
    });

    const connection = result.assets as {
      items: Array<{ id: string; content: { text: string } }>;
    };
    expect(connection.items).toHaveLength(12);
    expect(connection.items[0]).toEqual({
      id: "0",
      content: { text: source },
    });
    expect(maximumActiveReads).toBeLessThanOrEqual(8);
  });

  test("applies GraphQL defaults when optional variables are omitted", async () => {
    const optionalDocuments = [
      documents[0],
      {
        ...documents[0],
        _id: "beta",
        path: "posts/beta.md",
        properties: { ...documents[0].properties, title: "Beta" },
      },
    ];
    const query = `
      query Posts(
        $tag: JSON
        $direction: AssetOrderDirection
        $first: Int
        $mode: AssetContentMode
      ) {
        assets(
          where: { properties: { blocks: { contains: $tag } } }
          orderBy: [{ field: ID, direction: $direction }]
          first: $first
        ) {
          items { id content(mode: $mode) { text } }
        }
      }
    `;
    const plan = await compileAssetListGraphqlQuery({
      documents: optionalDocuments,
      query,
      assetRevision,
    });
    const direct = await executeAssetGraphqlQuery({
      documents: optionalDocuments,
      query,
      read,
    });
    const published = await executeAssetListQueryPlan({
      plan,
      documents: optionalDocuments,
      assetRevision,
      read,
    });

    expect(direct.errors).toBeUndefined();
    expect(published).toEqual(direct.data);
  });

  test("rejects an explicit null ordering direction", async () => {
    const query = `{
      assets(orderBy: [{ field: ID, direction: null }]) {
        items { id }
      }
    }`;
    const direct = await executeAssetGraphqlQuery({ documents, query });

    expect(direct.errors?.[0]?.message).toContain(
      'Expected value of type "AssetOrderDirection!"'
    );
    await expect(
      compileAssetListGraphqlQuery({ documents, query, assetRevision })
    ).rejects.toThrow("AssetOrderDirection!");
  });

  test("rejects content arguments that conflict after variable resolution", async () => {
    const query = `query Post($mode: AssetContentMode!, $offset: Int) {
      asset(path: "posts/alpha.md") {
        content(mode: $mode, offset: $offset) { text }
      }
    }`;
    const plan = await compileAssetDetailGraphqlQuery({
      documents,
      query,
      assetRevision,
    });
    const variables = { mode: "FULL", offset: 0 };
    const direct = await executeAssetGraphqlQuery({
      documents,
      query,
      variables,
      read,
    });

    expect(direct.errors?.[0]?.message).toBe(
      "Asset content arguments are invalid"
    );
    await expect(
      executeAssetDetailQueryPlan({
        plan,
        documents,
        assetRevision,
        variables,
        read,
      })
    ).rejects.toThrow("Compiled asset content arguments are invalid");
  });

  test.each([
    {
      name: "list roots",
      query: "{ assets { items { id } } }",
      error: "asset root field",
    },
    {
      name: "fragments",
      query:
        'query { asset(id: "alpha") { ...Fields } } fragment Fields on AssetFile { id }',
      error: "fragments",
    },
    {
      name: "directives",
      query: '{ asset(id: "alpha") { id @include(if: true) } }',
      error: "directives",
    },
    {
      name: "duplicate response keys",
      query: '{ asset(id: "alpha") { id id } }',
      error: "selected more than once",
    },
  ])("rejects unsupported $name", async ({ query, error }) => {
    await expect(
      compileAssetDetailGraphqlQuery({ documents, query, assetRevision })
    ).rejects.toThrow(error);
  });

  test("rejects an invalid asset revision during compilation", async () => {
    await expect(
      compileAssetDetailGraphqlQuery({
        documents,
        query: '{ asset(id: "alpha") { id } }',
        assetRevision: "current",
      })
    ).rejects.toThrow("revision is invalid");
  });
});
