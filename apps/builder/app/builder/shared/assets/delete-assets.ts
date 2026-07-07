import type { Asset } from "@webstudio-is/sdk";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";

export const deleteAssets = (assetIds: Asset["id"][]) => {
  executeRuntimeMutation({
    id: "assets.delete",
    input: { assetIdsOrPrefixes: assetIds, force: true },
  });

  // Wait for server to confirm transaction, then invalidate cache
  onNextTransactionComplete(() => {
    invalidateAssets();
  });
};
