import { describe, expect, test } from "vitest";
import { assetResourceQueryRequest } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  parsePublishedAssetQueryRequest,
  parsePublishedAssetQueryRequestBody,
} from "./runtime-request";

describe("dependency-free published request parsing", () => {
  test("matches the authoring request contract", () => {
    const input = {
      query: "query Post($slug: String!) { assets { items { id } } }",
      variables: { slug: "hello" },
      operationName: "Post",
      indexRevision: "index-1",
      ignored: true,
    };
    expect(parsePublishedAssetQueryRequest(input)).toEqual(
      assetResourceQueryRequest.parse(input)
    );
  });

  test.each([
    null,
    [],
    { query: "" },
    { query: "{ assets { items { id } } }", variables: [] },
    { query: "{ assets { items { id } } }", variables: { "bad-name": 1 } },
  ])("rejects invalid request %#", (input) => {
    expect(() => parsePublishedAssetQueryRequest(input)).toThrow();
    expect(assetResourceQueryRequest.safeParse(input).success).toBe(false);
  });

  test("rejects invalid operation names consistently", () => {
    const input = {
      query: "{ assets { items { id } } }",
      operationName: "not-an-operation",
    };
    expect(() => parsePublishedAssetQueryRequest(input)).toThrow();
    expect(assetResourceQueryRequest.safeParse(input).success).toBe(false);
  });

  test("bounds the complete request body before parsing JSON", async () => {
    const oversized = new Request("https://site.example/query", {
      method: "POST",
      body: " ".repeat(assetResourceLimits.requestBytes + 1),
    });
    await expect(
      parsePublishedAssetQueryRequestBody(oversized)
    ).rejects.toThrow("byte limit");

    const request = new Request("https://site.example/query", {
      method: "POST",
      body: JSON.stringify({ query: "{ assets { items { id } } }" }),
    });
    await expect(parsePublishedAssetQueryRequestBody(request)).resolves.toEqual(
      {
        body: '{"query":"{ assets { items { id } } }"}',
        request: {
          query: "{ assets { items { id } } }",
          variables: {},
        },
      }
    );
  });
});
