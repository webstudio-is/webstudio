import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  createQueryCondition,
  createQuerySort,
  createStructuredQuery,
} from "./query-utils";
import {
  createQueryWhereSchema,
  evaluateQueryWhere,
  getQueryConditions,
  getQueryWhereMetrics,
  mapQueryWhere,
} from "./runtime";
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

  test("enforces shared query tree limits", () => {
    const schema = createQueryWhereSchema(
      z.strictObject({ field: z.string() }),
      { maximumChildren: 2, maximumConditions: 2, maximumDepth: 2 }
    );

    expect(
      schema.safeParse({
        all: [{ field: "one" }, { any: [{ field: "two" }] }],
      }).success
    ).toBe(true);
    expect(
      schema.safeParse({
        all: [{ field: "one" }, { field: "two" }, { field: "three" }],
      }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        all: [
          { field: "one" },
          { any: [{ field: "two" }, { field: "three" }] },
        ],
      }).success
    ).toBe(false);
    expect(
      schema.safeParse({ all: [{ any: [{ all: [{ field: "one" }] }] }] })
        .success
    ).toBe(false);
  });

  test("evaluates nested boolean trees without discarding unknown leaves", () => {
    const evaluate = (value: boolean | undefined) =>
      evaluateQueryWhere(
        {
          all: [
            { field: "known", value: true },
            {
              any: [
                { field: "unknown", value },
                { field: "no", value: false },
              ],
            },
          ],
        },
        (condition) => condition.value
      );

    expect(evaluate(true)).toBe(true);
    expect(evaluate(false)).toBe(false);
    expect(evaluate(undefined)).toBeUndefined();
    expect(evaluateQueryWhere({ all: [] }, () => undefined)).toBe(true);
    expect(evaluateQueryWhere({ any: [] }, () => undefined)).toBe(false);
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
