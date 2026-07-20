import { beforeEach, expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { $uploadingFilesDataStore } from "~/shared/nano-states";
import { $assets } from "~/shared/sync/data-stores";
import { waitForAsset } from "./replace-asset";

const asset = {
  id: "replacement",
  type: "file",
  name: "data_hash.json",
  format: "json",
  projectId: "project",
  size: 2,
  createdAt: "",
  meta: {},
} satisfies Asset;

beforeEach(() => {
  $assets.set(new Map());
  $uploadingFilesDataStore.set([]);
});

test("resolves an existing replacement asset", async () => {
  $assets.set(new Map([[asset.id, asset]]));

  await expect(waitForAsset(asset.id)).resolves.toBe(asset);
});

test("waits for a replacement asset to finish uploading", async () => {
  $uploadingFilesDataStore.set([{ assetId: asset.id } as never]);
  const result = waitForAsset(asset.id);

  $assets.set(new Map([[asset.id, asset]]));

  await expect(result).resolves.toBe(asset);
});

test("rejects when a replacement upload fails", async () => {
  $uploadingFilesDataStore.set([{ assetId: asset.id } as never]);
  const result = waitForAsset(asset.id);

  $uploadingFilesDataStore.set([]);

  await expect(result).rejects.toThrow("Failed to upload asset");
});
