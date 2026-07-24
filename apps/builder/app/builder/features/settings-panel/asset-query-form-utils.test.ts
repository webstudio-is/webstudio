import { describe, expect, test } from "vitest";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import {
  createStructuredAssetQueryResourceBody,
  getAssetQueryConfigurationError,
  isEmptyAssetQueryResult,
  parseStructuredAssetQueryResourceBody,
} from "./asset-query-form-utils";

describe("structured asset query resource body", () => {
  test("preserves runtime values as expressions", () => {
    const configuration = {
      filters: [
        {
          field: ["properties", "slug"],
          operator: "eq" as const,
          value: "$ws$dataSource$routeSlug",
        },
      ],
      sort: [
        {
          field: ["properties", "publishedAt"],
          direction: "desc" as const,
        },
      ],
      limit: "10",
      offset: "0",
      content: { mode: "none" as const },
    };
    const body = createStructuredAssetQueryResourceBody(configuration);

    expect(
      computeExpression(body, new Map([["routeSlug", "hello-world"]]))
    ).toEqual({
      query: {
        filters: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "hello-world",
          },
        ],
        sort: [{ field: ["properties", "publishedAt"], direction: "desc" }],
        limit: 10,
        offset: 0,
        content: { mode: "none" },
      },
    });
    expect(parseStructuredAssetQueryResourceBody(body)).toEqual(configuration);
  });

  test("validates expressions and configured limits", () => {
    const configuration = {
      filters: [],
      sort: [],
      limit: "10",
      offset: "0",
      content: { mode: "none" as const },
    };
    expect(getAssetQueryConfigurationError(configuration)).toBeUndefined();
    expect(
      getAssetQueryConfigurationError({ ...configuration, limit: "system." })
    ).toContain("Webstudio expression");
    expect(
      getAssetQueryConfigurationError({
        ...configuration,
        filters: Array.from({ length: 33 }, () => ({
          field: ["path"],
          operator: "eq" as const,
          value: '"post.md"',
        })),
      })
    ).toContain("at most");
  });

  test("recognizes the structured empty result", () => {
    expect(isEmptyAssetQueryResult({ items: [] })).toBe(true);
    expect(isEmptyAssetQueryResult({ items: [{ id: "one" }] })).toBe(false);
    expect(isEmptyAssetQueryResult([])).toBe(false);
    expect(isEmptyAssetQueryResult(undefined)).toBe(false);
  });
});
