import { describe, expect, test } from "vitest";
import { contentEngineLimits } from "./limits";
import { readAssetQueryRequest } from "./request";

const validRequest = JSON.stringify({
  query: {
    where: { all: [] },
    sort: [],
    limit: 1,
    offset: 0,
    content: { mode: "none" },
  },
});

describe("asset query request", () => {
  test("parses a bounded request", async () => {
    await expect(
      readAssetQueryRequest(
        new Request("https://example.com", {
          method: "POST",
          body: validRequest,
        })
      )
    ).resolves.toMatchObject({ query: { limit: 1 } });
  });

  test("rejects declared and streamed bodies over the limit", async () => {
    await expect(
      readAssetQueryRequest(
        new Request("https://example.com", {
          method: "POST",
          headers: {
            "content-length": String(contentEngineLimits.requestBytes + 1),
          },
          body: validRequest,
        })
      )
    ).rejects.toThrow("exceeds the byte limit");

    await expect(
      readAssetQueryRequest(
        new Request("https://example.com", {
          method: "POST",
          body: "x".repeat(contentEngineLimits.requestBytes + 1),
        })
      )
    ).rejects.toThrow("exceeds the byte limit");
  });
});
