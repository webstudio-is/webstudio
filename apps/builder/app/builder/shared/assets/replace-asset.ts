import type { Asset } from "@webstudio-is/sdk";
import { toast } from "@webstudio-is/design-system";
import { $assets, $pages, $props, $styles } from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import { replaceAssetMutable } from "@webstudio-is/project-build/runtime/assets";
import { uploadAssets } from "./upload-assets";

/**
 * Replace an image asset with a new file.
 *
 * 1. Uploads the new file via the existing upload pipeline
 * 2. Waits for the upload to complete (new asset appears in $assets)
 * 3. Re-points all references (props, styles, page meta) from old → new asset
 * 4. Copies filename & description from old asset to new asset
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

  const fileToAssetId = await uploadAssets("image", [file]);
  const newAssetId = fileToAssetId.get(file);

  if (!newAssetId) {
    toast.error("Failed to upload replacement asset");
    return;
  }

  await waitForAsset(newAssetId);

  serverSyncStore.createTransaction(
    [$pages, $props, $styles, $assets],
    (pages, props, styles, assets) => {
      const updatedNewAsset = assets.get(newAssetId);
      if (updatedNewAsset) {
        updatedNewAsset.description = oldAsset.description;
      }

      replaceAssetMutable({
        pages,
        props: props.values(),
        styles: styles.values(),
        replacement: {
          fromAssetId: oldAssetId,
          toAssetId: newAssetId,
        },
      });

      assets.delete(oldAssetId);
    }
  );

  onNextTransactionComplete(() => {
    invalidateAssets();
  });

  toast.success("Asset replaced successfully");
};

const waitForAsset = (assetId: string): Promise<Asset> => {
  // Check if asset already exists (avoids TDZ with synchronous subscribe callback)
  const existingAsset = $assets.get().get(assetId);
  if (existingAsset !== undefined) {
    return Promise.resolve(existingAsset);
  }

  // Use .listen() instead of .subscribe(), so the `unsubscribe` variable is always assigned before the callback runs.
  return new Promise((resolve) => {
    const unsubscribe = $assets.listen((assets) => {
      const asset = assets.get(assetId);
      if (asset !== undefined) {
        unsubscribe();
        resolve(asset);
      }
    });
  });
};
