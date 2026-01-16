import { describe, test, expect } from "vitest";
import { getResourceKey } from "./resource-utils";
import type { ResourceRequest } from "@webstudio-is/sdk";

describe("getResourceKey - pure function tests", () => {
  test("generates consistent hash for same resource", () => {
    const resource: ResourceRequest = {
      name: "test",
      method: "get",
      url: "/api/test",
      searchParams: [],
      headers: [],
    };

    const key1 = getResourceKey(resource);
    const key2 = getResourceKey(resource);

    expect(key1).toBe(key2);
    expect(key1).toBeTruthy();
    expect(typeof key1).toBe("string");
  });

  test("generates different hashes for different resources", () => {
    const resource1: ResourceRequest = {
      name: "test1",
      method: "get",
      url: "/api/test1",
      searchParams: [],
      headers: [],
    };

    const resource2: ResourceRequest = {
      name: "test2",
      method: "get",
      url: "/api/test2",
      searchParams: [],
      headers: [],
    };

    const key1 = getResourceKey(resource1);
    const key2 = getResourceKey(resource2);

    expect(key1).not.toBe(key2);
  });

  test("different URLs produce different keys", () => {
    const base: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/v1/users",
      searchParams: [],
      headers: [],
    };

    const modified: ResourceRequest = {
      ...base,
      url: "/api/v2/users",
    };

    expect(getResourceKey(base)).not.toBe(getResourceKey(modified));
  });

  test("different methods produce different keys", () => {
    const base: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/users",
      searchParams: [],
      headers: [],
    };

    const modified: ResourceRequest = {
      ...base,
      method: "post",
    };

    expect(getResourceKey(base)).not.toBe(getResourceKey(modified));
  });

  test("search params affect the key", () => {
    const withoutParams: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/users",
      searchParams: [],
      headers: [],
    };

    const withParams: ResourceRequest = {
      ...withoutParams,
      searchParams: [{ name: "page", value: "1" }],
    };

    expect(getResourceKey(withoutParams)).not.toBe(getResourceKey(withParams));
  });

  test("headers affect the key", () => {
    const withoutHeaders: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/users",
      searchParams: [],
      headers: [],
    };

    const withHeaders: ResourceRequest = {
      ...withoutHeaders,
      headers: [{ name: "Authorization", value: "Bearer token" }],
    };

    expect(getResourceKey(withoutHeaders)).not.toBe(
      getResourceKey(withHeaders)
    );
  });

  test("body affects the key", () => {
    const withoutBody: ResourceRequest = {
      name: "api",
      method: "post",
      url: "/api/users",
      searchParams: [],
      headers: [],
    };

    const withBody: ResourceRequest = {
      ...withoutBody,
      body: JSON.stringify({ name: "John" }),
    };

    expect(getResourceKey(withoutBody)).not.toBe(getResourceKey(withBody));
  });

  test("handles resources with complex nested data", () => {
    const resource: ResourceRequest = {
      name: "complex",
      method: "post",
      url: "/api/test",
      searchParams: [
        { name: "filter", value: "active" },
        { name: "sort", value: "desc" },
      ],
      headers: [
        { name: "Content-Type", value: "application/json" },
        { name: "Authorization", value: "Bearer xyz" },
      ],
      body: JSON.stringify({ data: { nested: { value: true } } }),
    };

    const key = getResourceKey(resource);
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
  });

  test("order of search params matters", () => {
    const resource1: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/test",
      searchParams: [
        { name: "a", value: "1" },
        { name: "b", value: "2" },
      ],
      headers: [],
    };

    const resource2: ResourceRequest = {
      name: "api",
      method: "get",
      url: "/api/test",
      searchParams: [
        { name: "b", value: "2" },
        { name: "a", value: "1" },
      ],
      headers: [],
    };

    // Order matters because we serialize the array as-is
    expect(getResourceKey(resource1)).not.toBe(getResourceKey(resource2));
  });

  test("returns empty string for invalid resource with circular reference", () => {
    const invalidResource = {
      name: "test",
      method: "get" as const,
      url: "/api/test",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get searchParams(): any {
        return [this];
      },
      headers: [],
    };

    const key = getResourceKey(invalidResource);
    expect(key).toBe("");
  });

  test("assets system resource produces consistent key", () => {
    const assetsResource: ResourceRequest = {
      name: "assets",
      method: "get",
      url: "/$resources/assets",
      searchParams: [],
      headers: [],
    };

    const key1 = getResourceKey(assetsResource);
    const key2 = getResourceKey(assetsResource);

    expect(key1).toBe(key2);
    expect(key1).toBeTruthy();
  });
});
