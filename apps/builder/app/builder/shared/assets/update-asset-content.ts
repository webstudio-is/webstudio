import type { Asset } from "@webstudio-is/sdk";
import { updateProjectAssetContent } from "@webstudio-is/http-client";
import { fetch } from "~/shared/fetch.client";
import { $authToken } from "~/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { getWebstudioData } from "~/shared/instance-utils/data";
import { invalidateAssets } from "~/shared/resources";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";

export const updateAssetContent = async ({
  asset,
  content,
}: {
  asset: Asset;
  content: string;
}): Promise<Asset> => {
  const projectId = $project.get()?.id;
  if (projectId === undefined) {
    throw new Error("Project not found");
  }

  const authToken = $authToken.get();
  const { asset: updatedAsset } = await updateProjectAssetContent({
    assetId: asset.id,
    projectId,
    expectedName: asset.name,
    origin: window.location.origin,
    authToken,
    readAssetData: async () => content,
    request: fetch,
  });

  createTransactionFromBuilderPatchPayload({
    data: getWebstudioData(),
    payload: [
      {
        namespace: "assets",
        patches: [
          {
            op: "replace",
            path: [updatedAsset.id],
            value: updatedAsset,
          },
        ],
      },
    ],
  });
  onNextTransactionComplete(invalidateAssets);
  return updatedAsset;
};
