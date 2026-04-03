import type { Asset } from "@webstudio-is/sdk";
import { toast } from "@webstudio-is/design-system";
import { $assets, $pages, $props, $styles } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
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

  const newAsset = await waitForAsset(newAssetId);

  if (!newAsset) {
    toast.error("Replacement asset upload timed out");
    return;
  }

  serverSyncStore.createTransaction(
    [$pages, $props, $styles, $assets],
    (pages, props, styles, assets) => {
      // Copy metadata from old asset to new asset
      const updatedNewAsset = assets.get(newAssetId);
      if (updatedNewAsset) {
        updatedNewAsset.filename = oldAsset.filename;
        updatedNewAsset.description = oldAsset.description;
      }

      // Update props referencing the old asset
      for (const prop of props.values()) {
        if (
          prop.type === "asset" &&
          prop.value === oldAssetId &&
          prop.name !== "width" &&
          prop.name !== "height"
        ) {
          prop.value = newAssetId;
        }
      }

      // Update styles referencing the old asset
      for (const [, styleDecl] of styles) {
        replaceAssetInStyleValue(styleDecl.value, oldAssetId, newAssetId);
      }

      // Update page meta references
      if (pages) {
        if (pages.meta?.faviconAssetId === oldAssetId) {
          pages.meta.faviconAssetId = newAssetId;
        }
        for (const page of [pages.homePage, ...pages.pages]) {
          if (page.meta.socialImageAssetId === oldAssetId) {
            page.meta.socialImageAssetId = newAssetId;
          }
          if (page.marketplace?.thumbnailAssetId === oldAssetId) {
            page.marketplace.thumbnailAssetId = newAssetId;
          }
        }
      }

      // Delete the old asset
      assets.delete(oldAssetId);
    }
  );

  // Wait for server to confirm, then invalidate cache
  onNextTransactionComplete(() => {
    invalidateAssets();
  });

  toast.success("Asset replaced successfully");
};

/**
 * Recursively traverse a style value and replace asset references.
 */
import type { StyleValue } from "@webstudio-is/css-engine";

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

/**
 * Wait for an asset to appear in the $assets store.
 * Uses polling with a timeout to avoid infinite waits.
 */
const waitForAsset = (
  assetId: string,
  timeoutMs = 60_000,
  intervalMs = 500
): Promise<Asset | undefined> => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      const asset = $assets.get().get(assetId);
      // Asset exists and has been fully uploaded (has a non-empty createdAt)
      if (asset && asset.createdAt !== "") {
        resolve(asset);
        return;
      }
      if (Date.now() - startTime > timeoutMs) {
        resolve(undefined);
        return;
      }
      setTimeout(check, intervalMs);
    };

    check();
  });
};
