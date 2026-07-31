import {
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
  assetQuery,
  parseContentDatabaseMaxBytes,
  type AssetQueryInput,
} from "@webstudio-is/content-engine";
import type { CompactBuild } from "@webstudio-is/project-build";
import { createReachableAssetContentCompilationPlan } from "@webstudio-is/sdk";

export const getContentDatabaseMaxBytes = () =>
  parseContentDatabaseMaxBytes(process.env.CONTENT_DATABASE_MAX_BYTES);

export const createAssetQueryPreviewDatabasePlan = ({
  build,
  query,
}: {
  build: Pick<CompactBuild, "props" | "dataSources" | "resources">;
  query: AssetQueryInput;
}) => {
  const savedPlan = createReachableAssetContentCompilationPlan(build);
  return createContentCompilationPlan([
    ...(savedPlan?.queries ?? []),
    createLiteralContentCompilationQuery({
      id: "__query-preview__",
      query: assetQuery.parse(query),
    }),
  ]);
};
