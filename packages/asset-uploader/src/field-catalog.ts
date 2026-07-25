import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetClient } from "./client";
import {
  loadAuthorizedBuilderAssetRepository,
  type BuilderAssetIndexDependencies,
} from "./builder-canonical-entries";

export const loadBuilderAssetFieldCatalog = async ({
  projectId,
  context,
  assetClient,
  dependencies = {},
}: {
  projectId: string;
  context: AppContext;
  assetClient: Pick<AssetClient, "readFile">;
  dependencies?: BuilderAssetIndexDependencies;
}) => {
  const repository = await loadAuthorizedBuilderAssetRepository({
    projectId,
    context,
    assetClient,
    authorizationError:
      "You don't have access to this project's asset field catalog",
    dependencies,
  });
  return (await repository.readIndex()).fieldCatalog;
};
