import {
  assetQuery,
  createContentDatabase,
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
  hasDynamicContentCompilationValues,
  type AssetQueryInput,
  type ContentArtifactV1,
} from "@webstudio-is/content-engine";
import {
  createReachableAssetContentCompilationPlan,
  type DataSource,
  type Prop,
  type Resource,
} from "@webstudio-is/sdk";
import type { Build, CompactBuild } from "./types";

type ContentDatabaseBuild =
  | Pick<Build, "props" | "dataSources" | "resources">
  | Pick<CompactBuild, "props" | "dataSources" | "resources">;

const getBuildValues = <Item>(
  values: readonly Item[] | readonly (readonly [string, Item])[]
) =>
  values.map((value) =>
    Array.isArray(value) ? (value[1] as Item) : (value as Item)
  );

export const createBuildContentCompilationPlan = (
  build: ContentDatabaseBuild
) =>
  createReachableAssetContentCompilationPlan({
    props: getBuildValues<Prop>(build.props),
    dataSources: getBuildValues<DataSource>(build.dataSources),
    resources: getBuildValues<Resource>(build.resources),
  });

export const createAssetQueryPreviewCompilationPlan = ({
  build,
  query,
}: {
  build: ContentDatabaseBuild;
  query: AssetQueryInput;
}) => {
  const savedPlan = createBuildContentCompilationPlan(build);
  return createContentCompilationPlan([
    ...(savedPlan?.queries ?? []),
    createLiteralContentCompilationQuery({
      id: "__query-preview__",
      query: assetQuery.parse(query),
    }),
  ]);
};

export const getContentDatabasePublishDiagnostics = ({
  build,
  artifact,
}: {
  build: ContentDatabaseBuild;
  artifact: ContentArtifactV1 | undefined;
}) => {
  if (artifact === undefined) {
    return;
  }
  const plan = createBuildContentCompilationPlan(build);
  if (plan === undefined) {
    return;
  }
  return {
    stats: createContentDatabase({ artifact }).getStats(),
    queries: plan.queries.map((query) => ({
      id: query.id,
      kind: hasDynamicContentCompilationValues({ ...plan, queries: [query] })
        ? ("dynamic" as const)
        : ("static" as const),
    })),
  };
};
