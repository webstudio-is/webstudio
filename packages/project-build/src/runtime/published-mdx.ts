import {
  parseMdxDocumentRecovering,
  type MdxDocument,
} from "@webstudio-is/content-engine/mdx";
import type {
  AssetValueReference,
  ContentArtifactV1,
} from "@webstudio-is/content-engine";
import {
  contentEngineLimits,
  createDocumentGraph,
  getDocumentGraphClosure,
} from "@webstudio-is/content-engine";
import {
  blockComponent,
  decodeDataSourceVariable,
  getAssetContentHash,
  getContentBlockSources,
  getStaticContentBlockSourceAssetId,
  type DataSource,
  type Prop,
  type ContentBlockDiagnostic,
  type ContentBlockExternalContentIdentity,
  type ContentBlockSource,
  type WebstudioData,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { parseStaticMemberPath } from "@webstudio-is/expression";
import { materializeMdxAuthoredContent } from "./mdx-authored-content";
import {
  materializeMdxTemplates,
  type MdxTemplateDependency,
} from "./mdx-materialization";
import { resolveMdxTemplates } from "./mdx-template-resolution";
import {
  createMdxContentModelDiagnostics,
  createMdxDiagnostics,
} from "./mdx-diagnostics";

export type PublishedMdxWarning = Readonly<{
  route: string;
  diagnostic: ContentBlockDiagnostic;
}>;

export type PublishedMdxRoot = Readonly<{
  source: ContentBlockSource;
  dynamic: boolean;
  identity: ContentBlockExternalContentIdentity;
  document: MdxDocument;
  fragment: ReturnType<typeof materializeMdxAuthoredContent>["fragment"];
  templateDependencies: readonly MdxTemplateDependency[];
  templateNames: readonly string[];
  dependencyRevision: `sha256:${string}`;
}>;

export const getUnsafeDynamicPublishedMdxDiagnostic = ({
  root,
  route,
  dataSources,
  props,
}: {
  root: PublishedMdxRoot;
  route: string;
  dataSources: ReadonlyMap<DataSource["id"], DataSource>;
  props: ReadonlyMap<Prop["id"], Prop>;
}): ContentBlockDiagnostic | undefined => {
  if (root.dynamic === false) {
    return;
  }
  const sourcePath =
    root.source.type === "expression"
      ? parseStaticMemberPath(root.source.value)
      : undefined;
  const sourceDataSourceId =
    sourcePath === undefined
      ? undefined
      : decodeDataSourceVariable(sourcePath[0]);
  if (
    root.fragment.resources.length > 0 &&
    sourceDataSourceId !== undefined &&
    dataSources.get(sourceDataSourceId)?.type === "parameter"
  ) {
    return {
      code: "invalid-mdx",
      severity: "error",
      blockInstanceId: root.identity.blockInstanceId,
      assetId: root.identity.assetId,
      renderScope: `route:${route}:block:${root.identity.blockInstanceId}`,
      message:
        "Dynamic MDX selected by a Collection item cannot contain Resources because a single Resource cannot be selected safely for the whole route.",
    };
  }
  const actionResourceIds = new Set(
    [...props.values(), ...root.fragment.props].flatMap((prop) =>
      prop.type === "resource" ? [prop.value] : []
    )
  );
  if (root.fragment.resources.some(({ id }) => actionResourceIds.has(id))) {
    return {
      code: "invalid-mdx",
      severity: "error",
      blockInstanceId: root.identity.blockInstanceId,
      assetId: root.identity.assetId,
      renderScope: `route:${route}:block:${root.identity.blockInstanceId}`,
      message:
        "Dynamic MDX cannot contain action Resources because the submitted action cannot be selected safely at runtime.",
    };
  }
};

const publishedMdxMaterializerRevision = 1;

export const createPublishedMdxMaterializationCache = () => ({
  documents: new Map<
    string,
    Promise<Awaited<ReturnType<typeof parseMdxDocumentRecovering>>>
  >(),
});

type PublishedMdxMaterializationCache = ReturnType<
  typeof createPublishedMdxMaterializationCache
>;

const getMdxDocuments = (artifact: ContentArtifactV1) =>
  artifact.documents.filter(
    (document) =>
      document.extension?.toLowerCase() === "mdx" ||
      document.mimeType === "text/mdx"
  );

const getNestedDocumentDependencies = ({
  graph,
  assetId,
}: {
  graph: ReturnType<typeof createDocumentGraph> | undefined;
  assetId: string;
}) => {
  if (
    graph === undefined ||
    graph.nodes.some(({ id }) => id === assetId) === false
  ) {
    return [];
  }
  return getDocumentGraphClosure({ graph, rootIds: [assetId] })
    .map(({ id, revision, contentRef }) => ({ id, revision, contentRef }))
    .sort((left, right) => left.id.localeCompare(right.id));
};

const createDependencyRevision = async ({
  identity,
  nestedDocuments,
  assetReferences,
  assetDependencies,
  templateNames,
  templateDependencies,
}: {
  identity: ContentBlockExternalContentIdentity;
  nestedDocuments: ReturnType<typeof getNestedDocumentDependencies>;
  assetReferences: readonly AssetValueReference[];
  assetDependencies: readonly Readonly<{
    id: string;
    contentRef: string;
    revision?: string;
  }>[];
  templateNames: readonly string[];
  templateDependencies: readonly MdxTemplateDependency[];
}) =>
  `sha256:${await getAssetContentHash(
    new TextEncoder().encode(
      JSON.stringify({
        materializerRevision: publishedMdxMaterializerRevision,
        identity,
        nestedDocuments,
        assetReferences: [...assetReferences]
          .map(({ assetId, suffix }) => ({ assetId, suffix }))
          .sort((left, right) =>
            `${left.assetId}${left.suffix ?? ""}`.localeCompare(
              `${right.assetId}${right.suffix ?? ""}`
            )
          ),
        assetDependencies: [...assetDependencies].sort((left, right) =>
          left.id.localeCompare(right.id)
        ),
        templateNames: [...templateNames].sort(),
        templateDependencies: [...templateDependencies].sort((left, right) =>
          left.templateInstanceId.localeCompare(right.templateInstanceId)
        ),
      })
    )
  )}` as const;

export const materializePublishedMdx = async ({
  route,
  data,
  artifact,
  metas,
  projectId,
  cache = createPublishedMdxMaterializationCache(),
  dynamicAssetIdsByBlock = new Map(),
  blockInstanceIds,
}: {
  route: string;
  data: Omit<WebstudioData, "pages">;
  artifact: ContentArtifactV1;
  metas: Map<string, WsComponentMeta>;
  projectId: string;
  cache?: PublishedMdxMaterializationCache;
  dynamicAssetIdsByBlock?: ReadonlyMap<string, readonly string[]>;
  blockInstanceIds?: ReadonlySet<string>;
}): Promise<{
  roots: readonly PublishedMdxRoot[];
  warnings: readonly PublishedMdxWarning[];
}> => {
  const documentsById = new Map(
    artifact.documents.map((document) => [document._id, document])
  );
  const mdxDocumentsById = new Map(
    getMdxDocuments(artifact).map((document) => [document._id, document])
  );
  const documentGraph =
    artifact.documentGraph === undefined
      ? undefined
      : createDocumentGraph(artifact.documentGraph);
  const sourcesByBlockId = getContentBlockSources({
    instances: data.instances.values(),
    props: data.props.values(),
  });
  const roots: PublishedMdxRoot[] = [];
  const warnings: PublishedMdxWarning[] = [];
  const warnUnavailableSource = ({
    blockInstanceId,
    assetId,
    message,
  }: {
    blockInstanceId: string;
    assetId?: string;
    message: string;
  }) => {
    warnings.push({
      route,
      diagnostic: {
        code: "invalid-mdx",
        severity: "error",
        blockInstanceId,
        ...(assetId === undefined ? {} : { assetId }),
        renderScope: `route:${route}:block:${blockInstanceId}`,
        message,
      },
    });
  };
  for (const block of data.instances.values()) {
    if (
      block.component !== blockComponent ||
      (blockInstanceIds !== undefined &&
        blockInstanceIds.has(block.id) === false)
    ) {
      continue;
    }
    const source = sourcesByBlockId.get(block.id);
    if (source === undefined) {
      continue;
    }
    const staticAssetId = getStaticContentBlockSourceAssetId(source);
    const isDynamicSource = typeof staticAssetId !== "string";
    const resolvedAssetIds =
      typeof staticAssetId === "string" && staticAssetId.length > 0
        ? [staticAssetId]
        : (dynamicAssetIdsByBlock.get(block.id) ?? []);
    if (resolvedAssetIds.length > contentEngineLimits.candidateDocuments) {
      warnUnavailableSource({
        blockInstanceId: block.id,
        message: `Published Content Block "${block.id}" exceeds the safe MDX candidate limit`,
      });
      continue;
    }
    if (resolvedAssetIds.length === 0) {
      warnUnavailableSource({
        blockInstanceId: block.id,
        message: `Published Content Block "${block.id}" has no bounded dynamic MDX dependency set`,
      });
      continue;
    }
    const candidates = Array.from(new Set(resolvedAssetIds))
      .flatMap((assetId) => {
        const document = mdxDocumentsById.get(assetId);
        return document === undefined ? [] : [document];
      })
      .sort((left, right) => left._id.localeCompare(right._id));
    for (const assetId of resolvedAssetIds) {
      if (mdxDocumentsById.has(assetId)) {
        continue;
      }
      warnUnavailableSource({
        blockInstanceId: block.id,
        assetId,
        message: `Published Content Block "${block.id}" requires unavailable MDX Asset "${assetId}"`,
      });
    }
    for (const candidate of candidates) {
      if (
        candidate.revision === undefined ||
        candidate.contentRef === undefined
      ) {
        warnUnavailableSource({
          blockInstanceId: block.id,
          assetId: candidate._id,
          message: `Published MDX Asset "${candidate._id}" has no revision identity`,
        });
        continue;
      }
      const sourceText = artifact.contents?.[candidate.contentRef];
      if (sourceText === undefined) {
        warnUnavailableSource({
          blockInstanceId: block.id,
          assetId: candidate._id,
          message: `Published MDX Asset "${candidate._id}" content is unavailable`,
        });
        continue;
      }
      const identity: ContentBlockExternalContentIdentity = {
        blockInstanceId: block.id,
        assetId: candidate._id,
        revision: candidate.revision,
        contentRef: candidate.contentRef,
        format: "mdx",
        renderScope: `route:${route}:block:${block.id}${
          isDynamicSource ? `:asset:${candidate._id}` : ""
        }`,
      };
      const documentKey = `${candidate._id}:${candidate.revision}:${candidate.contentRef}`;
      let parsedDocument = cache.documents.get(documentKey);
      if (parsedDocument === undefined) {
        if (cache.documents.size >= contentEngineLimits.hydratedFileCount) {
          const oldestKey = cache.documents.keys().next().value;
          if (oldestKey !== undefined) {
            cache.documents.delete(oldestKey);
          }
        }
        parsedDocument = parseMdxDocumentRecovering({ source: sourceText });
        cache.documents.set(documentKey, parsedDocument);
      }
      const parsed = await parsedDocument;
      const recoveryDiagnostics = createMdxDiagnostics({
        identity,
        diagnostics: parsed.diagnostics,
      });
      for (const diagnostic of recoveryDiagnostics) {
        warnings.push({ route, diagnostic });
      }
      if (parsed.status === "unrecoverable") {
        continue;
      }
      const document = parsed.document;
      const resolution = resolveMdxTemplates({
        document,
        identity,
        instances: data.instances,
        metas,
      });
      const templates = await materializeMdxTemplates({
        identity,
        resolution,
        data,
        metas,
        projectId,
      });
      const referencedTemplateNames = Array.from(
        new Set(
          resolution.references.map((reference) => reference.templateName)
        )
      );
      const assetReferences =
        artifact.assetValueReferences?.[candidate._id] ?? [];
      const materialized = materializeMdxAuthoredContent({
        identity,
        document,
        templateMaterialization: templates,
        assetReferences,
      });
      if (
        materialized.fragment.instances.length > contentEngineLimits.mdxNodes ||
        materialized.fragment.props.length > contentEngineLimits.mdxProps
      ) {
        warnUnavailableSource({
          blockInstanceId: block.id,
          assetId: candidate._id,
          message: `Published MDX Asset "${candidate._id}" materialization exceeds safe limits`,
        });
        continue;
      }
      for (const diagnostic of templates.diagnostics) {
        warnings.push({ route, diagnostic });
      }
      for (const diagnostic of createMdxContentModelDiagnostics({
        root: materialized,
        metas,
      })) {
        warnings.push({ route, diagnostic });
      }
      roots.push({
        source,
        dynamic: isDynamicSource,
        identity,
        document,
        fragment: materialized.fragment,
        templateDependencies: templates.dependencies.templates,
        templateNames: referencedTemplateNames,
        dependencyRevision: await createDependencyRevision({
          identity,
          nestedDocuments: getNestedDocumentDependencies({
            graph: documentGraph,
            assetId: candidate._id,
          }),
          assetReferences,
          assetDependencies: assetReferences.map(({ assetId }) => {
            const asset = data.assets.get(assetId);
            const documentDependency = documentsById.get(assetId);
            return {
              id: assetId,
              contentRef:
                asset?.name ?? documentDependency?.contentRef ?? "unavailable",
              ...(documentDependency?.revision === undefined
                ? {}
                : { revision: documentDependency.revision }),
            };
          }),
          templateNames: referencedTemplateNames,
          templateDependencies: templates.dependencies.templates,
        }),
      });
    }
  }
  const warningKeys = new Set<string>();
  return {
    roots,
    warnings: warnings.filter(({ route: warningRoute, diagnostic }) => {
      const key = JSON.stringify([warningRoute, diagnostic]);
      if (warningKeys.has(key)) {
        return false;
      }
      warningKeys.add(key);
      return true;
    }),
  };
};
