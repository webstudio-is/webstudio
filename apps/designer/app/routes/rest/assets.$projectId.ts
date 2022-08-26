import type { ActionFunction } from "@remix-run/node";

import { uploadAssets } from "~/shared/db/misc.server";
import { deleteAsset } from "@webstudio-is/asset-uploader/index.server";
import { zfd } from "zod-form-data";
import { Asset } from "@webstudio-is/prisma-client";

const deleteAssetSchema = zfd.formData({
  assetId: zfd.text(),
  assetName: zfd.text(),
});

export const action: ActionFunction = async ({ params, request }) => {
  if (params.projectId === undefined) throw new Error("Project id undefined");
  try {
    if (request.method === "DELETE") {
      const { assetId, assetName } = deleteAssetSchema.parse(
        await request.formData()
      );
      const deletedAsset = await deleteAsset({
        id: assetId,
        name: assetName,
      });

      return { deletedAsset };
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  if (request.method === "POST") {
    try {
      const assets = await uploadAssets({
        request,
        projectId: params.projectId,
      });
      return {
        uploadedAssets: assets.map((asset: Asset) => ({
          ...asset,
          status: "uploaded",
        })),
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          errors: error.message,
        };
      }
    }
  }
};
