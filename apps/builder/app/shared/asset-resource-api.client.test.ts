import { describe, expect, test, vi } from "vitest";
import { loadBuilderAssetResource } from "./asset-resource-api.client";

describe("Builder asset resource client", () => {
  test("loads exactly one nested resource result", async () => {
    const result = {
      ok: true,
      status: 200,
      statusText: "OK",
      data: { ok: true, result: [] },
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify([["request-key", result]]), { status: 200 })
      );

    await expect(
      loadBuilderAssetResource({
        request: {
          name: "asset-query",
          method: "post",
          url: "/$resources/assets/query",
          searchParams: [],
          headers: [],
          body: { query: "{ assets { items { id } } }" },
        },
        fetcher,
      })
    ).resolves.toEqual(result);
    expect(fetcher).toHaveBeenCalledWith("/rest/resources-loader", {
      method: "POST",
      body: expect.any(String),
    });
  });

  test("rejects malformed batch responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    await expect(
      loadBuilderAssetResource({
        request: {
          name: "asset-query",
          method: "get",
          url: "/$resources/assets",
          searchParams: [],
          headers: [],
        },
        fetcher,
      })
    ).rejects.toThrow("response is invalid");
  });
});
