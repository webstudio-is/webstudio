import { describe, expect, test } from "vitest";
import {
  formatExpressionObject,
  parseExpressionObject,
} from "@webstudio-is/query-builder";
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
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq" as const,
            value: "$ws$dataSource$routeSlug",
          },
          {
            any: [
              {
                field: ["properties", "draft"],
                operator: "ne" as const,
                value: "true",
              },
              {
                field: ["properties", "id"],
                operator: "eq" as const,
                value: "$ws$dataSource$routeSlug",
              },
            ],
          },
        ],
      },
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
      parseStructuredAssetQueryResourceBody('{ "query": { "where": 1 } }')
    ).toBeUndefined();
    const validBody = createStructuredAssetQueryResourceBody({
      where: { all: [] },
      sort: [],
      limit: "20",
      offset: "0",
      content: { mode: "none" },
    });
    const query = parseExpressionObject(validBody).get("query");
    expect(query).toBeDefined();
    expect(
      parseStructuredAssetQueryResourceBody(
        formatExpressionObject(
          new Map([
            ["query", query ?? ""],
            ["other", "true"],
          ])
        )
      )
    ).toBeUndefined();
  });
});
