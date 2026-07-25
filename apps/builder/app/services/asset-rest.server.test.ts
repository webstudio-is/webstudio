import { describe, expect, test, vi } from "vitest";
import {
  AssetRepositoryConflictError,
  AssetRepositoryNotFoundError,
} from "@webstudio-is/asset-uploader/index.server";
import { assetFolders } from "@webstudio-is/sdk";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import {
  AssetRestRangeError,
  AssetRestRequestError,
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
} from "./asset-rest.server";

describe("Assets REST responses", () => {
  test.each([
    [new AssetRestRequestError("bad request"), 400],
    [new AuthorizationError("forbidden"), 403],
    [new AssetRepositoryNotFoundError("missing"), 404],
    [new AssetRepositoryConflictError("conflict"), 409],
    [new AssetRestRangeError("bad range"), 416],
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
});
