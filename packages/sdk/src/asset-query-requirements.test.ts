import { describe, expect, test } from "vitest";
import {
  getAssetQueryRequirements,
  mergeAssetQueryRequirements,
} from "./asset-query-requirements";

const query = {
  where: { all: [] },
  sort: [],
  limit: "10",
  offset: "0",
  output: { mode: "base" as const },
  content: { mode: "none" as const },
};

describe("asset query requirements", () => {
  test("keeps base-only queries free of parser and hydration work", () => {
    expect(getAssetQueryRequirements(query)).toEqual({
      baseMetadata: true,
      structuredProperties: false,
      structuredPropertyPaths: [],
      excerpt: false,
      hydratedContent: false,
      output: { mode: "base" },
    });
  });

  test("derives structured, excerpt, and content requirements independently", () => {
    expect(
      getAssetQueryRequirements({
        ...query,
        where: {
          any: [
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: '"post"',
            },
          ],
        },
        sort: [{ field: ["excerpt"], direction: "asc" }],
        content: { mode: "markdown-body" },
      })
    ).toMatchObject({
      structuredProperties: true,
      excerpt: true,
      hydratedContent: true,
    });
  });

  test("unions selected fields deterministically and returns no requirements for no queries", () => {
    expect(mergeAssetQueryRequirements([])).toBeUndefined();
    expect(
      mergeAssetQueryRequirements([
        {
          ...query,
          output: {
            mode: "fields",
            fields: [["properties", "title"]],
          },
        },
        {
          ...query,
          output: {
            mode: "fields",
            fields: [["excerpt"], ["properties", "slug"]],
          },
        },
      ])
    ).toEqual({
      baseMetadata: true,
      structuredProperties: true,
      structuredPropertyPaths: [
        ["properties", "slug"],
        ["properties", "title"],
      ],
      excerpt: true,
      hydratedContent: false,
      output: {
        mode: "fields",
        fields: [["excerpt"], ["properties", "slug"], ["properties", "title"]],
      },
    });
  });

  test("preserves legacy all-fields output as the broadest requirement", () => {
    expect(
      mergeAssetQueryRequirements([
        query,
        { ...query, output: { mode: "all" } },
      ])
    ).toMatchObject({
      structuredProperties: true,
      structuredPropertyPaths: "all",
      excerpt: true,
      output: { mode: "all" },
    });
  });
});
