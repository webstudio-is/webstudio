import type { Asset } from "@webstudio-is/sdk";
import { getMimeTypeByExtension } from "@webstudio-is/sdk";
import type { AssetContentActionResponse } from "~/routes/rest.assets.$assetId.content";
import { restAssetContentPath } from "~/shared/router-utils";
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

  const headers = new Headers({
    "Content-Type": getMimeTypeByExtension(asset.format) ?? "text/plain",
  });
  const authToken = $authToken.get();
  if (authToken !== undefined) {
    headers.set("x-auth-token", authToken);
  }
  const response = await fetch(
    restAssetContentPath({
      assetId: asset.id,
      projectId,
      expectedName: asset.name,
    }),
    { method: "PUT", body: content, headers }
  );
  const result = (await response.json()) as AssetContentActionResponse;
  if ("errors" in result) {
    throw new Error(result.errors);
  }

  createTransactionFromBuilderPatchPayload({
    data: getWebstudioData(),
    payload: [
      {
        namespace: "assets",
        patches: [
          {
            op: "replace",
            path: [result.asset.id],
            value: result.asset,
          },
        ],
      },
    ],
  });
  onNextTransactionComplete(invalidateAssets);
  return result.asset;
};
