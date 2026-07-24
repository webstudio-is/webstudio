import { printSchema } from "graphql";
import { describe, expect, test } from "vitest";
import {
  assetResourceLimits,
  type AssetFileDocument,
  type BuilderAssetFieldCatalog,
} from "@webstudio-is/sdk";
import {
  createAssetGraphqlSchema,
  createAssetGraphqlSchemaFromCatalog,
  createAssetGraphqlExecutor,
  decodeAssetGraphqlFieldName,
  encodeAssetGraphqlFieldName,
  executeAssetGraphqlQuery,
} from "./graphql";
import type { AssetResourceContentReader } from "./hydration";

const document = ({
  id,
  properties,
  excerpt,
}: {
  id: string;
  properties: AssetFileDocument["properties"];
  excerpt?: string;
}): AssetFileDocument => ({
  _id: id,
  _type: "asset.file",
  name: `${id}.md`,
  path: `posts/${id}.md`,
  key: id,
  extension: "md",
  mimeType: "text/markdown",
  size: 100,
  revision: `revision-${id}`,
  contentRef: `stored-${id}.md`,
  properties,
  excerpt,
});

const documents = [
  document({
    id: "alpha",
    excerpt: "Alpha excerpt",
    properties: {
      title: "Alpha",
      publishedAt: "2025-01-01",
      draft: false,
      tags: ["news", "alpha"],
      author: { name: "Ada" },
      rating: 5,
      "seo-title": "Alpha SEO",
    },
  }),
  document({
    id: "beta",
    properties: {
      title: "Beta",
      publishedAt: "2024-01-01",
      draft: true,
      tags: ["private"],
      author: { name: "Ben" },
      rating: "unrated",
    },
  }),
  document({
    id: "gamma",
    properties: {
      title: "Gamma",
      publishedAt: "2026-01-01",
      tags: ["news"],
      author: { name: "Grace" },
      rating: 4.5,
    },
  }),
];

