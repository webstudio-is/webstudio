import {
  type AssetQueryRequestInput,
  type ContentCompilationPlan,
  type DocumentGraphRuntimeObserver,
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
  onDocumentGraphEvent,
}: {
  projectId: string;
  request: AssetQueryRequestInput;
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  contentDatabaseMaxBytes?: number;
  databasePlan?: ContentCompilationPlan;
  onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
}) => {
  const repository = new PostgresAssetRepository({
    projectId,
    context,
    assetStore: assetClient,
    contentDatabaseMaxBytes,
    onDocumentGraphEvent,
  });
  return await repository.query(request, databasePlan);
};
