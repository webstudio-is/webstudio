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
        filters: [
          { field: ["content"], operator: "contains", value: '"hello"' },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  test("rejects query limits on create and update", () => {
    const query = {
      filters: Array.from({ length: 33 }, () => ({
        field: ["extension"],
        operator: "eq" as const,
        value: { type: "literal" as const, value: "md" },
      })),
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
          filters: [
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
          ],
          limit: "1",
          content: { mode: "markdown-body", maxBytes: 65_536 },
        },
      }).success
    ).toBe(true);
  });
});
