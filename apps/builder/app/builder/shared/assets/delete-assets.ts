import type { Asset } from "@webstudio-is/sdk";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";

export const deleteAssets = (
  assetIds: Asset["id"][],
  { force = true }: { force?: boolean } = {}
) => {
  executeRuntimeMutation({
    id: "assets.delete",
    input: { assetIds, force },
  });

  // Wait for server to confirm transaction, then invalidate cache
  onNextTransactionComplete(() => {
    invalidateAssets();
  });
};
