import { describe, expect, test } from "vitest";
import { assetResourceLimits } from "@webstudio-is/sdk";
import {
  AssetResourceQueryValidationError,
  getAssetResourceReferencedFieldPaths,
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
  test("returns one parsed analysis for a valid parameterized query", () => {
    expect(
      validateAssetResourceQuery(
        `*[extension == "md" && properties.slug == $slug]`
      )
    ).toMatchObject({
      queryMode: "parameterized",
      parameterNames: ["slug"],
      astNodes: expect.any(Number),
      astDepth: expect.any(Number),
    });
  });

  test("rejects empty, invalid, and UTF-8 oversized source", () => {
    expectValidationCode(
      () => validateAssetResourceQuery("  "),
      "INVALID_QUERY"
    );
    expectValidationCode(
      () => validateAssetResourceQuery("*[invalid =="),
      "INVALID_QUERY"
    );
    expectValidationCode(
      () =>
        validateAssetResourceQuery(
          `"${"é".repeat(assetResourceLimits.queryBytes / 2 + 1)}"`
        ),
      "INVALID_QUERY"
    );
  });

  test("rejects excessive AST depth and node count", () => {
    expectValidationCode(
      () =>
        validateAssetResourceQuery(
          `${"(".repeat(assetResourceLimits.queryAstDepth + 1)}true${")".repeat(assetResourceLimits.queryAstDepth + 1)}`
        ),
      "QUERY_COMPLEXITY_EXCEEDED"
    );
    expectValidationCode(
      () =>
        validateAssetResourceQuery(
          `*[${Array.from(
            { length: assetResourceLimits.queryAstNodes },
            () => "true"
          ).join(" || ")}]`
        ),
      "QUERY_COMPLEXITY_EXCEEDED"
    );
  });

  test("rejects too many distinct runtime parameters", () => {
    expectValidationCode(
      () =>
        validateAssetResourceQuery(
          `*[${Array.from(
            { length: assetResourceLimits.parameterCount + 1 },
            (_, index) => `$parameter_${index}`
          ).join(" && ")}]`
        ),
      "QUERY_COMPLEXITY_EXCEEDED"
    );
  });

  test("extracts complete referenced asset field paths", () => {
    expect(
      getAssetResourceReferencedFieldPaths(
        '*[properties.slug == $slug] | order(properties.publishedAt desc){_id, "title": properties.title}'
      )
    ).toEqual([
      "_id",
      "properties",
      "properties.publishedAt",
      "properties.slug",
      "properties.title",
    ]);
  });
});
