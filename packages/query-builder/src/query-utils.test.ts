import { describe, expect, test } from "vitest";
import {
  createQueryCondition,
  createQuerySort,
  createStructuredQuery,
  getQueryConditions,
  getQueryWhereMetrics,
  mapQueryWhere,
} from "./query-utils";
import { genericQueryCapabilities } from "./test-fixtures";

const where = {
  all: [
    { field: ["extension"], operator: "eq", value: '"md"' },
    {
      any: [
        { field: ["properties", "slug"], operator: "eq", value: "slug" },
        { field: ["properties", "id"], operator: "eq", value: "slug" },
      ],
    },
  ],
};

describe("structured query traversal", () => {
  test("collects nested conditions", () => {
    expect(getQueryConditions(where)).toHaveLength(3);
  });

  test("maps conditions while preserving groups", () => {
    expect(
      mapQueryWhere(where, (condition) => ({
        ...condition,
        value: condition.value.toUpperCase(),
      }))
    ).toEqual({
      all: [
        { field: ["extension"], operator: "eq", value: '"MD"' },
        {
          any: [
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "SLUG",
            },
            {
              field: ["properties", "id"],
              operator: "eq",
              value: "SLUG",
            },
          ],
        },
      ],
    });
  });

  test("measures condition count and group depth", () => {
    expect(getQueryWhereMetrics(where)).toEqual({ conditions: 3, depth: 2 });
  });

  test("derives query, condition, parameter, and sort defaults from capabilities", () => {
    expect(createQueryCondition(genericQueryCapabilities)).toEqual({
      field: ["title"],
      operator: "eq",
      value: '""',
    });
    expect(createQuerySort(genericQueryCapabilities)).toEqual({
      field: ["publishedAt"],
      direction: "desc",
    });
    expect(createStructuredQuery(genericQueryCapabilities)).toEqual({
      where: { all: [] },
      sort: [],
      limit: "10",
      offset: "0",
      selection: { mode: "summary", includeMetadata: true },
    });
  });
});
