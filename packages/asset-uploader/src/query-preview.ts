import {
  type AssetQueryRequestInput,
  type ContentCompilationPlan,
  type DocumentGraphRuntimeObserver,
} from "@webstudio-is/content-engine";
import type { AssetObjectStore } from "./client";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { PostgresAssetRepository } from "./asset-repository";
import type { AssetQueryPerformanceObserver } from "./query-performance";

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
  onPerformanceEvent,
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
  onPerformanceEvent?: AssetQueryPerformanceObserver;
  signal?: AbortSignal;
}) => {
  const repository = new PostgresAssetRepository({
    projectId,
    context,
    assetStore: assetClient,
    contentDatabaseMaxBytes,
    onDocumentGraphEvent,
    onPerformanceEvent,
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
  onPerformanceEvent,
  signal,
}: {
  projectId: string;
  requests: readonly AssetQueryRequestInput[];
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  contentDatabaseMaxBytes?: number;
  databasePlan?: ContentCompilationPlan;
  onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
  onPerformanceEvent?: AssetQueryPerformanceObserver;
  signal?: AbortSignal;
}) => {
  const repository = new PostgresAssetRepository({
    projectId,
    context,
    assetStore: assetClient,
    contentDatabaseMaxBytes,
    onDocumentGraphEvent,
    onPerformanceEvent,
  });
  return await repository.queryMany(requests, { databasePlan, signal });
};
