import { describe, expect, test } from "vitest";
import type { AssetFileDocument, BuilderAssetFieldCatalog } from "./schema";
import {
  executeAssetQuery,
  getAssetQueryFieldValue,
  validateAssetQueryAgainstCatalog,
} from "./structured-query";

const document = ({
  id,
  properties,
  excerpt,
  createdAt,
}: {
  id: string;
  properties: AssetFileDocument["properties"];
  excerpt?: string;
  createdAt?: string;
}): AssetFileDocument => ({
  _id: id,
  _type: "asset.file",
  name: `${id}.md`,
  path: `blog/${id}.md`,
  key: `key-${id}`,
  extension: "md",
  mimeType: "text/markdown",
  size: 20,
  createdAt,
  revision: `revision-${id}`,
  contentRef: `files/${id}.md`,
  properties,
  excerpt,
});

const documents = [
  document({
    id: "alpha",
    createdAt: "2026-07-27T00:00:00.000Z",
    excerpt: "Alpha excerpt",
    properties: {
      title: "Alpha",
      publishedAt: "2025-01-01",
      draft: false,
      tags: ["news", "alpha"],
    },
  }),
  document({
    id: "beta",
    properties: {
      title: "Beta",
      publishedAt: "2024-01-01",
      draft: true,
      tags: ["private"],
    },
  }),
  document({
    id: "gamma",
    properties: {
      title: "Gamma",
      publishedAt: "2026-01-01",
      tags: ["news"],
    },
  }),
];

const catalog: BuilderAssetFieldCatalog = {
  format: "webstudio-builder-asset-field-catalog",
  version: 1,
  canonicalRevision: `sha256:${"0".repeat(64)}`,
  documentCount: documents.length,
  fields: {
    "properties.title": { types: ["string"], occurrences: 3 },
    "properties.publishedAt": { types: ["string"], occurrences: 3 },
    "properties.draft": {
      types: ["boolean"],
      occurrences: 2,
      optional: true,
    },
    "properties.tags": { types: ["array"], occurrences: 3 },
  },
};

