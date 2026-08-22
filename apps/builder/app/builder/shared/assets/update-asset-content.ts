import type { Asset } from "@webstudio-is/sdk";
import { AssetRevisionConflictError } from "@webstudio-is/asset-uploader/content-repository";
import { updateProjectAssetContent } from "@webstudio-is/http-client";
import { fetch } from "~/shared/fetch.client";
import { $authToken } from "~/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { getWebstudioData } from "~/shared/instance-utils/data";
import { invalidateAssets } from "~/shared/resources";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { requireBuilderReload } from "~/shared/sync/reload-required";

type UpdateAssetContentDependencies = {
  requestContentUpdate: typeof updateProjectAssetContent;
  commitUpdatedAsset: (asset: Asset) => void;
  requireReload: (error: string) => void;
};

export const createUpdateAssetContent =
  (dependencies: UpdateAssetContentDependencies) =>
  async ({
    asset,
    content,
    extension,
  }: {
    asset: Asset;
    content: string;
    extension?: string;
  }): Promise<Asset> => {
    const projectId = $project.get()?.id;
    if (projectId === undefined) {
      throw new Error("Project not found");
    }

    const origin = window.location.origin;
    let updatedAsset: Asset;
    try {
      ({ asset: updatedAsset } = await dependencies.requestContentUpdate({
        assetId: asset.id,
        projectId,
        expectedName: asset.name,
        extension,
        origin,
        authToken: $authToken.get(),
        readAssetData: async () => content,
        request: fetch,
        requestOrigin: origin,
      }));
    } catch (error) {
      if (error instanceof AssetRevisionConflictError) {
        dependencies.requireReload(error.message);
      }
      throw error;
    }

    dependencies.commitUpdatedAsset(updatedAsset);
    return updatedAsset;
  };

export const updateAssetContent = createUpdateAssetContent({
  requestContentUpdate: updateProjectAssetContent,
  requireReload: (error) => requireBuilderReload({ error }),
  commitUpdatedAsset: (updatedAsset) => {
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
  },
});
