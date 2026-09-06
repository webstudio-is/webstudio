import type { Asset } from "@webstudio-is/sdk";
import { updateProjectAssetContent } from "@webstudio-is/http-client";
import { fetch } from "~/shared/fetch.client";
import { $authToken } from "~/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { getWebstudioData } from "~/shared/instance-utils/data";
import { invalidateAssets } from "~/shared/resources";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";

type UpdateAssetContentDependencies = {
  requestContentUpdate: typeof updateProjectAssetContent;
  commitUpdatedAsset: (asset: Asset) => void;
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
    if (asset.projectId !== projectId) {
      throw new Error("The file belongs to another project.");
    }

    const origin = window.location.origin;
    const { asset: updatedAsset } = await dependencies.requestContentUpdate({
      assetId: asset.id,
      projectId,
      expectedName: asset.name,
      extension,
      origin,
      authToken: $authToken.get(),
      readAssetData: async () => content,
      request: fetch,
      requestOrigin: origin,
    });
    if ($project.get()?.id !== projectId) {
      throw new Error(
        "The file was updated in the previous project. Return to that project to view it."
      );
    }

    dependencies.commitUpdatedAsset(updatedAsset);
    return updatedAsset;
  };

export const updateAssetContent = createUpdateAssetContent({
  requestContentUpdate: updateProjectAssetContent,
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