describe("structured asset query", () => {
  test("combines nested all and any filter groups", async () => {
    const result = await executeAssetQuery({
      catalog,
      documents,
      query: {
        where: {
          all: [
            {
              field: ["properties", "draft"],
              operator: "ne",
              value: true,
            },
            {
              any: [
                {
                  field: ["properties", "title"],
                  operator: "eq",
                  value: "Alpha",
                },
                {
                  field: ["properties", "publishedAt"],
                  operator: "eq",
                  value: "2026-01-01",
                },
              ],
            },
          ],
        },
      },
    });

    expect(result.items.map(({ id }) => id)).toEqual(["alpha", "gamma"]);
    expect(result.items[0]?.createdAt).toBe("2026-07-27T00:00:00.000Z");
  });

  test("reads only own JSON properties from dynamic field paths", () => {
    const inheritedNames = document({ id: "plain", properties: {} });
    expect(
      getAssetQueryFieldValue(inheritedNames, ["properties", "constructor"])
    ).toBeUndefined();
    expect(
      getAssetQueryFieldValue(inheritedNames, ["properties", "toString"])
    ).toBeUndefined();

    const ownNames = document({
      id: "own",
      properties: JSON.parse(
        '{"constructor":"constructor value","toString":"string value","__proto__":"prototype value"}'
      ),
    });
    expect(
      getAssetQueryFieldValue(ownNames, ["properties", "constructor"])
    ).toBe("constructor value");
    expect(getAssetQueryFieldValue(ownNames, ["properties", "toString"])).toBe(
      "string value"
    );
    expect(getAssetQueryFieldValue(ownNames, ["properties", "__proto__"])).toBe(
      "prototype value"
    );

    expect(
      validateAssetQueryAgainstCatalog({
        catalog,
        query: {
          where: {
            all: [
              {
                field: ["properties", "constructor"],
                operator: "eq",
                value: "missing",
              },
            ],
          },
        },
      }).warnings
    ).toEqual(["Asset field properties.constructor is not currently observed"]);
  });

  test("treats dynamic fields absent from the current catalog as missing", async () => {
    const query = {
      where: {
        all: [
          {
            field: ["properties", "missing"] as [string, string],
            operator: "eq" as const,
            value: true,
          },
        ],
      },
      content: { mode: "none" as const },
    };
    expect(
      validateAssetQueryAgainstCatalog({ catalog, query }).warnings
    ).toEqual(["Asset field properties.missing is not currently observed"]);
    const result = await executeAssetQuery({
      catalog,
      documents,
      query,
    });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  test("keeps sorting deterministic when a dynamic field becomes mixed", async () => {
    const mixedDocuments = [
      ...documents,
      document({ id: "delta", properties: { publishedAt: { year: 2027 } } }),
    ];
    const result = await executeAssetQuery({
      catalog: {
        ...catalog,
        documentCount: mixedDocuments.length,
        fields: {
          ...catalog.fields,
          "properties.publishedAt": {
            types: ["object", "string"],
            occurrences: mixedDocuments.length,
            mixed: true,
          },
        },
      },
      documents: mixedDocuments,
      query: {
        sort: [{ field: ["properties", "publishedAt"], direction: "asc" }],
        content: { mode: "none" },
      },
    });

    expect(result.items.map(({ id }) => id)).toEqual([
      "beta",
      "alpha",
      "gamma",
      "delta",
    ]);
  });

  test("filters dynamic fields, sorts, paginates, and returns public records", async () => {
    const result = await executeAssetQuery({
      catalog,
      documents,
      query: {
        where: {
          all: [
            {
              field: ["properties", "draft"],
              operator: "ne",
              value: true,
            },
            {
              field: ["properties", "tags"],
              operator: "contains",
              value: "news",
            },
          ],
        },
        sort: [
          {
            field: ["properties", "publishedAt"],
            direction: "desc",
          },
        ],
        limit: 1,
        offset: 0,
        content: { mode: "none" },
      },
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: "gamma",
          path: "blog/gamma.md",
          properties: expect.objectContaining({ title: "Gamma" }),
        }),
      ],
      totalCount: 2,
      hasMore: true,
    });
    expect(result.items[0]).not.toHaveProperty("contentRef");
    expect(result.items[0]).not.toHaveProperty("_id");
  });

  test("hydrates only selected Markdown content without exposing storage identity", async () => {
    const bytes = new TextEncoder().encode(
      "---\ntitle: Alpha\n---\n# Alpha body\n"
    );
    const result = await executeAssetQuery({
      catalog,
      documents: [{ ...documents[0], size: bytes.byteLength }],
      query: {
        where: { all: [{ field: ["id"], operator: "eq", value: "alpha" }] },
        sort: [],
        limit: 1,
        offset: 0,
        content: { mode: "markdown-body" },
      },
      read: async () => ({
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
        contentLength: bytes.byteLength,
      }),
    });

    expect(result.items[0].content).toEqual({
      encoding: "utf-8",
      text: "# Alpha body\n",
    });
    expect(result.items[0].content).not.toHaveProperty("contentRef");
  });

  test("projects explicit output fields while retaining base file metadata", async () => {
    const selected = await executeAssetQuery({
      catalog,
      documents,
      query: {
        where: { all: [] },
        sort: [],
        limit: 1,
        offset: 0,
        output: {
          mode: "fields",
          fields: [["properties", "title"], ["excerpt"]],
        },
        content: { mode: "none" },
      },
    });
    expect(selected.items[0]).toMatchObject({
      id: "alpha",
      name: "alpha.md",
      properties: { title: "Alpha" },
      excerpt: "Alpha excerpt",
    });
    expect(selected.items[0].properties).not.toHaveProperty("draft");

    const base = await executeAssetQuery({
      catalog,
      documents,
      query: {
        where: { all: [] },
        sort: [],
        limit: 1,
        offset: 0,
        output: { mode: "base" },
        content: { mode: "none" },
      },
    });
    expect(base.items[0]).toMatchObject({
      id: "alpha",
      name: "alpha.md",
      properties: {},
    });
    expect(base.items[0]).not.toHaveProperty("excerpt");
  });

  test("supports lexical date ranges and missing-field checks", async () => {
    const result = await executeAssetQuery({
      catalog,
      documents,
      query: {
        where: {
          all: [
            {
              field: ["properties", "publishedAt"],
              operator: "gte",
              value: "2025-01-01",
            },
            {
              field: ["properties", "draft"],
              operator: "exists",
              value: false,
            },
          ],
        },
        sort: [],
        limit: 100,
        offset: 0,
        content: { mode: "none" },
      },
    });

    expect(result.items.map(({ id }) => id)).toEqual(["gamma"]);
  });
});
