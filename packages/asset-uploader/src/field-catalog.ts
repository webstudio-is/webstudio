import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetObjectStore } from "./client";
import {
  createBuilderAssetRepository,
  type BuilderAssetRepositoryDependencies,
} from "./builder-asset-repository";

export const loadBuilderAssetFieldCatalog = async ({
  projectId,
  context,
  assetClient,
  dependencies = {},
}: {
  projectId: string;
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  dependencies?: BuilderAssetRepositoryDependencies;
}) => {
  const repository = createBuilderAssetRepository({
    projectId,
    context,
    assetClient,
    dependencies,
  });
  return await repository.readFieldCatalog();
};
