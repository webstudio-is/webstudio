import type { Asset } from "@webstudio-is/sdk";
import { $assets } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync/sync-stores";

export const deleteAssets = (assetIds: Asset["id"][]) => {
  serverSyncStore.createTransaction([$assets], (assets) => {
    for (const assetId of assetIds) {
      assets.delete(assetId);
    }
  });
};
