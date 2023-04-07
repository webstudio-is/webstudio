import type { AppContext } from "@webstudio-is/trpc-interface/server";
import type { AssetClient } from "./client";
import { createAssetWithLimit } from "./db/create";

export const uploadAssets = async (
  {
    request,
    projectId,
  }: {
    request: Request;
    projectId: string;
  },
  context: AppContext,
  client: AssetClient
) => {
  const asset = await createAssetWithLimit(
    projectId,
    () => {
      return client.uploadFile(request);
    },
    context
  );

  return [asset];
};
