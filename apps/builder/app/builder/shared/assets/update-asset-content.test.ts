import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { updateProjectAssetContent } from "@webstudio-is/http-client";
import { $authToken } from "~/shared/nano-states";
import { $assets, $pages, $project } from "~/shared/sync/data-stores";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  commitAssetContentUpdate,
  createUpdateAssetContent,
} from "./update-asset-content";
import {
  externalContentSyncStore,
  registerContainers,
  serverSyncStore,
} from "~/shared/sync/sync-stores";

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
    updateAssetContent({ asset, content: '{"a":1}', extension: "json" })
  ).resolves.toEqual(revision);

  expect(requestContentUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      assetId: "asset",
      projectId: "project",
      expectedName: "settings_old.json",
      extension: "json",
      authToken: "token",
      requestOrigin: window.location.origin,
    })
  );
  await expect(
    requestContentUpdate.mock.calls[0]?.[0].readAssetData()
  ).resolves.toBe('{"a":1}');
  expect(commitUpdatedAsset).toHaveBeenCalledWith(revision);
});

test("shares an already saved revision without writing it to the server again", () => {
  registerContainers();
  $pages.set(createDefaultPages({ rootInstanceId: "body" }));
  $assets.set(new Map([[asset.id, asset]]));
  const serverWrite = vi.fn();
  const canvasUpdate = vi.fn();
  const unsubscribeServer = serverSyncStore.subscribe(serverWrite);
  const unsubscribeCanvas = externalContentSyncStore.subscribe(canvasUpdate);
  try {
    const revision = { ...asset, name: "settings_new.json" };
    commitAssetContentUpdate(revision);
    expect($assets.get().get(asset.id)).toEqual(revision);
    expect(canvasUpdate).toHaveBeenCalledTimes(1);
    expect(serverWrite).not.toHaveBeenCalled();
  } finally {
    unsubscribeServer();
    unsubscribeCanvas();
    $assets.set(new Map());
    $pages.set(undefined);
  }
});

test("does not commit a conflicting revision", async () => {
  requestContentUpdate.mockRejectedValue(new Error("File changed"));

  await expect(updateAssetContent({ asset, content: "stale" })).rejects.toThrow(
    "File changed"
  );
  expect(commitUpdatedAsset).not.toHaveBeenCalled();
});

test("does not commit an updated Asset after the active project changes", async () => {
  const revision = {
    ...asset,
    name: "settings_new.json",
    size: 7,
    createdAt: "2026-07-18T00:00:00.000Z",
  };
  requestContentUpdate.mockImplementation(async () => {
    $project.set({ id: "another-project" } as never);
    return { asset: revision };
  });

  await expect(
    updateAssetContent({ asset, content: '{"a":1}' })
  ).rejects.toThrow(
    "The file was updated in the previous project. Return to that project to view it."
  );
  expect(commitUpdatedAsset).not.toHaveBeenCalled();
});
