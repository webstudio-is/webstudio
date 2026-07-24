import { describe, expect, test, vi } from "vitest";
import { loadResource } from "@webstudio-is/sdk/runtime";
import { createAssetResourceRequest } from "./index";

describe("asset resource request transport", () => {
  test("serializes a typed Assets query in POST JSON", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      })
    );
    const resourceRequest = createAssetResourceRequest({
      query: {
        filters: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "hello-world",
          },
          {
            field: ["properties", "locale"],
            operator: "eq",
            value: "en",
          },
        ],
        limit: 1,
      },
      indexRevision: "index-7",
    });

    await loadResource(fetch, resourceRequest, "https://example.com/blog/post");

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/$resources/assets");
    expect(init).toEqual({
      method: "post",
      headers: new Headers([["content-type", "application/json"]]),
      body: JSON.stringify(resourceRequest.body),
    });
    expect(JSON.parse(String(init?.body))).toEqual(resourceRequest.body);
  });
});
