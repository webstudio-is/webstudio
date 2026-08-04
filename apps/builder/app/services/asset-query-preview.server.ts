import type { AssetQueryRequestInput } from "@webstudio-is/content-engine";
import {
  previewAssetResourceQueries,
  previewAssetResourceQuery,
} from "@webstudio-is/asset-uploader/server";
import {
  createAssetQueryPreviewCompilationPlan,
  createBuildContentCompilationPlan,
} from "@webstudio-is/project-build";
import {
  loadDevBuildByProjectId,
  loadDevBuildContentCompilationDataByProjectId,
} from "@webstudio-is/project-build/server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { createAssetClient } from "~/shared/asset-client";
import { getContentDatabaseMaxBytes } from "./content-database.server";

const defaultBatchDependencies = {
  createAssetClient,
  loadDevBuildContentCompilationDataByProjectId,
  previewAssetResourceQueries,
};

const defaultQueryDependencies = {
  createAssetClient,
  loadDevBuildByProjectId,
  previewAssetResourceQuery,
};

export const previewProjectAssetQueries = async (
  {
    projectId,
    requests,
    context,
    signal,
  }: {
    projectId: string;
    requests: readonly AssetQueryRequestInput[];
    context: AppContext;
    signal?: AbortSignal;
  },
  dependencies = defaultBatchDependencies
) => {
  signal?.throwIfAborted();
  const build =
    await dependencies.loadDevBuildContentCompilationDataByProjectId(
      context,
      projectId,
      signal
    );
  signal?.throwIfAborted();
  return await dependencies.previewAssetResourceQueries({
    projectId,
    requests,
    context,
    assetClient: dependencies.createAssetClient(),
    contentDatabaseMaxBytes: getContentDatabaseMaxBytes(),
    databasePlan: createBuildContentCompilationPlan(build),
    signal,
  });
};

export const previewProjectAssetQuery = async (
  {
    projectId,
    request,
    context,
    includeDiagnostics,
    includeUnresolvedDiagnostics,
    signal,
  }: {
    projectId: string;
    request: AssetQueryRequestInput;
    context: AppContext;
    includeDiagnostics?: boolean;
    includeUnresolvedDiagnostics?: boolean;
    signal?: AbortSignal;
  },
  dependencies = defaultQueryDependencies
) => {
  signal?.throwIfAborted();
  const build = await dependencies.loadDevBuildByProjectId(
    context,
    projectId,
    signal
  );
  signal?.throwIfAborted();
  const databasePlan = createBuildContentCompilationPlan(build);
  return await dependencies.previewAssetResourceQuery({
    projectId,
    request,
    context,
    assetClient: dependencies.createAssetClient(),
    contentDatabaseMaxBytes: getContentDatabaseMaxBytes(),
    databasePlan,
    signal,
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
