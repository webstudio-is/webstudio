import {
  previewAssetResourceQueries,
  previewAssetResourceQuery,
  measureAssetQueryPerformance,
  type AssetObjectStore,
  type AssetQueryDocumentGraphObserver,
  type AssetQueryPerformanceObserver,
} from "@webstudio-is/asset-uploader/server";
import {
  createAssetQueryPreviewCompilationPlan,
  createBuildContentCompilationPlan,
} from "@webstudio-is/project-build";
import {
  loadDevBuildByProjectId,
  loadDevBuildContentEngineDataByProjectId,
} from "@webstudio-is/project-build/server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";

const defaultBatchDependencies = {
  loadDevBuildContentEngineDataByProjectId,
  previewAssetResourceQueries,
};

const defaultQueryDependencies = {
  loadDevBuildByProjectId,
  previewAssetResourceQuery,
};

type ProjectAssetQueryContext = {
  projectId: string;
  context: AppContext;
  assetClient: Pick<AssetObjectStore, "readFile">;
  contentDatabaseMaxBytes?: number;
  signal?: AbortSignal;
  onPerformanceEvent?: AssetQueryPerformanceObserver;
  onDocumentGraphEvent?: AssetQueryDocumentGraphObserver;
};

export const previewProjectAssetQueries = async (
  {
    projectId,
    requests,
    context,
    assetClient,
    contentDatabaseMaxBytes,
    signal,
    onPerformanceEvent,
    onDocumentGraphEvent,
  }: ProjectAssetQueryContext & {
    requests: Parameters<typeof previewAssetResourceQueries>[0]["requests"];
  },
  dependencies = defaultBatchDependencies
) => {
  signal?.throwIfAborted();
  const build = await measureAssetQueryPerformance({
    phase: "build-plan",
    observer: onPerformanceEvent,
    operation: () =>
      dependencies.loadDevBuildContentEngineDataByProjectId(
        context,
        projectId,
        signal
      ),
  });
  signal?.throwIfAborted();
  return await dependencies.previewAssetResourceQueries({
    projectId,
    requests,
    context,
    assetClient,
    contentDatabaseMaxBytes,
    databasePlan: createBuildContentCompilationPlan(build),
    signal,
    onPerformanceEvent,
    onDocumentGraphEvent,
  });
};

export const previewProjectAssetQuery = async (
  {
    projectId,
    request,
    context,
    assetClient,
    contentDatabaseMaxBytes,
    includeDiagnostics,
    includeUnresolvedDiagnostics,
    signal,
    onPerformanceEvent,
    onDocumentGraphEvent,
  }: ProjectAssetQueryContext & {
    request: Parameters<typeof previewAssetResourceQuery>[0]["request"];
    includeDiagnostics?: boolean;
    includeUnresolvedDiagnostics?: boolean;
  },
  dependencies = defaultQueryDependencies
) => {
  signal?.throwIfAborted();
  const build = await measureAssetQueryPerformance({
    phase: "build-plan",
    observer: onPerformanceEvent,
    operation: () =>
      dependencies.loadDevBuildByProjectId(context, projectId, signal),
  });
  signal?.throwIfAborted();
  const databasePlan = createBuildContentCompilationPlan(build);
  return await dependencies.previewAssetResourceQuery({
    projectId,
    request,
    context,
    assetClient,
    contentDatabaseMaxBytes,
    databasePlan,
    signal,
    onPerformanceEvent,
    onDocumentGraphEvent,
    ...(includeDiagnostics === false
      ? {}
      : {
          diagnosticsPlan: createAssetQueryPreviewCompilationPlan({
            databasePlan,
            query: request.query,
          }),
        }),
    ...(includeDiagnostics === undefined ? {} : { includeDiagnostics }),
    ...(includeUnresolvedDiagnostics === true
      ? { includeUnresolvedDiagnostics: true }
      : {}),
  });
};
