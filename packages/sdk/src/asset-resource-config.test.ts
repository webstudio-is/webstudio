import { describe, expect, test } from "vitest";
import {
  createStructuredAssetQueryResourceBody,
  isAssetsResource,
  isConfiguredAssetsResource,
  parseStructuredAssetQueryResourceBody,
} from "./asset-resource-config";
import type { Resource } from "./schema/resources";

const createResource = (overrides: Partial<Resource> = {}): Resource => ({
  id: "posts",
  name: "Posts",
  control: "system",
  method: "post",
  url: '"/$resources/assets"',
  headers: [],
  ...overrides,
});

describe("asset query resource configuration", () => {
  test("only recognizes exact system Assets resource contracts", () => {
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
      isAssetsResource(createResource({ url: '"/$resources/other"' }))
    ).toBe(false);
    expect(
      isAssetsResource(createResource({ url: ' "/$resources/assets"' }))
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
