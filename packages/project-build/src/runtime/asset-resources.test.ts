import { describe, expect, test } from "vitest";
import {
  assetsResourceCreateInput,
  assetsResourceUpdateInput,
} from "./asset-resources";

describe("Assets resource mutation input", () => {
  test("rejects unsupported field paths", () => {
    const result = assetsResourceCreateInput.safeParse({
      name: "Posts",
      scopeInstanceId: "root",
      query: {
        where: {
          all: [{ field: ["content"], operator: "contains", value: '"hello"' }],
        },
      },
    });

    expect(result.success).toBe(false);
  });

  test("rejects query limits on create and update", () => {
    const query = {
      where: {
        all: Array.from({ length: 33 }, () => ({
          field: ["extension"],
          operator: "eq" as const,
          value: { type: "literal" as const, value: "md" },
        })),
      },
    };

    expect(
      assetsResourceCreateInput.safeParse({
        name: "Posts",
        scopeInstanceId: "root",
        query,
      }).success
    ).toBe(false);
    expect(
      assetsResourceUpdateInput.safeParse({
        resourceId: "posts",
        values: { query },
      }).success
    ).toBe(false);
  });

  test("accepts literals and runtime expressions", () => {
    expect(
      assetsResourceCreateInput.safeParse({
        name: "Post",
        scopeInstanceId: "root",
        query: {
          where: {
            all: [
              {
                field: ["extension"],
                operator: "eq",
                value: { type: "literal", value: "md" },
              },
              {
                field: ["properties", "slug"],
                operator: "eq",
                value: "system.params.slug",
              },
              {
                field: ["properties", "draft"],
                operator: "ne",
                value: { type: "literal", value: true },
              },
            ],
          },
          limit: { type: "literal", value: 20 },
          offset: { type: "literal", value: 0 },
          content: { mode: "markdown-body", maxBytes: 65_536 },
        },
      }).success
    ).toBe(true);
  });

  test("keeps omitted query update fields absent for patch merging", () => {
    expect(
      assetsResourceUpdateInput.parse({
        resourceId: "posts",
        values: { query: { limit: "50" } },
      }).values.query
    ).toEqual({ limit: "50" });
  });

  test("rejects out-of-range literal pagination", () => {
    expect(
      assetsResourceCreateInput.safeParse({
        name: "Posts",
        scopeInstanceId: "root",
        query: { limit: { type: "literal", value: -1 } },
      }).success
    ).toBe(false);
  });
});
