import { type AssetQueryRequestInput } from "@webstudio-is/content-engine";
import type { AssetObjectStore } from "./client";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  createBuilderAssetRepository,
  type BuilderAssetRepositoryDependencies,
} from "./builder-asset-repository";

export const previewAssetResourceQuery = async ({
  projectId,
  request,
  context,
  assetClient,
  dependencies = {},
  contentDatabaseMaxBytes,
}: {
  projectId: string;
  request: AssetQueryRequestInput;
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  dependencies?: BuilderAssetRepositoryDependencies;
  contentDatabaseMaxBytes?: number;
}) => {
  const repository = createBuilderAssetRepository({
    projectId,
    context,
    assetClient,
    dependencies,
    contentDatabaseMaxBytes,
  });
  return await repository.query(request);
};
