import { beforeEach, expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { $uploadingFilesDataStore } from "~/shared/nano-states";
import { $assets } from "~/shared/sync/data-stores";
import { waitForAssetUpload } from "./upload-assets";

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

test("resolves an existing asset", async () => {
  $assets.set(new Map([[asset.id, asset]]));

  await expect(waitForAssetUpload(asset.id)).resolves.toBe(asset);
});

test("waits for an asset to finish uploading", async () => {
  $uploadingFilesDataStore.set([{ assetId: asset.id } as never]);
  const result = waitForAssetUpload(asset.id);

  $assets.set(new Map([[asset.id, asset]]));

  await expect(result).resolves.toBe(asset);
});

test("rejects when an upload fails", async () => {
  $uploadingFilesDataStore.set([{ assetId: asset.id } as never]);
  const result = waitForAssetUpload(asset.id);

  $uploadingFilesDataStore.set([]);

  await expect(result).rejects.toThrow("Failed to upload asset");
});
