import {
  assetQuery,
  createContentDatabase,
  createContentCompilationPlan,
  createDocumentGraph,
  createLiteralContentCompilationQuery,
  getDocumentGraphQueryRootIds,
  hasDynamicContentCompilationValues,
  type AssetQueryInput,
  type ContentCompilationPlan,
  type ContentArtifactV1,
  defaultAssetResourceOutputSelection,
  getAssetQueryFieldValue,
  selectContentHydrationCandidates,
  type AssetFileDocument,
} from "@webstudio-is/content-engine";
import {
  blockComponent,
  collectionComponent,
  createReachableAssetContentCompilationPlan,
  createReachableAssetContentCompilationPlanResult,
  decodeDataSourceVariable,
  findTreeInstanceIdsExcludingBlockTemplates,
  getContentBlockSource,
  getContentBlockSources,
  getStaticContentBlockSourceAssetId,
  isMdxFileAsset,
  getPublishablePages,
  type DataSource,
  type Instance,
  type Prop,
  type Resource,
} from "@webstudio-is/sdk";
import { parseStaticMemberPath } from "@webstudio-is/expression";
import type { Pages } from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { parseMdxDocumentRecovering } from "@webstudio-is/content-engine/mdx";
import {
  assertMdxTemplateStructure,
  resolveMdxTemplates,
} from "./runtime/mdx-template-resolution";

type BuildValues<Value> =
  | readonly Value[]
  | readonly (readonly [string, Value])[];

type ContentDatabaseBuild = {
  props: BuildValues<Prop>;
  dataSources: BuildValues<DataSource>;
  resources: BuildValues<Resource>;
};

type PublishedContentDatabaseBuild = ContentDatabaseBuild & {
  instances: BuildValues<Instance>;
  pages?: Pages;
};

const publishedMdxTotalBytes = 32 * 1024 * 1024;

export const getPublishedMdxContentDatabaseMaxBytes = ({
  baseBytes,
  assets,
}: {
  baseBytes: number;
  assets: readonly Readonly<{
    type: string;
    format: string;
    size: number;
  }>[];
}) =>
  baseBytes +
  Math.min(
    publishedMdxTotalBytes,
    assets.filter(isMdxFileAsset).reduce((total, { size }) => total + size, 0)
  );

const getPublishedInstanceIds = (build: PublishedContentDatabaseBuild) => {
  if (build.pages === undefined) {
    throw new Error("Published Content Block discovery requires page roots");
  }
  const instances = new Map(
    getBuildValues<Instance>(build.instances).map((instance) => [
      instance.id,
      instance,
    ])
  );
  const instanceIds = new Set<string>();
  for (const page of getPublishablePages(build.pages)) {
    for (const instanceId of findTreeInstanceIdsExcludingBlockTemplates(
      instances,
      page.rootInstanceId
    )) {
      instanceIds.add(instanceId);
    }
  }
  return instanceIds;
};

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

export const createBuildContentCompilationPlanResult = (
  build: ContentDatabaseBuild
) =>
  createReachableAssetContentCompilationPlanResult({
    props: getBuildValues<Prop>(build.props),
    dataSources: getBuildValues<DataSource>(build.dataSources),
    resources: getBuildValues<Resource>(build.resources),
  });

const getPublishedContentBlockSources = (
  build: PublishedContentDatabaseBuild,
  publishedInstanceIds: ReadonlySet<string> = getPublishedInstanceIds(build)
) => {
  const sources = getContentBlockSources({
    instances: getBuildValues<Instance>(build.instances).filter(({ id }) =>
      publishedInstanceIds.has(id)
    ),
    props: getBuildValues<Prop>(build.props),
  });
  return Array.from(sources, ([blockInstanceId, source]) => ({
    blockInstanceId,
    source,
  }));
};

export const getDynamicPublishedMdxSourceBlockIds = (
  build: PublishedContentDatabaseBuild,
  publishedInstanceIds: ReadonlySet<string> = getPublishedInstanceIds(build)
) =>
  getPublishedContentBlockSources(build, publishedInstanceIds).flatMap(
    ({ blockInstanceId, source }) =>
      source.type === "expression" &&
      source.value.length > 0 &&
      getStaticContentBlockSourceAssetId(source) === undefined
        ? [blockInstanceId]
        : []
  );

