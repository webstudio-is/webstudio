import { executeRuntimeMutation } from "~/shared/instance-utils/data";

export const moveAssetToFolder = (
  assetId: string,
  folderId: string | undefined
) =>
  executeRuntimeMutation({
    id: "assets.update",
    input: { assetId, values: { folderId: folderId ?? null } },
  });
