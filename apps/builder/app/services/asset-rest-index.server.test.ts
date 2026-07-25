import { describe, expect, test, vi } from "vitest";
import { createAssetIndexRefreshAction } from "./asset-rest-index.server";

const call = (
  action: ReturnType<typeof createAssetIndexRefreshAction>,
  headers?: HeadersInit
) =>
  action({
    request: new Request(
      "https://webstudio.is/rest/assets/index/refresh?projectId=project-1",
      { method: "POST", headers }
    ),
    params: {},
  } as never);

const createDependencies = (issues: Array<Record<string, string>> = []) => ({
  preventCrossOriginCookie: vi.fn(),
  checkCsrf: vi.fn(),
  createRepository: vi.fn(async () => ({
    synchronize: vi.fn(async () => ({
      scanned: 1,
      indexed: issues.length === 0 ? 1 : 0,
      metadataUpdated: 0,
      unchanged: 0,
      removed: 0,
      skipped: issues.length,
      inconsistent: 0,
      issues,
    })),
  })) as never,
});

describe("Assets index repair", () => {
  test("repairs metadata and protects cookie mutations with CSRF", async () => {
    const dependencies = createDependencies();
    const response = await call(createAssetIndexRefreshAction(dependencies));

    expect(response.status).toBe(200);
    expect(dependencies.checkCsrf).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({ indexed: 1 });
  });

  test("reports incomplete repair and accepts project-token authentication", async () => {
    const dependencies = createDependencies([
      {
        assetId: "asset-1",
        storageName: "post.md",
        revision: "revision-1",
        message: "Object is unavailable",
      },
    ]);
    const response = await call(createAssetIndexRefreshAction(dependencies), {
      "x-auth-token": "share-token",
    });

    expect(response.status).toBe(503);
    expect(dependencies.checkCsrf).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      issues: [expect.objectContaining({ assetId: "asset-1" })],
    });
  });
});
