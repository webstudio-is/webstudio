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
  test("limits omitted queries to 20 results", async () => {
    await expect(
      readAssetQueryRequest(
        new Request("https://example.com", {
          method: "POST",
          body: JSON.stringify({ query: {} }),
        })
      )
    ).resolves.toMatchObject({ query: { limit: 20 } });
  });

  test("parses a bounded request", async () => {
    await expect(
      readAssetQueryRequest(
        new Request("https://example.com", {
          method: "POST",
          body: validRequest,
        })
      )
    ).resolves.toMatchObject({
      query: {
        limit: 1,
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["url"], ["width"], ["height"]],
        },
      },
    });
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

  test("rejects malformed UTF-8 instead of replacing invalid bytes", async () => {
    const prefix = new TextEncoder().encode(
      '{"query":{"where":{"all":[]},"sort":[],"limit":1,"offset":0,"content":{"mode":"none"}},"indexRevision":"'
    );
    const suffix = new TextEncoder().encode('"}');
    const body = new Uint8Array(prefix.byteLength + 1 + suffix.byteLength);
    body.set(prefix);
    body[prefix.byteLength] = 0xff;
    body.set(suffix, prefix.byteLength + 1);

    await expect(
      readAssetQueryRequest(
        new Request("https://example.com", { method: "POST", body })
      )
    ).rejects.toThrow("Asset query request is invalid");
  });
});
