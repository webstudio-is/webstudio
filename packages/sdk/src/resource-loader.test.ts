import { describe, expect, test, beforeEach, vi, type Mock } from "vitest";

import { loadResource } from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";

// Mock the fetch function

describe("loadResource", () => {
  let mockFetch: Mock<typeof fetch>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.clearAllMocks();
  });

  test("should successfully fetch a resource and return a JSON response", async () => {
    const mockResponse = new Response(JSON.stringify({ key: "value" }), {
      status: 200,
    });
    mockFetch.mockResolvedValue(mockResponse);

    const resourceRequest: ResourceRequest = {
      id: "1",
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [],
      method: "get",
      headers: [],
      body: undefined,
    };

    const result = await loadResource(mockFetch, resourceRequest);

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/resource", {
      method: "get",
      headers: new Headers(),
    });

    expect(result).toEqual({
      data: {
        key: "value",
      },
      ok: true,
      status: 200,
      statusText: "",
    });
  });

  test("should fetch resource successfully with non-JSON response", async () => {
    const mockResponse = new Response("nonjson", {
      status: 200,
    });
    mockFetch.mockResolvedValue(mockResponse);

    const resourceRequest: ResourceRequest = {
      id: "1",
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [],
      method: "get",
      headers: [],
      body: undefined,
    };

    const result = await loadResource(mockFetch, resourceRequest);

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/resource", {
      method: "get",
      headers: new Headers(),
    });

    expect(result).toEqual({
      data: "nonjson",
      ok: true,
      status: 200,
      statusText: "",
    });
  });

  test("should fetch resource with search params", async () => {
    const mockResponse = new Response(JSON.stringify({ key: "value" }), {
      status: 200,
    });
    mockFetch.mockResolvedValue(mockResponse);

    const resourceRequest: ResourceRequest = {
      id: "1",
      name: "resource",
      url: "https://example.com/resource",
      searchParams: [
        { name: "search", value: "term1" },
        { name: "search", value: "term2" },
        { name: "filter", value: "привет" },
      ],
      method: "get",
      headers: [],
    };

    await loadResource(mockFetch, resourceRequest);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/resource?search=term1&search=term2&filter=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82",
      {
        method: "get",
        headers: new Headers(),
      }
    );
  });
});
