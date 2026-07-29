import { describe, expect, test } from "vitest";
import { contentEngineLimits } from "./limits";
import { assetQuery, type AssetQueryWhere } from "./schema";

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