export const hasDynamicPublishedMdxSources = (
  build: PublishedContentDatabaseBuild,
  publishedInstanceIds?: ReadonlySet<string>
) =>
  getDynamicPublishedMdxSourceBlockIds(build, publishedInstanceIds).length > 0;

export const createPublishedBuildContentCompilationPlan = (
  build: PublishedContentDatabaseBuild,
  dynamicAssetIdsByBlock: ReadonlyMap<string, readonly string[]> = new Map(),
  publishedInstanceIds: ReadonlySet<string> = getPublishedInstanceIds(build)
) => {
  const sources = getPublishedContentBlockSources(build, publishedInstanceIds);
  const directAssetIds = new Set(
    sources.flatMap(({ blockInstanceId, source }) => {
      const assetId = getStaticContentBlockSourceAssetId(source);
      if (assetId !== undefined && assetId.length > 0) {
        return [assetId];
      }
      return dynamicAssetIdsByBlock.get(blockInstanceId) ?? [];
    })
  );
  const createMdxQuery = ({
    id,
    assetId,
  }: {
    id: string;
    assetId: string;
  }) => ({
    id,
    result: "many" as const,
    where: {
      all: [
        {
          field: ["extension"],
          operator: "eq" as const,
          value: { type: "literal" as const, value: "mdx" },
        },
        {
          field: ["id"],
          operator: "eq" as const,
          value: { type: "literal" as const, value: assetId },
        },
      ],
    },
    sort: [],
    // Keep content in the revisioned runtime artifact instead of folding it
    // into a materialized query result that the page compiler cannot consume.
    limit: { type: "dynamic" as const },
    offset: { type: "literal" as const, value: 0 },
    output: defaultAssetResourceOutputSelection,
    content: { mode: "full" as const },
  });
  return createContentCompilationPlan([
    ...(createBuildContentCompilationPlan(build)?.queries ?? []),
    ...Array.from(directAssetIds)
      .sort()
      .map((assetId) =>
        createMdxQuery({
          id: `__content-block-mdx__:${assetId}`,
          assetId,
        })
      ),
  ]);
};

/** Expands publication reachability through only the templates referenced by MDX. */
export const resolvePublishedMdxDependencyClosure = async ({
  build,
  artifact,
}: {
  build: PublishedContentDatabaseBuild;
  artifact: ContentArtifactV1;
}) => {
  const instances = new Map(
    getBuildValues<Instance>(build.instances).map((instance) => [
      instance.id,
      instance,
    ])
  );
  const props = getBuildValues<Prop>(build.props);
  const propsById = new Map(props.map((prop) => [prop.id, prop]));
  const sourcesByBlockId = getContentBlockSources({
    instances: instances.values(),
    props,
  });
  const documentsById = new Map(
    artifact.documents.map((document) => [document._id, document])
  );
  const reachableIds = getPublishedInstanceIds(build);
  const pending = Array.from(reachableIds).filter(
    (id) => instances.get(id)?.component === blockComponent
  );
  const processed = new Set<string>();
  const visitTemplateSubtree = (rootInstanceId: string) => {
    for (const instanceId of findTreeInstanceIdsExcludingBlockTemplates(
      instances,
      rootInstanceId
    )) {
      if (reachableIds.has(instanceId)) {
        continue;
      }
      reachableIds.add(instanceId);
      if (instances.get(instanceId)?.component === blockComponent) {
        pending.push(instanceId);
      }
    }
  };

  while (pending.length > 0) {
    const blockId = pending.shift()!;
    if (processed.has(blockId)) {
      continue;
    }
    processed.add(blockId);
    const source = sourcesByBlockId.get(blockId);
    if (source === undefined) {
      continue;
    }
    const staticValue = getStaticContentBlockSourceAssetId(source);
    const assetIds =
      typeof staticValue === "string"
        ? [staticValue]
        : (resolvePublishedMdxAssetCandidates({
            build,
            artifact,
            blockInstanceIds: new Set([blockId]),
          }).get(blockId) ?? []);
    for (const assetId of assetIds) {
      const documentEntry = documentsById.get(assetId);
      const sourceText =
        documentEntry?.contentRef === undefined
          ? undefined
          : artifact.contents?.[documentEntry.contentRef];
      if (
        documentEntry?.revision === undefined ||
        documentEntry.contentRef === undefined ||
        sourceText === undefined
      ) {
        continue;
      }
      const parsed = await parseMdxDocumentRecovering({ source: sourceText });
      if (parsed.status === "unrecoverable") {
        continue;
      }
      const document = parsed.document;
      const resolution = resolveMdxTemplates({
        document,
        identity: {
          blockInstanceId: blockId,
          assetId,
          revision: documentEntry.revision,
          contentRef: documentEntry.contentRef,
          format: "mdx",
          renderScope: "publication-dependency-discovery",
        },
        instances,
        props: propsById,
        metas: componentMetas,
      });
      assertMdxTemplateStructure(resolution);
      for (const reference of resolution.references) {
        if (reference.type === "resolved-template") {
          visitTemplateSubtree(reference.templateInstanceId);
        }
      }
    }
  }
  const candidates = resolvePublishedMdxAssetCandidates({
    build,
    artifact,
    blockInstanceIds: reachableIds,
    allowUnresolved: true,
  });
  return createPublishedBuildContentCompilationPlan(
    build,
    candidates,
    reachableIds
  );
};

