import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { updateProjectAssetContent } from "@webstudio-is/http-client";
import { $authToken } from "~/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { createUpdateAssetContent } from "./update-asset-content";

const requestContentUpdate = vi.fn<typeof updateProjectAssetContent>();
const commitUpdatedAsset = vi.fn();
const updateAssetContent = createUpdateAssetContent({
  requestContentUpdate,
  commitUpdatedAsset,
});

const asset = {
  id: "asset",
  projectId: "project",
  name: "settings_old.json",
  format: "json",
  size: 2,
  type: "file" as const,
  meta: {},
  createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  requestContentUpdate.mockReset();
  commitUpdatedAsset.mockReset();
  $project.set({ id: "project" } as never);
  $authToken.set("token");
});

afterEach(() => {
  $project.set(undefined);
  $authToken.set(undefined);
});

test("commits a content revision without changing the asset id", async () => {
  const revision = {
    ...asset,
    name: "settings_new.json",
    size: 7,
    createdAt: "2026-07-18T00:00:00.000Z",
  };
  requestContentUpdate.mockResolvedValue({ asset: revision });

  await expect(
    updateAssetContent({ asset, content: '{"a":1}' })
  ).resolves.toEqual(revision);

  expect(requestContentUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      assetId: "asset",
      projectId: "project",
      expectedName: "settings_old.json",
      authToken: "token",
      requestOrigin: window.location.origin,
    })
  );
  await expect(
    requestContentUpdate.mock.calls[0]?.[0].readAssetData()
  ).resolves.toBe('{"a":1}');
  expect(commitUpdatedAsset).toHaveBeenCalledWith(revision);
});

test("does not commit a conflicting revision", async () => {
  requestContentUpdate.mockRejectedValue(new Error("File changed"));

  await expect(updateAssetContent({ asset, content: "stale" })).rejects.toThrow(
    "File changed"
  );
  expect(commitUpdatedAsset).not.toHaveBeenCalled();
});
