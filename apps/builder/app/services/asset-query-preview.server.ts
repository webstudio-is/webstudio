import type { AssetQueryRequestInput } from "@webstudio-is/content-engine";
import type {
  AssetQueryDocumentGraphObserver,
  AssetQueryPerformanceObserver,
} from "@webstudio-is/asset-uploader/server";
import {
  previewProjectAssetQueries as previewSharedProjectAssetQueries,
  previewProjectAssetQuery as previewSharedProjectAssetQuery,
} from "@webstudio-is/project/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { createAssetClient } from "~/shared/asset-client";
import { getContentDatabaseMaxBytes } from "./content-database.server";

const defaultBatchDependencies = {
  createAssetClient,
  getContentDatabaseMaxBytes,
  previewProjectAssetQueries: previewSharedProjectAssetQueries,
};

const defaultQueryDependencies = {
  createAssetClient,
  getContentDatabaseMaxBytes,
  previewProjectAssetQuery: previewSharedProjectAssetQuery,
};

export const previewProjectAssetQueries = async (
  args: {
    projectId: string;
    requests: readonly AssetQueryRequestInput[];
    context: AppContext;
    signal?: AbortSignal;
    onPerformanceEvent?: AssetQueryPerformanceObserver;
    onDocumentGraphEvent?: AssetQueryDocumentGraphObserver;
  },
  dependencies = defaultBatchDependencies
) => {
  args.signal?.throwIfAborted();
  return await dependencies.previewProjectAssetQueries({
    ...args,
    assetClient: dependencies.createAssetClient(),
    contentDatabaseMaxBytes: dependencies.getContentDatabaseMaxBytes(),
  });
};

export const previewProjectAssetQuery = async (
  args: {
    projectId: string;
    request: AssetQueryRequestInput;
    context: AppContext;
    includeDiagnostics?: boolean;
    includeUnresolvedDiagnostics?: boolean;
    signal?: AbortSignal;
    onPerformanceEvent?: AssetQueryPerformanceObserver;
    onDocumentGraphEvent?: AssetQueryDocumentGraphObserver;
  },
  dependencies = defaultQueryDependencies
) => {
  args.signal?.throwIfAborted();
  return await dependencies.previewProjectAssetQuery({
    ...args,
    assetClient: dependencies.createAssetClient(),
    contentDatabaseMaxBytes: dependencies.getContentDatabaseMaxBytes(),
  });
};
