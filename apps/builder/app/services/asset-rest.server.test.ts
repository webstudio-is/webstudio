import { describe, expect, test, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  AssetRepositoryConflictError,
  AssetRepositoryNotFoundError,
} from "@webstudio-is/asset-uploader/server";
import { assetFolders } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import {
  AssetRestRangeError,
  AssetRestPayloadTooLargeError,
  AssetRestRequestError,
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  parseAssetRestDescription,
  parseAssetRestMetadataHeader,
  readAssetRestFormData,
  readAssetRestJson,
} from "./asset-rest.server";
import { AssetUploadSizeLimitError } from "@webstudio-is/asset-uploader/server";

describe("Assets REST responses", () => {
  test.each([
    [new AssetRestRequestError("bad request"), 400],
    [new AuthorizationError("forbidden"), 403],
    [new TRPCError({ code: "UNAUTHORIZED" }), 401],
    [new TRPCError({ code: "FORBIDDEN" }), 403],
    [new AssetRepositoryNotFoundError("missing"), 404],
    [new AssetRepositoryConflictError("conflict"), 409],
    [new AssetRestRangeError("bad range"), 416],
    [new AssetRestPayloadTooLargeError("too large"), 413],
    [new AssetUploadSizeLimitError("post.md", 10), 413],
  ])("maps domain errors to HTTP status", async (error, status) => {
    const response = assetRestErrorResponse(error);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ errors: error.message });
  });

  test("maps duplicate sibling folders to conflict", () => {
    const error = assetFolders.safeParse(
      new Map([
        [
          "one",
          {
            id: "one",
            projectId: "project-1",
            name: "Blog",
            createdAt: "2026-07-25T00:00:00.000Z",
          },
        ],
        [
          "two",
          {
            id: "two",
            projectId: "project-1",
            name: "Blog",
            createdAt: "2026-07-25T00:00:00.000Z",
          },
        ],
      ])
    ).error;
    expect(error).toBeDefined();
    expect(assetRestErrorResponse(error).status).toBe(409);
  });

  test("does not swallow CSRF responses and advertises allowed methods", () => {
    const csrf = new Response("Forbidden", { status: 403 });
    expect(assetRestErrorResponse(csrf)).toBe(csrf);
    const response = assetRestMethodNotAllowed(["GET", "PATCH"]);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, PATCH");
  });

  test("does not expose unexpected internal errors", async () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = assetRestErrorResponse(new Error("database password"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errors: "Internal Assets API error",
    });
    report.mockRestore();
  });

  test("bounds mutation bodies before parsing JSON", async () => {
    await expect(
      readAssetRestJson(
        new Request("https://example.com/rest/assets", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "content-length": String(
              assetResourceLimits.restMutationRequestBytes + 1
            ),
          },
          body: "{}",
        })
      )
    ).rejects.toBeInstanceOf(AssetRestPayloadTooLargeError);

    await expect(
      readAssetRestJson(
        new Request("https://example.com/rest/assets", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            description: "x".repeat(
              assetResourceLimits.restMutationRequestBytes
            ),
          }),
        })
      )
    ).rejects.toBeInstanceOf(AssetRestPayloadTooLargeError);
  });

  test("bounds upload metadata carried in headers", () => {
    expect(() =>
      parseAssetRestDescription(
        "x".repeat(assetResourceLimits.assetDescriptionCharacters + 1)
      )
    ).toThrow(AssetRestRequestError);
    expect(() =>
      parseAssetRestMetadataHeader(
        "x".repeat(assetResourceLimits.restMutationRequestBytes + 1)
      )
    ).toThrow(AssetRestPayloadTooLargeError);
    expect(() => parseAssetRestMetadataHeader("{")).toThrow(
      AssetRestRequestError
    );
  });

  test("parses bounded multipart forms and rejects oversized forms", async () => {
    const form = new FormData();
    form.set("projectId", "project-1");
    form.set("filename", "post.md");
    const parsed = await readAssetRestFormData(
      new Request("https://example.com/rest/assets/uploads", {
        method: "POST",
        body: form,
      })
    );
    expect(Object.fromEntries(parsed)).toEqual({
      projectId: "project-1",
      filename: "post.md",
    });

    await expect(
      readAssetRestFormData(
        new Request("https://example.com/rest/assets/uploads", {
          method: "POST",
          headers: {
            "content-type": "multipart/form-data; boundary=test",
            "content-length": String(
              assetResourceLimits.restMutationRequestBytes + 1
            ),
          },
          body: "--test--",
        })
      )
    ).rejects.toBeInstanceOf(AssetRestPayloadTooLargeError);
  });
});
