import { describe, expect, test } from "vitest";
import { paginateOutput, projectOutput } from "./output";

describe("output detail", () => {
  test("keeps compact fields unchanged and only expands on request", () => {
    const compact = { id: "item-1", count: 2 };
    expect(
      projectOutput({ input: {}, compact, expanded: () => ({ value: "full" }) })
    ).toEqual(compact);
    expect(
      projectOutput({
        input: { verbose: true },
        compact,
        expanded: () => ({ value: "full" }),
      })
    ).toEqual({ ...compact, value: "full" });
  });

  test("returns stable pagination metadata and active filters", () => {
    expect(
      paginateOutput({
        items: ["a", "b", "c"],
        cursor: "1",
        limit: 1,
        filters: { type: "image" },
      })
    ).toEqual({
      detail: "compact",
      items: ["b"],
      total: 3,
      returnedCount: 1,
      nextCursor: "2",
      filters: { type: "image" },
    });
  });

  test("rejects invalid cursors", () => {
    expect(() =>
      paginateOutput({ items: [], cursor: "nope", filters: {} })
    ).toThrow("Invalid pagination cursor");
  });

  test.each([0, 201, 1.5])("rejects invalid limits: %s", (limit) => {
    expect(() => paginateOutput({ items: [], limit, filters: {} })).toThrow();
  });
});
