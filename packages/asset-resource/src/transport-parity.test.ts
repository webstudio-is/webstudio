import { afterEach, describe, expect, test, vi } from "vitest";
import { loadResource } from "@webstudio-is/sdk/runtime";
import { createAssetResourceRequest } from "./index";

afterEach(() => {
  vi.restoreAllMocks();
});

const createQueryRequest = () =>
  createAssetResourceRequest({
    query: {
      filters: [
        {
          field: ["properties", "slug"],
          operator: "eq",
          value: "hello-world",
        },
      ],
      limit: 1,
    },
    indexRevision: "index-7",
  });

describe("Builder and generated resource transport parity", () => {
  test("sends and returns the same successful asset query contract", async () => {
    const responseBody = {
      items: [{ id: "asset-1", properties: { title: "Hello world" } }],
      totalCount: 1,
      hasMore: false,
    };
    const builderFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody)));
    const generatedFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody)));

    const [builderResult, generatedResult] = await Promise.all([
      loadResource(builderFetch, createQueryRequest(), "https://site.example"),
      loadResource(
        generatedFetch,
        createQueryRequest(),
        "https://site.example/blog/hello-world"
      ),
    ]);

    expect(builderFetch.mock.calls).toEqual(generatedFetch.mock.calls);
    expect(builderFetch).toHaveBeenCalledWith(
      "/$resources/assets",
      expect.objectContaining({
        method: "post",
        headers: new Headers([["content-type", "application/json"]]),
        body: expect.any(String),
      })
    );
    expect(builderResult).toEqual(generatedResult);
  });

  test("preserves the same structured endpoint failure", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const responseBody = {
      ok: false,
      error: {
        code: "STALE_INDEX",
        message: "The active index is stale.",
        retryable: true,
      },
    };
    const createFetch = () =>
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(responseBody), {
          status: 409,
          statusText: "Conflict",
        })
      );
    const builderFetch = createFetch();
    const generatedFetch = createFetch();

    const [builderResult, generatedResult] = await Promise.all([
      loadResource(builderFetch, createQueryRequest(), "https://site.example"),
      loadResource(
        generatedFetch,
        createQueryRequest(),
        "https://site.example/blog/hello-world"
      ),
    ]);

    expect(builderFetch.mock.calls).toEqual(generatedFetch.mock.calls);
    expect(builderResult).toEqual(generatedResult);
    expect(builderResult).toEqual({
      ok: false,
      status: 409,
      statusText: "Conflict",
      data: responseBody,
    });
    expect(errorLog).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenCalledWith(
      "Failed to load resource request: 409"
    );
  });
});
