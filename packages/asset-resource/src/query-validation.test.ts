import { describe, expect, test } from "vitest";
import { assetResourceLimits } from "@webstudio-is/sdk";
import {
  getAssetResourceVariableFieldPaths,
  AssetResourceQueryValidationError,
  getAssetResourceReferencedFieldPaths,
  getAssetResourceReferencedFieldPathsFromTree,
  validateAssetResourceQuery,
} from "./query-validation";

const expectValidationCode = (
  action: () => unknown,
  code: AssetResourceQueryValidationError["code"]
) => {
  try {
    action();
    throw new Error("Expected query validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(AssetResourceQueryValidationError);
    expect((error as AssetResourceQueryValidationError).code).toBe(code);
  }
};

describe("asset resource query validation", () => {
  test("finds unambiguous fields compared with route parameters", () => {
    expect(
      getAssetResourceVariableFieldPaths(
        `query Posts($slug: String!, $locale: String!) {
          assets(where: { properties: {
            slug: { eq: $slug }
            locale: { eq: $locale }
          } }) { items { id } }
        }`
      )
    ).toEqual(
      new Map([
        ["locale", ["properties", "locale"]],
        ["slug", ["properties", "slug"]],
      ])
    );
  });
  test("returns one parsed analysis for a valid parameterized query", () => {
    expect(
      validateAssetResourceQuery(
        `query Posts($slug: String!) {
          assets(where: {
            extension: { eq: "md" }
            properties: { slug: { eq: $slug } }
          }) { items { id } }
        }`
      )
    ).toMatchObject({
      queryMode: "parameterized",
      variableNames: ["slug"],
      astNodes: expect.any(Number),
      astDepth: expect.any(Number),
      datasetScans: 1,
    });
  });

  test("rejects empty, invalid, and UTF-8 oversized source", () => {
    expectValidationCode(
      () => validateAssetResourceQuery("  "),
      "INVALID_QUERY"
    );
    expectValidationCode(
      () => validateAssetResourceQuery("query { assets("),
      "INVALID_QUERY"
    );
    expectValidationCode(
      () =>
        validateAssetResourceQuery(
          `query { assets { ${"é".repeat(assetResourceLimits.queryBytes / 2 + 1)} } }`
        ),
      "INVALID_QUERY"
    );
  });

  test("rejects excessive AST depth and node count", () => {
    expectValidationCode(
      () =>
        validateAssetResourceQuery(
          `query { assets { items { ${"properties { ".repeat(assetResourceLimits.queryAstDepth + 1)}id${" }".repeat(assetResourceLimits.queryAstDepth + 1)} } } }`
        ),
      "QUERY_COMPLEXITY_EXCEEDED"
    );
    expectValidationCode(
      () =>
        validateAssetResourceQuery(
          `query { assets { items { ${Array.from(
            { length: assetResourceLimits.queryAstNodes },
            (_, index) => `field${index}`
          ).join(" ")} } } }`
        ),
      "QUERY_COMPLEXITY_EXCEEDED"
    );
  });

  test("rejects too many distinct runtime variables", () => {
    expectValidationCode(
      () =>
        validateAssetResourceQuery(
          `query TooMany(${Array.from(
            { length: assetResourceLimits.variableCount + 1 },
            (_, index) => `$parameter_${index}: String`
          ).join(", ")}) { assets { items { id } } }`
        ),
      "QUERY_COMPLEXITY_EXCEEDED"
    );
  });

  test("rejects more than one dataset scan", () => {
    expectValidationCode(
      () =>
        validateAssetResourceQuery(
          `{ first: assets { items { id } } second: assets { items { id } } }`
        ),
      "QUERY_COMPLEXITY_EXCEEDED"
    );
  });

  test("extracts complete referenced asset field paths", () => {
    expect(
      getAssetResourceReferencedFieldPaths(
        `query Posts($slug: String!) {
          assets(where: { properties: { slug: { eq: $slug } } }) {
            items { id properties { title publishedAt } }
          }
        }`
      )
    ).toEqual([
      "_id",
      "properties",
      "properties.publishedAt",
      "properties.slug",
      "properties.title",
    ]);
  });

  test("formats dynamic field names with valid bracket notation", () => {
    const validated = validateAssetResourceQuery(
      `{ assets(where: { properties: { _ws_73656f2d7469746c65: { eq: "Post" } } }) {
        items { properties { _ws_73656f2d7469746c65 } }
      } }`
    );

    expect(
      getAssetResourceReferencedFieldPathsFromTree(validated.tree)
    ).toEqual(["properties", 'properties["seo-title"]']);
  });
});
