// @todo this file structure is WIP
// What we actually need is load assets panel based on a route and only load
// data, js etc for assets when we are on that route

import { ActionFunction } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import {
  deleteAsset,
  uploadAssets,
} from "@webstudio-is/asset-uploader/index.server";
import { toast } from "@webstudio-is/design-system";
import { useEffect } from "react";
import { zfd } from "zod-form-data";
import type { ActionData } from "~/designer/shared/assets";

const DeleteAssetInput = zfd.formData({
  assetId: zfd.text(),
  assetName: zfd.text(),
});

export const action: ActionFunction = async ({
  request,
  params,
}): Promise<ActionData | undefined> => {
  if (params.id === undefined) throw new Error("Project id undefined");
  try {
    if (request.method === "DELETE") {
      const { assetId, assetName } = DeleteAssetInput.parse(
        await request.formData()
      );
      const deletedAsset = await deleteAsset({
        id: assetId,
        name: assetName,
      });
      return { deletedAsset };
    }

    if (request.method === "POST") {
      const assets = await uploadAssets({
        request,
        projectId: params.id,
      });
      return {
        uploadedAssets: assets.map((asset) => ({
          ...asset,
          status: "uploaded",
        })),
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
};

export const useAction = () => {
  const actionData: ActionData | undefined = useActionData();

  useEffect(() => {
    if (actionData?.errors) {
      toast.error(actionData.errors);
    }
  }, [actionData]);
};
