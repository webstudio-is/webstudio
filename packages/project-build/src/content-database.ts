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
  decodeDataSourceVariable,
  getContentBlockSource,
  getPublishablePages,
  blockTemplateComponent,
  type DataSource,
  type Instance,
  type Prop,
  type Resource,
} from "@webstudio-is/sdk";
import {
  parseJsonExpression,
  parseStaticMemberPath,
} from "@webstudio-is/expression";
import type { Pages } from "@webstudio-is/sdk";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import { resolveMdxTemplates } from "./runtime/mdx-template-resolution";

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
    assets
      .filter(({ type, format }) => type === "file" && format === "mdx")
      .reduce((total, { size }) => total + size, 0)
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
  const visit = (instanceId: string) => {
    if (instanceIds.has(instanceId)) {
      return;
    }
    instanceIds.add(instanceId);
    const instance = instances.get(instanceId);
    if (
      instance === undefined ||
      instance.component === blockTemplateComponent
    ) {
      return;
    }
    for (const child of instance.children) {
      if (child.type === "id") {
        visit(child.value);
      }
    }
  };
  for (const page of getPublishablePages(build.pages)) {
    visit(page.rootInstanceId);
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

const getPublishedContentBlockSources = (
  build: PublishedContentDatabaseBuild,
  publishedInstanceIds: ReadonlySet<string> = getPublishedInstanceIds(build)
) => {
  const props = getBuildValues<Prop>(build.props);
  const blockIds = new Set(
    getBuildValues<Instance>(build.instances).flatMap((instance) =>
      instance.component === blockComponent &&
      publishedInstanceIds.has(instance.id)
        ? [instance.id]
        : []
    )
  );
  const propsByBlock = new Map<string, Prop[]>();
  for (const prop of props) {
    if (blockIds.has(prop.instanceId)) {
      const blockProps = propsByBlock.get(prop.instanceId) ?? [];
      blockProps.push(prop);
      propsByBlock.set(prop.instanceId, blockProps);
    }
  }
  return Array.from(blockIds).flatMap((blockInstanceId) => {
    const source = getContentBlockSource({
      blockInstanceId,
      props: propsByBlock.get(blockInstanceId) ?? [],
    });
    return source === undefined ? [] : [{ blockInstanceId, source }];
  });
};

export const getDynamicPublishedMdxSourceBlockIds = (
  build: PublishedContentDatabaseBuild,
  publishedInstanceIds: ReadonlySet<string> = getPublishedInstanceIds(build)
) =>
  getPublishedContentBlockSources(build, publishedInstanceIds).flatMap(
    ({ blockInstanceId, source }) =>
      source.type === "expression" &&
      source.value.length > 0 &&
      typeof parseJsonExpression(source.value) !== "string"
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
      if (source.type === "asset") {
        return source.assetId.length > 0 ? [source.assetId] : [];
      }
      const value = parseJsonExpression(source.value);
      if (typeof value === "string" && value.length > 0) {
        return [value];
      }
      return dynamicAssetIdsByBlock.get(blockInstanceId) ?? [];
    })
  );
  const dynamicSource = sources.find(
    ({ blockInstanceId, source }) =>
      source.type === "expression" &&
      source.value.length > 0 &&
      typeof parseJsonExpression(source.value) !== "string" &&
      dynamicAssetIdsByBlock.has(blockInstanceId) === false
  );
  if (dynamicSource !== undefined) {
    throw new Error(
      `Content Block "${dynamicSource.blockInstanceId}" uses a dynamic MDX source whose exact Asset dependencies cannot be determined safely for publication`
    );
  }
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
  const reachableIds = getPublishedInstanceIds(build);
  const pending = Array.from(reachableIds).filter(
    (id) => instances.get(id)?.component === blockComponent
  );
  const processed = new Set<string>();
  const visitTemplateSubtree = (instanceId: string) => {
    if (reachableIds.has(instanceId)) {
      return;
    }
    reachableIds.add(instanceId);
    const instance = instances.get(instanceId);
    if (
      instance === undefined ||
      instance.component === blockTemplateComponent
    ) {
      return;
    }
    if (instance.component === blockComponent) {
      pending.push(instance.id);
    }
    for (const child of instance.children) {
      if (child.type === "id") {
        visitTemplateSubtree(child.value);
      }
    }
  };

  while (pending.length > 0) {
    const blockId = pending.shift()!;
    if (processed.has(blockId)) {
      continue;
    }
    processed.add(blockId);
    const source = getContentBlockSource({ blockInstanceId: blockId, props });
    if (source === undefined) {
      continue;
    }
    const staticValue =
      source.type === "asset"
        ? source.assetId
        : parseJsonExpression(source.value);
    const assetIds =
      typeof staticValue === "string"
        ? [staticValue]
        : (resolvePublishedMdxAssetCandidates({
            build,
            artifact,
            blockInstanceIds: new Set([blockId]),
          }).get(blockId) ?? []);
    for (const assetId of assetIds) {
      const documentEntry = artifact.documents.find(
        ({ _id }) => _id === assetId
      );
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
      const document = await parseMdxDocument({ source: sourceText });
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
        metas: new Map(),
      });
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
      const query = basePlan?.queries.find(
        (candidate) => candidate.id === dataSource.resourceId
      );
      if (query === undefined || basePlan === undefined) {
        return [];
      }
      if (artifact.documentGraph !== undefined) {
        const graph = createDocumentGraph(artifact.documentGraph);
        if (getDocumentGraphQueryRootIds({ graph, query }).length > 0) {
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
      typeof parseJsonExpression(source.value) === "string"
    ) {
      continue;
    }
    const path = parseStaticMemberPath(source.value);
    const dataSourceId =
      path === undefined ? undefined : decodeDataSourceVariable(path[0]);
    const assetIds =
      dataSourceId === undefined || path === undefined
        ? []
        : evaluateDataSource(dataSourceId, path.slice(1)).filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0
          );
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
