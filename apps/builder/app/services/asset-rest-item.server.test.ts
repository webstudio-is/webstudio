import { describe, expect, test, vi } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { AssetRepositoryNotFoundError } from "@webstudio-is/asset-uploader/server";
import { createAssetAction } from "./asset-rest-route-handlers.server";

const asset: Asset = {
  id: "asset-1",
  projectId: "project-1",
  name: "post.md",
  filename: "Post",
  description: null,
  type: "file",
  format: "md",
  size: 10,
  createdAt: "2026-07-25T00:00:00.000Z",
  meta: {},
};

const createDependencies = () => {
  const updateMetadata = vi.fn().mockResolvedValue(asset);
  const deleteAsset = vi.fn().mockResolvedValue(undefined);
  const createRepository = vi.fn(async () => ({
    updateMetadata,
    delete: deleteAsset,
  }));
  return {
    updateMetadata,
    deleteAsset,
    createRepository,
    dependencies: {
      preventCrossOriginCookie: vi.fn(),
      ensureApiCsrf: vi.fn(),
      createRepository: createRepository as never,
    } satisfies Parameters<typeof createAssetAction>[0],
  };
};

const callAction = (
  action: ReturnType<typeof createAssetAction>,
  request: Request
) => action({ request, params: { assetId: "asset-1" } } as never);

describe("mutable Assets REST route", () => {
  test("rejects unsupported methods before authorization", async () => {
    const { dependencies, createRepository } = createDependencies();
    const response = await callAction(
      createAssetAction(dependencies),
      new Request(
        "https://webstudio.is/rest/assets/asset-1?projectId=project-1",
        { method: "POST" }
      )
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("PATCH, DELETE");
    expect(dependencies.ensureApiCsrf).not.toHaveBeenCalled();
    expect(createRepository).not.toHaveBeenCalled();
  });

  test("updates metadata through the repository with browser CSRF protection", async () => {
    const { dependencies, updateMetadata } = createDependencies();
    const action = createAssetAction(dependencies);
    const response = await callAction(
      action,
      new Request(
        "https://webstudio.is/rest/assets/asset-1?projectId=project-1",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filename: "Post", folderId: null }),
        }
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ asset });
    expect(dependencies.ensureApiCsrf).toHaveBeenCalledOnce();
    expect(updateMetadata).toHaveBeenCalledWith("asset-1", {
      filename: "Post",
      folderId: null,
    });
  });

  test("returns the same metadata contract for project-token authentication", async () => {
    const { dependencies, createRepository, updateMetadata } =
      createDependencies();
    const response = await callAction(
      createAssetAction(dependencies),
      new Request(
        "https://webstudio.is/rest/assets/asset-1?projectId=project-1",
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-auth-token": "token",
          },
          body: JSON.stringify({ filename: "Post", folderId: null }),
        }
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ asset });
    expect(dependencies.ensureApiCsrf).toHaveBeenCalledOnce();
    expect(createRepository).toHaveBeenCalledWith(expect.any(Request), "edit");
    expect(updateMetadata).toHaveBeenCalledWith("asset-1", {
      filename: "Post",
      folderId: null,
    });
  });

  test("deletes through the repository and accepts token-authenticated requests", async () => {
    const { dependencies, deleteAsset } = createDependencies();
    const action = createAssetAction(dependencies);
    const response = await callAction(
      action,
      new Request(
        "https://webstudio.is/rest/assets/asset-1?projectId=project-1",
        {
          method: "DELETE",
          headers: { "x-auth-token": "token" },
        }
      )
    );

    expect(response.status).toBe(204);
    expect(dependencies.ensureApiCsrf).toHaveBeenCalledOnce();
    expect(deleteAsset).toHaveBeenCalledWith(["asset-1"]);
  });

  test("returns a forbidden response for repository authorization failures", async () => {
    const { dependencies, createRepository } = createDependencies();
    createRepository.mockRejectedValue(
      new AuthorizationError("You don't have access") as never
    );
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await callAction(
      createAssetAction(dependencies),
      new Request(
        "https://webstudio.is/rest/assets/asset-1?projectId=project-1",
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-auth-token": "token",
          },
          body: JSON.stringify({ description: "Updated" }),
        }
      )
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      errors: "You don't have access",
    });
    report.mockRestore();
  });

  test.each([
    ["PATCH", "updateMetadata"],
    ["DELETE", "deleteAsset"],
  ] as const)(
    "returns not found when %s targets a missing asset",
    async (method, operation) => {
      const dependencies = createDependencies();
      dependencies[operation].mockRejectedValue(
        new AssetRepositoryNotFoundError("Asset not found")
      );
      const requestInit: RequestInit = {
        method,
        headers: { "x-auth-token": "token" },
      };
      if (method === "PATCH") {
        requestInit.headers = {
          ...requestInit.headers,
          "content-type": "application/json",
        };
        requestInit.body = JSON.stringify({ description: "Missing" });
      }

      const response = await callAction(
        createAssetAction(dependencies.dependencies),
        new Request(
          "https://webstudio.is/rest/assets/missing?projectId=project-1",
          requestInit
        )
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ errors: "Asset not found" });
    }
  );

  test("rejects oversized JSON before calling the repository", async () => {
    const { dependencies, updateMetadata } = createDependencies();
    const response = await callAction(
      createAssetAction(dependencies),
      new Request(
        "https://webstudio.is/rest/assets/asset-1?projectId=project-1",
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-auth-token": "token",
          },
          body: JSON.stringify({
            description: "x".repeat(
              assetResourceLimits.restMutationRequestBytes
            ),
          }),
        }
      )
    );

    expect(response.status).toBe(413);
    expect(updateMetadata).not.toHaveBeenCalled();
  });
});
