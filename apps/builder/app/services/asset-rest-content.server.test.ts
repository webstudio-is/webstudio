import { describe, expect, test, vi } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import {
  createAssetContentLoader,
  parseRequestRange,
} from "./asset-rest-content.server";

const asset: Asset = {
  id: "asset-1",
  projectId: "project-1",
  name: "post.md",
  type: "file",
  format: "md",
  size: 10,
  description: null,
  createdAt: "2026-07-25T00:00:00.000Z",
  meta: {},
};

describe("Assets REST content download", () => {
  test("parses one standard byte range", () => {
    expect(parseRequestRange("bytes=2-5", 10)).toEqual({
      offset: 2,
      length: 4,
    });
    expect(() => parseRequestRange("bytes=0-1,4-5", 10)).toThrow(
      "single valid byte range"
    );
    expect(() => parseRequestRange("items=0-1", 10)).toThrow(
      "single valid byte range"
    );
  });

  test("streams an authorized partial response", async () => {
    const readContent = vi.fn(async () => ({
      asset,
      data: {
        async *[Symbol.asyncIterator]() {
          yield new TextEncoder().encode("post");
        },
      },
      contentLength: 4,
    }));
    const dependencies = {
      preventCrossOriginCookie: vi.fn(),
      createRepository: vi.fn(async () => ({
        get: vi.fn(async () => asset),
        readContent,
      })) as never,
    };
    const response = await createAssetContentLoader(dependencies)({
      request: new Request(
        "https://webstudio.is/rest/assets/asset-1/content?projectId=project-1",
        { headers: { range: "bytes=2-5", "x-auth-token": "token" } }
      ),
      params: { assetId: "asset-1" },
    } as never);

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(response.headers.get("content-length")).toBe("4");
    expect(await response.text()).toBe("post");
    expect(readContent).toHaveBeenCalledWith({
      assetId: "asset-1",
      range: { offset: 2, length: 4 },
      asset,
    });
  });
});
