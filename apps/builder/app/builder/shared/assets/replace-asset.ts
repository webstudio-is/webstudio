import type { Asset } from "@webstudio-is/sdk";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { toast } from "@webstudio-is/design-system";
import { $assets } from "~/shared/sync/data-stores";
import { $uploadingFilesDataStore } from "~/shared/nano-states";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { uploadAssets } from "./upload-assets";

/**
 * Replace an asset with a new file.
 *
 * 1. Uploads the new file via the existing upload pipeline
 * 2. Waits for the upload to complete (new asset appears in $assets)
 * 3. Re-points all references (props, styles, page meta) from old → new asset
 * 4. Copies the description from the old asset to the new asset
 * 5. Deletes the old asset
 */
export const replaceAsset = async (
  oldAssetId: Asset["id"],
  file: File,
  options: {
    type?: AssetType;
    successMessage?: string;
  } = {}
): Promise<Asset["id"] | undefined> => {
  const oldAsset = $assets.get().get(oldAssetId);
  if (!oldAsset) {
    toast.error("Original asset not found");
    return;
  }

  const fileToAssetId = await uploadAssets(options.type ?? "image", [file], {
    folderId: oldAsset.folderId,
  });
  const newAssetId = fileToAssetId.get(file);

  if (!newAssetId) {
    toast.error("Failed to upload replacement asset");
    return;
  }

  try {
    await waitForAsset(newAssetId);
  } catch {
    return;
  }

  try {
    const result = executeRuntimeMutation({
      id: "assets.replace",
      input: { fromAssetId: oldAssetId, toAssetId: newAssetId },
    });
    if (result === undefined) {
      throw new Error("Asset replacement is not permitted");
    }
  } catch (error) {
    executeRuntimeMutation({
      id: "assets.delete",
      input: { assetIdsOrPrefixes: [newAssetId], force: true },
    });
    toast.error(
      error instanceof Error ? error.message : "Failed to replace asset"
    );
    return;
  }

  onNextTransactionComplete(() => {
    invalidateAssets();
  });

  toast.success(options.successMessage ?? "Asset replaced successfully");
  return newAssetId;
};

const waitForAsset = (assetId: string): Promise<Asset> => {
  // Check if asset already exists (avoids TDZ with synchronous subscribe callback)
  const existingAsset = $assets.get().get(assetId);
  if (existingAsset !== undefined) {
    return Promise.resolve(existingAsset);
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      unsubscribeAssets();
      unsubscribeUploads();
    };
    const check = () => {
      const assets = $assets.get();
      const asset = assets.get(assetId);
      if (asset !== undefined) {
        cleanup();
        resolve(asset);
        return;
      }

      const isUploading = $uploadingFilesDataStore
        .get()
        .some((fileData) => fileData.assetId === assetId);
      if (isUploading === false) {
        cleanup();
        reject(new Error("Failed to upload replacement asset"));
      }
    };
    const unsubscribeAssets = $assets.listen(check);
    const unsubscribeUploads = $uploadingFilesDataStore.listen(check);
    check();
  });
};

export const __testing__ = { waitForAsset };
