import { describe, expect, test } from "vitest";
import {
  createAssetQueryResourceBody,
  getAssetResourceQuery,
  isAssetsResource,
  isStoredAssetQueryResource,
  parseAssetQueryResourceBody,
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
  test("round-trips query fields and expression parameters", () => {
    const body = createAssetQueryResourceBody({
      query: "*[properties.slug == $slug]",
      parameters: [{ name: "slug", value: "$ws$dataSource$routeSlug" }],
      resultLimit: 1,
    });

    expect(parseAssetQueryResourceBody(body)).toEqual({
      queryExpression: '"*[properties.slug == $slug]"',
      parameters: [{ name: "slug", value: "$ws$dataSource$routeSlug" }],
      resultLimitExpression: "1",
      contentExpression: '{ "mode": "none" }',
    });
    expect(getAssetResourceQuery(createResource({ body }))).toBe(
      "*[properties.slug == $slug]"
    );
  });

  test("only recognizes exact system Assets resource contracts", () => {
    expect(isStoredAssetQueryResource(createResource())).toBe(true);
    expect(isAssetsResource(createResource())).toBe(true);
    expect(
      isAssetsResource(
        createResource({ method: "get", url: '"/$resources/assets"' })
      )
    ).toBe(true);
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
});
