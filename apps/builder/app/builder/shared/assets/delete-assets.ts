import type { Asset } from "@webstudio-is/sdk";
import { $assets } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";

export const deleteAssets = (assetIds: Asset["id"][]) => {
  serverSyncStore.createTransaction([$assets], (assets) => {
    for (const assetId of assetIds) {
      assets.delete(assetId);
    }
  });

  // Wait for server to confirm transaction, then invalidate cache
  onNextTransactionComplete(() => {
    invalidateAssets();
  });
};
