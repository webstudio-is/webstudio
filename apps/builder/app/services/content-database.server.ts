import {
  createContentDatabase,
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
  hasDynamicContentCompilationValues,
  assetQuery,
  parseContentDatabaseMaxBytes,
  type AssetQueryInput,
} from "@webstudio-is/content-engine";
import type { CompactBuild } from "@webstudio-is/project-build";
import type { PublishedProjectBundle } from "@webstudio-is/protocol";
import { createReachableAssetContentCompilationPlan } from "@webstudio-is/sdk";

export const getContentDatabaseMaxBytes = () =>
  parseContentDatabaseMaxBytes(process.env.CONTENT_DATABASE_MAX_BYTES);

export type ContentDatabasePublishWarning = {
  includedDocumentCount: number;
  totalDocumentCount: number;
  omittedDocumentCount: number;
  usedKiB: number;
  maxKiB: number;
  omissionReason: "size" | "unavailable";
  affectedResources: Array<{
    name: string;
    kind: "dynamic" | "static";
  }>;
};

export const getContentDatabasePublishWarning = (
  bundle: PublishedProjectBundle
): ContentDatabasePublishWarning | undefined => {
  if (bundle.assetIndex === undefined) {
    return;
  }
  const plan = createReachableAssetContentCompilationPlan({
    props: bundle.build.props.map(([, prop]) => prop),
    dataSources: bundle.build.dataSources.map(([, dataSource]) => dataSource),
    resources: bundle.build.resources.map(([, resource]) => resource),
  });
  if (plan === undefined) {
    return;
  }
  const stats = createContentDatabase({
    artifact: bundle.assetIndex,
  }).getStats();
  if (stats.truncated === false || stats.omissionReason === undefined) {
    return;
  }
  const resourceNameById = new Map(
    bundle.build.resources.map(([, resource]) => [resource.id, resource.name])
  );
  const affectedResources = plan.queries.map((query) => ({
    name: resourceNameById.get(query.id) ?? query.id,
    kind: hasDynamicContentCompilationValues({ ...plan, queries: [query] })
      ? ("dynamic" as const)
      : ("static" as const),
  }));
  return {
    includedDocumentCount: stats.includedDocumentCount,
    totalDocumentCount:
      stats.includedDocumentCount + stats.omittedDocumentCount,
    omittedDocumentCount: stats.omittedDocumentCount,
    usedKiB: Math.ceil(stats.usedBytes / 1024),
    maxKiB: Math.ceil(stats.maxBytes / 1024),
    omissionReason: stats.omissionReason,
    affectedResources,
  };
};

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
