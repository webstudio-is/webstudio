import { describe, expect, test } from "vitest";
import {
  assetsResourceCreateInput,
  assetsResourceUpdateInput,
} from "./asset-resources";

const baseQuery = { variables: [] };

describe("Assets resource mutation input", () => {
  test("rejects invalid GraphQL on create", () => {
    const result = assetsResourceCreateInput.safeParse({
      name: "Posts",
      scopeInstanceId: "root",
      query: { ...baseQuery, graphql: "query { assets(" },
    });

    expect(result.success).toBe(false);
  });

  test("rejects missing variable bindings on create and update", () => {
    const query = {
      ...baseQuery,
      graphql:
        "query Post($slug: String!) { assets(where: { properties: { slug: { eq: $slug } } }) { items { id } } }",
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

  test("accepts a binding for every GraphQL variable", () => {
    expect(
      assetsResourceCreateInput.safeParse({
        name: "Post",
        scopeInstanceId: "root",
        query: {
          ...baseQuery,
          graphql:
            "query Post($slug: String!) { assets(where: { properties: { slug: { eq: $slug } } }) { items { id } } }",
          variables: [{ name: "slug", value: "system.params.slug" }],
        },
      }).success
    ).toBe(true);
  });
});
