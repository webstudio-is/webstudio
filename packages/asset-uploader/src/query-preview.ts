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
  diagnosticsPlan,
  includeDiagnostics,
  includeUnresolvedDiagnostics,
  onDocumentGraphEvent,
  signal,
}: {
  projectId: string;
  request: AssetQueryRequestInput;
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  contentDatabaseMaxBytes?: number;
  databasePlan?: ContentCompilationPlan;
  diagnosticsPlan?: ContentCompilationPlan;
  includeDiagnostics?: boolean;
  includeUnresolvedDiagnostics?: boolean;
  onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
  signal?: AbortSignal;
}) => {
  const repository = new PostgresAssetRepository({
    projectId,
    context,
    assetStore: assetClient,
    contentDatabaseMaxBytes,
    onDocumentGraphEvent,
  });
  const options = {
    databasePlan,
    diagnosticsPlan,
    includeUnresolvedDiagnostics,
    signal,
  };
  if (includeDiagnostics === false) {
    return await repository.query(request, {
      ...options,
      includeDiagnostics: false,
    });
  }
  return await repository.query(request, {
    ...options,
    includeDiagnostics: true,
  });
};

export const previewAssetResourceQueries = async ({
  projectId,
  requests,
  context,
  assetClient,
  contentDatabaseMaxBytes,
  databasePlan,
  onDocumentGraphEvent,
  signal,
}: {
  projectId: string;
  requests: readonly AssetQueryRequestInput[];
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  contentDatabaseMaxBytes?: number;
  databasePlan?: ContentCompilationPlan;
  onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
  signal?: AbortSignal;
}) => {
  const repository = new PostgresAssetRepository({
    projectId,
    context,
    assetStore: assetClient,
    contentDatabaseMaxBytes,
    onDocumentGraphEvent,
  });
  return await repository.queryMany(requests, { databasePlan, signal });
};
