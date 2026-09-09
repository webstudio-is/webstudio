import { describe, expect, test } from "vitest";
import {
  assetsResourceCreateInput,
  assetsResourceUpdateInput,
  getAssetsResource,
} from "./asset-resources";

describe("Assets resource mutation input", () => {
  test("returns the exact stored query decoding error", () => {
    expect(
      getAssetsResource(
        {
          resources: new Map([
            [
              "posts",
              {
                id: "posts",
                name: "Posts",
                control: "system" as const,
                method: "post" as const,
                url: '"/$resources/assets"',
                headers: [],
                body: "({ query: { where: 1 } })",
              },
            ],
          ]),
          dataSources: new Map(),
        },
        { resourceId: "posts" }
      ).resource
    ).toMatchObject({
      mode: "invalid",
      configurationError:
        "Stored Assets query is invalid: Enter valid filters.",
    });
  });

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
          content: { mode: "markdown-body-ref", maxBytes: 65_536 },
        },
      }).success
    ).toBe(true);
  });

  test.each(["", "system.params["])(
    "rejects invalid query expression %j at the input boundary",
    (expression) => {
      expect(
        assetsResourceCreateInput.safeParse({
          name: "Posts",
          scopeInstanceId: "root",
          query: { limit: expression },
        }).success
      ).toBe(false);
      expect(
        assetsResourceUpdateInput.safeParse({
          resourceId: "posts",
          values: {
            query: {
              where: {
                all: [
                  {
                    field: ["properties", "slug"],
                    operator: "eq",
                    value: expression,
                  },
                ],
              },
            },
          },
        }).success
      ).toBe(false);
    }
  );

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
