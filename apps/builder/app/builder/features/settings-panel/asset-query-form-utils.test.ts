import { describe, expect, test } from "vitest";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import {
  createStructuredAssetQueryResourceBody,
  getAssetQueryConfigurationError,
  parseStructuredAssetQueryResourceBody,
} from "./asset-query-form-utils";

describe("structured asset query resource body", () => {
  test("preserves runtime values as expressions", () => {
    const configuration = {
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq" as const,
            value: "$ws$dataSource$routeSlug",
          },
        ],
      },
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
        where: {
          all: [
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "hello-world",
            },
          ],
        },
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
      where: { all: [] },
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
        where: {
          all: Array.from({ length: 33 }, () => ({
            field: ["path"],
            operator: "eq" as const,
            value: '"post.md"',
          })),
        },
      })
    ).toContain("at most");
  });
});
