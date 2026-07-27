import { type AssetQueryRequestInput } from "@webstudio-is/content-engine";
import type { AssetObjectStore } from "./client";
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
  contentDatabaseMaxBytes,
}: {
  projectId: string;
  request: AssetQueryRequestInput;
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  dependencies?: BuilderAssetIndexDependencies;
  contentDatabaseMaxBytes?: number;
}) => {
  const repository = await loadAuthorizedBuilderAssetRepository({
    projectId,
    context,
    assetClient,
    authorizationError:
      "You don't have access to preview this project's asset resources",
    dependencies,
    contentDatabaseMaxBytes,
  });
  return await repository.query(request);
};
