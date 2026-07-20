import type { Asset } from "@webstudio-is/sdk";
import { toast } from "@webstudio-is/design-system";
import { $assets } from "~/shared/sync/data-stores";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { uploadSingleAsset } from "./upload-assets";

/**
 * Replace an image asset with a new file.
 *
 * 1. Uploads the new file via the existing upload pipeline
 * 2. Waits for the upload to complete (new asset appears in $assets)
 * 3. Re-points all references (props, styles, page meta) from old → new asset
 * 4. Copies the description from the old asset to the new asset
 * 5. Deletes the old asset
 */
export const replaceAsset = async (
  oldAssetId: Asset["id"],
  file: File
): Promise<void> => {
  const oldAsset = $assets.get().get(oldAssetId);
  if (!oldAsset) {
    toast.error("Original asset not found");
    return;
  }

  let newAsset: Asset | undefined;
  try {
    newAsset = await uploadSingleAsset("image", file, {
      folderId: oldAsset.folderId,
    });
  } catch {
    return;
  }
  if (newAsset === undefined) {
    toast.error("Failed to upload replacement asset");
    return;
  }
  const newAssetId = newAsset.id;

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

  toast.success("Asset replaced successfully");
};
