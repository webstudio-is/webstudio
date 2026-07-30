import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetObjectStore } from "./client";
import { PostgresAssetRepository } from "./asset-repository";

export const loadBuilderAssetFieldCatalog = async ({
  projectId,
  context,
  assetClient,
}: {
  projectId: string;
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
}) => {
  const repository = new PostgresAssetRepository({
    projectId,
    context,
    assetStore: assetClient,
  });
  return await repository.readFieldCatalog();
};
