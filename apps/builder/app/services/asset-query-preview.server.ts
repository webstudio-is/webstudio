import type { AssetQueryRequestInput } from "@webstudio-is/content-engine";
import { previewAssetResourceQuery } from "@webstudio-is/asset-uploader/server";
import { createAssetQueryPreviewCompilationPlan } from "@webstudio-is/project-build";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { createAssetClient } from "~/shared/asset-client";
import { getContentDatabaseMaxBytes } from "./content-database.server";

const defaultDependencies = {
  createAssetClient,
  loadDevBuildByProjectId,
  previewAssetResourceQuery,
};

export const previewProjectAssetQuery = async (
  {
    projectId,
    request,
    context,
  }: {
    projectId: string;
    request: AssetQueryRequestInput;
    context: AppContext;
  },
  dependencies = defaultDependencies
) => {
  const build = await dependencies.loadDevBuildByProjectId(context, projectId);
  return await dependencies.previewAssetResourceQuery({
    projectId,
    request,
    context,
    assetClient: dependencies.createAssetClient(),
    contentDatabaseMaxBytes: getContentDatabaseMaxBytes(),
    databasePlan: createAssetQueryPreviewCompilationPlan({
      build,
      query: request.query,
    }),
  });
};