describe("asset GraphQL", () => {
  test("generates introspectable dynamic fields from frontmatter", () => {
    const schema = printSchema(createAssetGraphqlSchema(documents));
    const encodedSeoTitle = encodeAssetGraphqlFieldName("seo-title");

    expect(schema).toContain("type AssetProperties");
    expect(schema).toContain("title: String");
    expect(schema).toContain("publishedAt: String");
    expect(schema).toContain("author: AssetProperties_author");
    expect(schema).toContain("rating: JSON");
    expect(schema).toContain(`${encodedSeoTitle}: String`);
    expect(schema).toContain("Original field: seo-title");
    expect(schema).toContain("_raw: JSON!");

    const expandedSchema = printSchema(
      createAssetGraphqlSchema(
        documents.map((item) => ({
          ...item,
          properties: { aaa: { value: true }, ...item.properties },
        }))
      )
    );
    expect(expandedSchema).toContain("author: AssetProperties_author");
  });

  test("reconstructs the dynamic editor schema from the compact catalog", () => {
    const catalog: BuilderAssetFieldCatalog = {
      format: "webstudio-builder-asset-field-catalog",
      version: 1,
      canonicalRevision: `sha256:${"a".repeat(64)}`,
      documentCount: 2,
      fields: {
        properties: { types: ["object"], occurrences: 2 },
        "properties.title": { types: ["string"], occurrences: 2 },
        'properties["seo-title"]': {
          types: ["string"],
          occurrences: 1,
          optional: true,
        },
        "properties.authors": { types: ["array"], occurrences: 2 },
        "properties.authors[]": { types: ["object"], occurrences: 2 },
        "properties.authors[].name": {
          types: ["string"],
          occurrences: 2,
        },
      },
    };
    const schema = printSchema(createAssetGraphqlSchemaFromCatalog(catalog));

    expect(schema).toContain("title: String");
    expect(schema).toContain(
      `${encodeAssetGraphqlFieldName("seo-title")}: String`
    );
    expect(schema).toContain("authors: [AssetProperties_authors]");
    expect(schema).toContain("name: String");
  });

  test("keeps colliding flat and nested sort paths distinct", () => {
    const schema = printSchema(
      createAssetGraphqlSchema([
        document({
          id: "collision",
          properties: { foo_bar: "flat", foo: { bar: "nested" } },
        }),
      ])
    );

    expect(schema).toContain("PROPERTIES_foo_bar");
    expect(schema).toContain("PROPERTIES_N_3_foo_3_bar");
  });

  test("maps arbitrary JSON keys to stable reversible GraphQL names", () => {
    for (const name of [
      "title",
      "seo-title",
      "9lives",
      "__typename",
      "_raw",
      "exists",
      "_ws_reserved",
      "emoji-😀",
      "",
    ]) {
      expect(
        decodeAssetGraphqlFieldName(encodeAssetGraphqlFieldName(name))
      ).toBe(name);
    }
    expect(encodeAssetGraphqlFieldName("title")).toBe("title");
    expect(encodeAssetGraphqlFieldName("seo-title")).not.toBe("seo-title");
  });

  test("filters, orders, limits, skips, and projects blog records", async () => {
    const result = await executeAssetGraphqlQuery({
      documents,
      query: `
        query Posts($draft: Boolean!, $first: Int!, $skip: Int!) {
          assets(
            where: {
              extension: { eq: "md" }
              properties: { draft: { ne: $draft }, tags: { contains: "news" } }
            }
            orderBy: [{ field: PROPERTIES_publishedAt, direction: DESC }]
            first: $first
            skip: $skip
          ) {
            totalCount
            items {
              id
              excerpt
              properties {
                title
                draft
                author { name }
                _raw
              }
            }
          }
        }
      `,
      variables: { draft: true, first: 1, skip: 0 },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      assets: {
        totalCount: 2,
        items: [
          {
            id: "gamma",
            excerpt: null,
            properties: {
              title: "Gamma",
              draft: null,
              author: { name: "Grace" },
              _raw: documents[2].properties,
            },
          },
        ],
      },
    });
  });

  test("loads one detail record by path", async () => {
    const result = await executeAssetGraphqlQuery({
      documents,
      query: `
        query Post($path: String!) {
          asset(path: $path) {
            id
            properties { title }
          }
        }
      `,
      variables: { path: "posts/alpha.md" },
    });

    expect(result).toEqual({
      data: {
        asset: {
          id: "alpha",
          properties: { title: "Alpha" },
        },
      },
    });
  });

  test("reads selected detail content in full, body, and range modes", async () => {
    const source = "---\ntitle: Alpha\n---\n# Alpha body\n";
    const bytes = new TextEncoder().encode(source);
    const contentDocument = {
      ...documents[0],
      size: bytes.byteLength,
      contentRef: "content-alpha",
    };
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
        contentLength: selected.byteLength,
      };
    };
    const result = await executeAssetGraphqlQuery({
      documents: [contentDocument],
      read,
      query: `{
        asset(id: "alpha") {
          full: content { encoding text }
          body: content(mode: MARKDOWN_BODY) { text }
          slice: content(mode: RANGE, offset: 0, length: 3) {
            text
            range { offset length total }
          }
        }
      }`,
    });

    expect(result).toEqual({
      data: {
        asset: {
          full: { encoding: "utf-8", text: source },
          body: { text: "# Alpha body\n" },
          slice: {
            text: "---",
            range: { offset: 0, length: 3, total: bytes.byteLength },
          },
        },
      },
    });
  });

  test("bounds and throttles content selected from lists", async () => {
    const bytes = new TextEncoder().encode("x");
    let activeReads = 0;
    let maximumActiveReads = 0;
    const read: AssetResourceContentReader = async () => {
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
        contentLength: bytes.byteLength,
      };
    };
    const contentDocuments = Array.from(
      { length: assetResourceLimits.hydratedFileCount + 1 },
      (_, index) => ({
        ...document({ id: String(index), properties: {} }),
        size: bytes.byteLength,
      })
    );
    const result = await executeAssetGraphqlQuery({
      documents: contentDocuments,
      read,
      query: `{ assets(first: ${contentDocuments.length}) {
        items { content { text } }
      } }`,
    });

    expect(result.errors?.[0]?.message).toContain("hydration limits");
    expect(maximumActiveReads).toBeLessThanOrEqual(
      assetResourceLimits.concurrentContentReads
    );
  });

  test("filters and projects encoded source fields", async () => {
    const field = encodeAssetGraphqlFieldName("seo-title");
    const result = await executeAssetGraphqlQuery({
      documents,
      query: `{
        assets(where: { properties: { ${field}: { eq: "Alpha SEO" } } }) {
          items { properties { ${field} } }
        }
      }`,
    });

    expect(result).toEqual({
      data: {
        assets: {
          items: [{ properties: { [field]: "Alpha SEO" } }],
        },
      },
    });
  });

  test("filters by field existence and reports additional pages", async () => {
    const existenceDocuments = [
      ...documents,
      document({ id: "delta", properties: { title: "Delta" } }),
    ];
    const result = await executeAssetGraphqlQuery({
      documents: existenceDocuments,
      query: `{
        assets(
          where: { properties: { draft: { exists: false } } }
          first: 1
        ) {
          totalCount
          hasMore
          items { id }
        }
      }`,
    });

    expect(result).toEqual({
      data: {
        assets: {
          totalCount: 2,
          hasMore: true,
          items: [{ id: "delta" }],
        },
      },
    });
  });

  test("treats null negation as absent and rejects ambiguous paths", async () => {
    const nullNegation = await executeAssetGraphqlQuery({
      documents,
      query: "{ assets(where: { NOT: null }) { totalCount } }",
    });
    expect(nullNegation).toEqual({
      data: { assets: { totalCount: documents.length } },
    });

    const ambiguous = await executeAssetGraphqlQuery({
      documents: [documents[0], { ...documents[1], path: documents[0].path }],
      query: `{ asset(path: "${documents[0].path}") { id } }`,
    });
    expect(ambiguous.errors?.[0]?.message).toContain("ambiguous");
  });

  test("keeps an empty asset database queryable", async () => {
    const result = await executeAssetGraphqlQuery({
      documents: [],
      query: "{ assets { totalCount items { id properties { _raw } } } }",
    });

    expect(result).toEqual({
      data: { assets: { totalCount: 0, items: [] } },
    });
  });

  test("reuses one generated schema across executions", async () => {
    const executor = createAssetGraphqlExecutor(documents);

    await expect(
      executor.execute({ query: "{ assets(first: 1) { items { id } } }" })
    ).resolves.toEqual({
      data: { assets: { items: [{ id: "alpha" }] } },
    });
    await expect(
      executor.execute({ query: '{ asset(id: "beta") { id } }' })
    ).resolves.toEqual({ data: { asset: { id: "beta" } } });
  });

  test("rejects pagination outside runtime limits", async () => {
    const result = await executeAssetGraphqlQuery({
      documents,
      query: "{ assets(first: 1001) { totalCount } }",
    });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toContain("pagination");
  });

  test("rejects repeated data scans in one operation", async () => {
    const result = await executeAssetGraphqlQuery({
      documents,
      query: `{
        first: assets(first: 1) { totalCount }
        second: assets(first: 1) { totalCount }
      }`,
    });

    expect(result.errors?.[0]?.message).toContain("too many data scans");
  });

  test("enforces query, variable, document, and response limits", async () => {
    const oversizedQuery = await executeAssetGraphqlQuery({
      documents,
      query: `#${"é".repeat(assetResourceLimits.queryBytes / 2 + 1)}`,
    });
    expect(oversizedQuery.errors?.[0]?.message).toContain("byte limit");

    const oversizedVariables = await executeAssetGraphqlQuery({
      documents,
      query: "query Posts($value: String) { assets { totalCount } }",
      variables: { value: "x".repeat(assetResourceLimits.variableBytes) },
    });
    expect(oversizedVariables.errors?.[0]?.message).toContain(
      "variables exceed"
    );

    const nonJsonVariables = await executeAssetGraphqlQuery({
      documents,
      query: "query Posts($value: JSON) { assets { totalCount } }",
      variables: { value: () => undefined },
    });
    expect(nonJsonVariables.errors?.[0]?.message).toContain(
      "JSON serializable"
    );

    const tooManyDefinitions = await executeAssetGraphqlQuery({
      documents,
      query: `query TooMany(${Array.from(
        { length: assetResourceLimits.variableCount + 1 },
        (_, index) => `$value${index}: String`
      ).join(", ")}) { assets { totalCount } }`,
    });
    expect(tooManyDefinitions.errors?.[0]?.message).toContain(
      "syntax-tree limits"
    );

    const oversizedDocuments = await executeAssetGraphqlQuery({
      documents: Array.from(
        { length: assetResourceLimits.candidateDocuments + 1 },
        (_, index) =>
          document({ id: String(index), properties: { title: "Post" } })
      ),
      query: "{ assets { totalCount } }",
    });
    expect(oversizedDocuments.errors?.[0]?.message).toContain("document limit");

    const largeDocuments = Array.from(
      { length: assetResourceLimits.resultCount },
      (_, index) =>
        document({
          id: String(index).padStart(4, "0"),
          properties: { body: "x".repeat(2 * 1024) },
        })
    );
    const oversizedResult = await executeAssetGraphqlQuery({
      documents: largeDocuments,
      query: `{ assets(first: ${assetResourceLimits.resultCount}) {
        items { properties { body } }
      } }`,
    });
    expect(oversizedResult.errors?.[0]?.message).toContain("result exceeds");
  });
});
