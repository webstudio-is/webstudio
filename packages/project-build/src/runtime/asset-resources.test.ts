import { describe, expect, test } from "vitest";
import {
  assetsResourceCreateInput,
  assetsResourceUpdateInput,
} from "./asset-resources";

const baseQuery = {
  resultLimit: 20,
  content: { mode: "none" as const },
  parameters: [],
};

describe("Assets resource mutation input", () => {
  test("rejects invalid GROQ on create", () => {
    const result = assetsResourceCreateInput.safeParse({
      name: "Posts",
      scopeInstanceId: "root",
      query: { ...baseQuery, groq: "*[" },
    });

    expect(result.success).toBe(false);
  });

  test("rejects missing parameter bindings on create and update", () => {
    const query = {
      ...baseQuery,
      groq: "*[properties.slug == $slug]",
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

  test("accepts a binding for every GROQ parameter", () => {
    expect(
      assetsResourceCreateInput.safeParse({
        name: "Post",
        scopeInstanceId: "root",
        query: {
          ...baseQuery,
          groq: "*[properties.slug == $slug]",
          parameters: [{ name: "slug", value: "system.params.slug" }],
        },
      }).success
    ).toBe(true);
  });
});