const candidateDocumentKey = Symbol("candidate-document");
type CandidateDocument = Readonly<{
  [candidateDocumentKey]: AssetFileDocument;
}>;

const isCandidateDocument = (value: unknown): value is CandidateDocument =>
  typeof value === "object" && value !== null && candidateDocumentKey in value;

const getValueAtPath = (
  value: unknown | CandidateDocument,
  path: readonly string[]
): unknown => {
  if (isCandidateDocument(value)) {
    return path.length === 0
      ? value[candidateDocumentKey]._id
      : getAssetQueryFieldValue(value[candidateDocumentKey], [...path]);
  }
  let current = value;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) {
      return;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

/** Resolves a finite dynamic src candidate set from compiled query records. */
export const resolvePublishedMdxAssetCandidates = ({
  build,
  artifact,
  allowUnresolved = false,
  blockInstanceIds = getPublishedInstanceIds(build),
}: {
  build: PublishedContentDatabaseBuild;
  artifact?: ContentArtifactV1;
  allowUnresolved?: boolean;
  blockInstanceIds?: ReadonlySet<string>;
}) => {
  const instances = new Map(
    getBuildValues<Instance>(build.instances).map((instance) => [
      instance.id,
      instance,
    ])
  );
  const props = getBuildValues<Prop>(build.props);
  const propsByInstance = new Map<string, Prop[]>();
  for (const prop of props) {
    const values = propsByInstance.get(prop.instanceId) ?? [];
    values.push(prop);
    propsByInstance.set(prop.instanceId, values);
  }
  const dataSources = new Map(
    getBuildValues<DataSource>(build.dataSources).map((dataSource) => [
      dataSource.id,
      dataSource,
    ])
  );
  const basePlan = createBuildContentCompilationPlan(build);
  const queriesById = new Map(
    (basePlan?.queries ?? []).map((query) => [query.id, query])
  );
  const documentGraph =
    artifact?.documentGraph === undefined
      ? undefined
      : createDocumentGraph(artifact.documentGraph);
  const documents = (artifact?.documents ?? []).filter(
    (document): document is AssetFileDocument => document._type === "asset.file"
  );

  const evaluateDataSource = (
    dataSourceId: string,
    path: readonly string[],
    visiting = new Set<string>()
  ): unknown[] => {
    if (visiting.has(dataSourceId)) {
      throw new Error("Dynamic MDX source data dependency is cyclic");
    }
    const dataSource = dataSources.get(dataSourceId);
    if (dataSource === undefined) {
      return [];
    }
    if (dataSource.type === "variable") {
      // Project variables can be changed by actions after publication. Their
      // initial value is therefore not a complete dependency set.
      return [];
    }
    if (dataSource.type === "resource") {
      if (artifact === undefined) {
        return [];
      }
      const includedDocumentCount =
        artifact.database?.includedDocumentCount ?? artifact.documents.length;
      const sourceDocumentCount =
        artifact.database?.sourceDocumentCount ?? includedDocumentCount;
      if (includedDocumentCount < sourceDocumentCount) {
        throw new Error(
          "Dynamic MDX source candidates cannot be proven from a truncated content database"
        );
      }
      const query = queriesById.get(dataSource.resourceId);
      if (query === undefined || basePlan === undefined) {
        return [];
      }
      if (documentGraph !== undefined) {
        if (
          getDocumentGraphQueryRootIds({ graph: documentGraph, query }).length >
          0
        ) {
          throw new Error(
            "Dynamic MDX source candidates through resolved document references are not supported safely for publication"
          );
        }
      }
      const candidateIds = selectContentHydrationCandidates({
        documents,
        plan: {
          ...basePlan,
          queries: [
            {
              ...query,
              content: { mode: "full" },
            },
          ],
        },
      });
      const fieldPath = path[0] === "data" ? path.slice(1) : path;
      return documents
        .filter(({ _id }) => candidateIds.has(_id))
        .map((document) =>
          fieldPath.length === 0
            ? ({
                [candidateDocumentKey]: document,
              } satisfies CandidateDocument)
            : getAssetQueryFieldValue(document, [...fieldPath])
        );
    }
    const collection = instances.get(dataSource.scopeInstanceId ?? "");
    if (collection?.component !== collectionComponent) {
      return [];
    }
    const dataProp = propsByInstance
      .get(collection.id)
      ?.find((prop) => prop.name === "data");
    const parameterProp = propsByInstance
      .get(collection.id)
      ?.find(
        (prop) => prop.type === "parameter" && prop.value === dataSource.id
      );
    if (parameterProp?.name !== "item" && parameterProp?.name !== "itemKey") {
      return [];
    }
    let iterables: unknown[] = [];
    if (dataProp?.type === "json") {
      iterables = [dataProp.value];
    } else if (dataProp?.type === "expression") {
      const dataPath = parseStaticMemberPath(dataProp.value);
      const dependencyId =
        dataPath === undefined
          ? undefined
          : decodeDataSourceVariable(dataPath[0]);
      if (dependencyId !== undefined && dataPath !== undefined) {
        visiting.add(dataSourceId);
        iterables = evaluateDataSource(
          dependencyId,
          dataPath.slice(1),
          visiting
        );
        visiting.delete(dataSourceId);
      }
    }
    const items = iterables.flatMap((iterable) => {
      if (Array.isArray(iterable)) {
        return parameterProp.name === "itemKey"
          ? iterable.map((_, index) => index)
          : iterable;
      }
      if (
        typeof iterable === "object" &&
        iterable !== null &&
        isCandidateDocument(iterable) === false
      ) {
        return parameterProp.name === "itemKey"
          ? Object.keys(iterable)
          : Object.values(iterable);
      }
      return [iterable];
    });
    return items.map((item) => getValueAtPath(item, path));
  };

  const candidatesByBlock = new Map<string, readonly string[]>();
  for (const blockInstanceId of blockInstanceIds) {
    if (instances.get(blockInstanceId)?.component !== blockComponent) {
      continue;
    }
    const source = getContentBlockSource({
      blockInstanceId,
      props: propsByInstance.get(blockInstanceId) ?? [],
    });
    if (
      source?.type !== "expression" ||
      getStaticContentBlockSourceAssetId(source) !== undefined
    ) {
      continue;
    }
    const path = parseStaticMemberPath(source.value);
    const dataSourceId =
      path === undefined ? undefined : decodeDataSourceVariable(path[0]);
    let assetIds: string[] = [];
    try {
      assetIds =
        dataSourceId === undefined || path === undefined
          ? []
          : evaluateDataSource(dataSourceId, path.slice(1)).filter(
              (value): value is string =>
                typeof value === "string" && value.length > 0
            );
    } catch (error) {
      if (allowUnresolved === false) {
        throw error;
      }
    }
    if (assetIds.length === 0) {
      if (allowUnresolved) {
        continue;
      }
      throw new Error(
        `Content Block "${blockInstanceId}" has no finite dynamic MDX Asset candidates`
      );
    }
    candidatesByBlock.set(
      blockInstanceId,
      Array.from(new Set(assetIds)).sort()
    );
  }
  return candidatesByBlock;
};

export const createAssetQueryPreviewCompilationPlan = ({
  databasePlan,
  query,
}: {
  databasePlan: ContentCompilationPlan | undefined;
  query: AssetQueryInput;
}) =>
  createContentCompilationPlan([
    ...(databasePlan?.queries ?? []),
    createLiteralContentCompilationQuery({
      id: "__query-preview__",
      query: assetQuery.parse(query),
    }),
  ]);

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
