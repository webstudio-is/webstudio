import { describe, expect, test } from "vitest";
import {
  createAssetQueryResourceBody,
  createStructuredAssetQueryResourceBody,
  getAssetResourceQuery,
  isAssetsResource,
  isConfiguredAssetsResource,
  isStoredAssetQueryResource,
  parseAssetQueryResourceBody,
  parseStructuredAssetQueryResourceBody,
} from "./asset-resource-config";
import type { Resource } from "./schema/resources";

const createResource = (overrides: Partial<Resource> = {}): Resource => ({
  id: "posts",
  name: "Posts",
  control: "system",
  method: "post",
  url: '"/$resources/assets/query"',
  headers: [],
  ...overrides,
});

describe("asset query resource configuration", () => {
  test("round-trips query fields and expression variables", () => {
    const query =
      "query Post($slug: String!) { assets(where: { properties: { slug: { eq: $slug } } }, first: 1) { items { id } } }";
    const body = createAssetQueryResourceBody({
      query,
      variables: [{ name: "slug", value: "$ws$dataSource$routeSlug" }],
    });

    expect(parseAssetQueryResourceBody(body)).toEqual({
      queryExpression: JSON.stringify(query),
      variables: [{ name: "slug", value: "$ws$dataSource$routeSlug" }],
    });
    expect(getAssetResourceQuery(createResource({ body }))).toBe(query);
  });

  test("normalizes variable names before serialization", () => {
    const body = createAssetQueryResourceBody({
      query: "query Post($slug: String) { assets { items { id } } }",
      variables: [{ name: "  slug  ", value: '"post"' }],
    });

    expect(parseAssetQueryResourceBody(body).variables).toEqual([
      { name: "slug", value: '"post"' },
    ]);
  });

  test("only recognizes exact system Assets resource contracts", () => {
    expect(isStoredAssetQueryResource(createResource())).toBe(true);
    expect(isAssetsResource(createResource())).toBe(true);
    expect(
      isAssetsResource(
        createResource({ method: "get", url: '"/$resources/assets"' })
      )
    ).toBe(true);
    const configured = createResource({ url: '"/$resources/assets"' });
    expect(isAssetsResource(configured)).toBe(true);
    expect(isConfiguredAssetsResource(configured)).toBe(true);
    expect(isAssetsResource(createResource({ control: undefined }))).toBe(
      false
    );
    expect(
      isAssetsResource(
        createResource({ url: '"/$resources/assets/query/extra"' })
      )
    ).toBe(false);
    expect(
      isAssetsResource(createResource({ url: ' "/$resources/assets/query"' }))
    ).toBe(false);
  });

  test("round-trips typed filters with Webstudio value expressions", () => {
    const configuration = {
      filters: [
        {
          field: ["properties", "slug"],
          operator: "eq" as const,
          value: "$ws$dataSource$routeSlug",
        },
        {
          field: ["properties", "draft"],
          operator: "ne" as const,
          value: "true",
        },
      ],
      sort: [
        {
          field: ["properties", "publishedAt"],
          direction: "desc" as const,
        },
      ],
      limit: "20",
      offset: "$ws$dataSource$offset",
      content: { mode: "none" as const },
    };
    const body = createStructuredAssetQueryResourceBody(configuration);

    expect(parseStructuredAssetQueryResourceBody(body)).toEqual(configuration);
    expect(body).toContain('"value": $ws$dataSource$routeSlug');
  });

  test("rejects malformed structured resource bodies", () => {
    expect(
      parseStructuredAssetQueryResourceBody('{ "query": { "filters": 1 } }')
    ).toBeUndefined();
  });
});
