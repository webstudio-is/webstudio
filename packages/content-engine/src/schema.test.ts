import { describe, expect, test } from "vitest";
import { contentEngineLimits } from "./limits";
import {
  assetQuery,
  assetQueryDiagnosticIssue,
  type AssetQueryWhere,
} from "./schema";

const condition = {
  field: ["properties", "slug"],
  operator: "eq" as const,
  value: "post",
};

const nestCondition = (depth: number): AssetQueryWhere => {
  let where: AssetQueryWhere = condition;
  for (let index = 0; index < depth; index += 1) {
    where = { all: [where] };
  }
  return where;
};

describe("assetQuery", () => {
  test("rejects unknown content option fields", () => {
    expect(
      assetQuery.safeParse({
        content: { mode: "none", maxBytes: 1 },
      }).success
    ).toBe(false);
    expect(
      assetQuery.safeParse({
        content: { mode: "full", offset: 0 },
      }).success
    ).toBe(false);
    expect(
      assetQuery.safeParse({
        content: { mode: "range", offset: 0, length: 1, maxBytes: 1 },
      }).success
    ).toBe(false);
  });

  test("enforces the filter nesting limit in the request schema", () => {
    expect(
      assetQuery.safeParse({
        where: nestCondition(contentEngineLimits.filterDepth),
      }).success
    ).toBe(true);
    expect(
      assetQuery.safeParse({
        where: nestCondition(contentEngineLimits.filterDepth + 1),
      }).success
    ).toBe(false);
  });

  test("enforces the total filter limit across groups", () => {
    const group = {
      all: Array.from(
        { length: contentEngineLimits.filterCount / 2 + 1 },
        () => condition
      ),
    };
    expect(
      assetQuery.safeParse({ where: { any: [group, group] } }).success
    ).toBe(false);
  });
});

describe("assetQueryDiagnosticIssue", () => {
  test("preserves complete source locations and parser context", () => {
    expect(
      assetQueryDiagnosticIssue.parse({
        severity: "warning",
        scope: "query",
        phase: "source",
        code: "unsafe-mdx",
        message: "Executable MDX expressions are not supported",
        assetId: "post",
        path: "blog/post.mdx",
        line: 4,
        column: 2,
        reference: "#/body",
        nodeType: "mdxFlowExpression",
        reason: "Executable MDX expressions are not supported",
        sourceRange: {
          start: { line: 4, column: 2, offset: 40 },
          end: { line: 4, column: 9, offset: 47 },
        },
      })
    ).toMatchObject({
      reference: "#/body",
      nodeType: "mdxFlowExpression",
      reason: "Executable MDX expressions are not supported",
      sourceRange: {
        start: { line: 4, column: 2, offset: 40 },
        end: { line: 4, column: 9, offset: 47 },
      },
    });
  });
});
