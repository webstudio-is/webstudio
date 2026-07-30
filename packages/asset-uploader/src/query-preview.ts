import { type AssetQueryRequestInput } from "@webstudio-is/content-engine";
import type { AssetObjectStore } from "./client";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { PostgresAssetRepository } from "./asset-repository";

export const previewAssetResourceQuery = async ({
  projectId,
  request,
  context,
  assetClient,
  contentDatabaseMaxBytes,
}: {
  projectId: string;
  request: AssetQueryRequestInput;
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  contentDatabaseMaxBytes?: number;
}) => {
  const repository = new PostgresAssetRepository({
    projectId,
    context,
    assetStore: assetClient,
    contentDatabaseMaxBytes,
  });
  return await repository.query(request);
};
