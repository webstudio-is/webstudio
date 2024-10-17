import { describe, expect, test, beforeEach, jest } from "@jest/globals";

import { loadResource } from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";

// Mock the fetch function

describe("loadResource", () => {
  let mockFetch: jest.Mock<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn();
    jest.clearAllMocks();
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
});
