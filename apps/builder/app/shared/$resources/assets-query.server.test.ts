import { beforeEach, describe, expect, test, vi } from "vitest";
import { previewAssetResourceQuery } from "@webstudio-is/asset-uploader/index.server";
import {
  AssetResourceQueryExecutionError,
  AssetResourceQueryValidationError,
} from "@webstudio-is/asset-resource";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { createContext } from "../context.server";
import { loader } from "./assets-query.server";

vi.mock("@webstudio-is/asset-uploader/index.server", () => ({
  previewAssetResourceQuery: vi.fn(),
}));
vi.mock("../context.server", () => ({ createContext: vi.fn() }));
vi.mock("../asset-client", () => ({
  createAssetClient: vi.fn(() => ({ readFile: vi.fn() })),
}));

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const outerRequest = () =>
  new Request(`https://p-${projectId}.localhost/rest/resources-loader`);
const innerRequest = (body: unknown) =>
  new Request(`https://p-${projectId}.localhost/$resources/assets/query`, {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("asset query preview system resource", () => {
  beforeEach(() => {
    vi.mocked(createContext).mockResolvedValue({} as never);
    vi.mocked(previewAssetResourceQuery).mockReset();
  });

  test("uses outer authentication context and the inner query body", async () => {
    const responseBody = {
      ok: true as const,
      result: [{ _id: "post-1" }],
      content: {},
      meta: {
        queryHash: "query-revision",
        indexRevision: "index-revision",
        assetRevision: "asset-revision",
        resultCount: 1,
        hydratedFileCount: 0,
        hydratedBytes: 0,
      },
    };
    vi.mocked(previewAssetResourceQuery).mockResolvedValue(responseBody);

    const response = await loader({
      request: outerRequest(),
      resourceRequest: innerRequest({ query: "*[]" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(responseBody);
    expect(createContext).toHaveBeenCalledWith(expect.any(Request));
    expect(previewAssetResourceQuery).toHaveBeenCalledWith({
      projectId,
      request: {
        query: "*[]",
        parameters: {},
        resultLimit: 100,
        content: { mode: "none" },
      },
      context: expect.anything(),
      assetClient: expect.objectContaining({ readFile: expect.any(Function) }),
    });
  });

  test("returns structured invalid-request and forbidden failures", async () => {
    const invalid = await loader({
      request: outerRequest(),
      resourceRequest: innerRequest({ query: "" }),
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST" },
    });

    vi.mocked(previewAssetResourceQuery).mockRejectedValue(
      new AuthorizationError("denied")
    );
    const forbidden = await loader({
      request: outerRequest(),
      resourceRequest: innerRequest({ query: "*[]" }),
    });
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  test("rejects malformed JSON and accepts hydration options", async () => {
    const malformed = await loader({
      request: outerRequest(),
      resourceRequest: new Request(
        `https://p-${projectId}.localhost/$resources/assets/query`,
        { method: "POST", body: "{" }
      ),
    });
    expect(malformed.status).toBe(400);

    vi.mocked(previewAssetResourceQuery).mockResolvedValue({
      ok: true,
      result: null,
      content: {},
      meta: {
        queryHash: "query-revision",
        indexRevision: "index-revision",
        assetRevision: "asset-revision",
        resultCount: 0,
        hydratedFileCount: 0,
        hydratedBytes: 0,
      },
    });
    const hydration = await loader({
      request: outerRequest(),
      resourceRequest: innerRequest({
        query: "*[0]",
        content: { mode: "full" },
      }),
    });
    expect(hydration.status).toBe(200);
    expect(previewAssetResourceQuery).toHaveBeenCalledWith({
      projectId,
      request: expect.objectContaining({ content: { mode: "full" } }),
      context: expect.anything(),
      assetClient: expect.objectContaining({ readFile: expect.any(Function) }),
    });
  });

  test("maps query validation and timeout errors", async () => {
    vi.mocked(previewAssetResourceQuery).mockRejectedValueOnce(
      new AssetResourceQueryValidationError({
        code: "INVALID_QUERY",
        message: "Invalid GROQ",
      })
    );
    const invalid = await loader({
      request: outerRequest(),
      resourceRequest: innerRequest({ query: "*[invalid ==" }),
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      error: { code: "INVALID_QUERY" },
    });

    vi.mocked(previewAssetResourceQuery).mockRejectedValueOnce(
      new AssetResourceQueryExecutionError({
        code: "QUERY_TIMEOUT",
        message: "Timed out",
      })
    );
    const timeout = await loader({
      request: outerRequest(),
      resourceRequest: innerRequest({ query: "*[]" }),
    });
    expect(timeout.status).toBe(504);
    await expect(timeout.json()).resolves.toMatchObject({
      error: { code: "QUERY_TIMEOUT" },
    });
  });
});
