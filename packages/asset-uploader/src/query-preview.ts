import { type AssetQueryRequestInput } from "@webstudio-is/sdk";
import type { AssetClient } from "./client";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  loadAuthorizedBuilderAssetRepository,
  type BuilderAssetIndexDependencies,
} from "./builder-canonical-entries";

export const previewAssetResourceQuery = async ({
  projectId,
  request,
  context,
  assetClient,
  dependencies = {},
}: {
  projectId: string;
  request: AssetQueryRequestInput;
  context: AppContext;
  assetClient: Pick<AssetClient, "readFile">;
  dependencies?: BuilderAssetIndexDependencies;
}) => {
  const repository = await loadAuthorizedBuilderAssetRepository({
    projectId,
    context,
    assetClient,
    authorizationError:
      "You don't have access to preview this project's asset resources",
    dependencies,
  });
  return await repository.query(request);
};
