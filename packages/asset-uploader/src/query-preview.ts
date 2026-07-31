import {
  type AssetQueryRequestInput,
  type ContentCompilationPlan,
} from "@webstudio-is/content-engine";
import type { AssetObjectStore } from "./client";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { PostgresAssetRepository } from "./asset-repository";

export const previewAssetResourceQuery = async ({
  projectId,
  request,
  context,
  assetClient,
  contentDatabaseMaxBytes,
  databasePlan,
}: {
  projectId: string;
  request: AssetQueryRequestInput;
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  contentDatabaseMaxBytes?: number;
  databasePlan?: ContentCompilationPlan;
}) => {
  const repository = new PostgresAssetRepository({
    projectId,
    context,
    assetStore: assetClient,
    contentDatabaseMaxBytes,
  });
  return await repository.query(request, databasePlan);
};
