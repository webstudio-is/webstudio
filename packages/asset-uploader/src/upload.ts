import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetClient } from "./client";
import { createAssetWithLimit } from "./db/create";

export const uploadAssets = async (
  {
    request,
    projectId,
    maxAssetsPerProject,
  }: {
    request: Request;
    projectId: string;
    maxAssetsPerProject: number;
  },
  context: AppContext,
  client: AssetClient
) => {
  const asset = await createAssetWithLimit(
    projectId,
    () => {
      return client.uploadFile(request);
    },
    context,
    {
      maxAssetsPerProject,
    }
  );

  return [asset];
};
