import { getAllPages, type Asset } from "@webstudio-is/sdk";
import { toast } from "@webstudio-is/design-system";
import { $assets, $pages, $props, $styles } from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import { uploadAssets } from "./upload-assets";
import type { StyleValue } from "@webstudio-is/css-engine";

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

      for (const prop of props.values()) {
        if (prop.type === "asset" && prop.value === oldAssetId) {
          prop.value = newAssetId;
        }
      }

      for (const styleDecl of styles.values()) {
        replaceAssetInStyleValue(styleDecl.value, oldAssetId, newAssetId);
      }

      if (pages) {
        if (pages.meta?.faviconAssetId === oldAssetId) {
          pages.meta.faviconAssetId = newAssetId;
        }
        for (const page of getAllPages(pages)) {
          if (page.meta.socialImageAssetId === oldAssetId) {
            page.meta.socialImageAssetId = newAssetId;
          }
          if (page.marketplace?.thumbnailAssetId === oldAssetId) {
            page.marketplace.thumbnailAssetId = newAssetId;
          }
        }
      }

      assets.delete(oldAssetId);
    }
  );

  onNextTransactionComplete(() => {
    invalidateAssets();
  });

  toast.success("Asset replaced successfully");
};

const replaceAssetInStyleValue = (
  styleValue: StyleValue,
  oldAssetId: string,
  newAssetId: string
): void => {
  if (
    styleValue.type === "image" &&
    styleValue.value.type === "asset" &&
    styleValue.value.value === oldAssetId
  ) {
    styleValue.value.value = newAssetId;
  }
  if (styleValue.type === "tuple") {
    for (const item of styleValue.value) {
      replaceAssetInStyleValue(item, oldAssetId, newAssetId);
    }
  }
  if (styleValue.type === "layers") {
    for (const item of styleValue.value) {
      replaceAssetInStyleValue(item, oldAssetId, newAssetId);
    }
  }
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

export const __testing__ = { replaceAssetInStyleValue };
