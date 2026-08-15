import {
  parseMdxDocument,
  type MdxDocument,
} from "@webstudio-is/content-engine/mdx";
import type {
  AssetValueReference,
  ContentArtifactV1,
} from "@webstudio-is/content-engine";
import { contentEngineLimits } from "@webstudio-is/content-engine";
import {
  getAssetContentHash,
  getContentBlockSource,
  type ContentBlockDiagnostic,
  type ContentBlockExternalContentIdentity,
  type ContentBlockSource,
  type WebstudioData,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { parseJsonExpression } from "@webstudio-is/expression";
import { materializeMdxAuthoredContent } from "./mdx-authored-content";
import {
  materializeMdxTemplates,
  type MdxTemplateDependency,
} from "./mdx-materialization";
import { resolveMdxTemplates } from "./mdx-template-resolution";

export type PublishedMdxWarning = Readonly<{
  route: string;
  diagnostic: Extract<ContentBlockDiagnostic, { severity: "warning" }>;
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

const publishedMdxMaterializerRevision = 1;

export const createPublishedMdxMaterializationCache = () => ({
  documents: new Map<string, Promise<MdxDocument>>(),
});

type PublishedMdxMaterializationCache = ReturnType<
  typeof createPublishedMdxMaterializationCache
>;

const getMdxDocuments = (artifact: ContentArtifactV1) =>
  artifact.documents
    .filter(
      (document) =>
        document.extension?.toLowerCase() === "mdx" ||
        document.mimeType === "text/mdx"
    )
    .sort((left, right) => left._id.localeCompare(right._id));

const getNestedDocumentDependencies = ({
  artifact,
  assetId,
}: {
  artifact: ContentArtifactV1;
  assetId: string;
}) => {
  const nodes = new Map(
    artifact.documentGraph?.nodes.map((node) => [node.id, node]) ?? []
  );
  const edgesBySource = new Map<string, string[]>();
  for (const edge of artifact.documentGraph?.edges ?? []) {
    const targets = edgesBySource.get(edge.sourceId) ?? [];
    targets.push(edge.reference.documentId);
    edgesBySource.set(edge.sourceId, targets);
  }
  const dependencies = new Map<
    string,
    { revision: string; contentRef: string }
  >();
  const pending = [assetId];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (dependencies.has(current)) {
      continue;
    }
    const node = nodes.get(current);
    if (node !== undefined) {
      dependencies.set(current, {
        revision: node.revision,
        contentRef: node.contentRef,
      });
    }
    pending.push(...(edgesBySource.get(current) ?? []));
  }
  return Array.from(dependencies, ([id, dependency]) => ({
    id,
    ...dependency,
  })).sort((left, right) => left.id.localeCompare(right.id));
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
  const documents = getMdxDocuments(artifact);
  const roots: PublishedMdxRoot[] = [];
  const warnings: PublishedMdxWarning[] = [];
  for (const block of data.instances.values()) {
    if (
      blockInstanceIds !== undefined &&
      blockInstanceIds.has(block.id) === false
    ) {
      continue;
    }
    const source = getContentBlockSource({
      blockInstanceId: block.id,
      props: data.props.values(),
    });
    if (source === undefined) {
      continue;
    }
    const staticAssetId =
      source.type === "asset"
        ? source.assetId
        : parseJsonExpression(source.value);
    const isDynamicSource = typeof staticAssetId !== "string";
    const resolvedAssetIds =
      typeof staticAssetId === "string" && staticAssetId.length > 0
        ? [staticAssetId]
        : (dynamicAssetIdsByBlock.get(block.id) ?? []);
    if (resolvedAssetIds.length > contentEngineLimits.candidateDocuments) {
      throw new Error(
        `Published Content Block "${block.id}" exceeds the safe MDX candidate limit`
      );
    }
    if (resolvedAssetIds.length === 0) {
      throw new Error(
        `Published Content Block "${block.id}" has no bounded dynamic MDX dependency set`
      );
    }
    const resolvedAssetIdSet = new Set(resolvedAssetIds);
    const candidates = documents.filter(({ _id }) =>
      resolvedAssetIdSet.has(_id)
    );
    if (candidates.length !== resolvedAssetIdSet.size) {
      const unavailableAssetId = resolvedAssetIds.find(
        (assetId) => candidates.some(({ _id }) => _id === assetId) === false
      );
      throw new Error(
        `Published Content Block "${block.id}" requires unavailable MDX Asset "${unavailableAssetId}"`
      );
    }
    for (const candidate of candidates) {
      if (
        candidate.revision === undefined ||
        candidate.contentRef === undefined
      ) {
        throw new Error(
          `Published MDX Asset "${candidate._id}" has no revision identity`
        );
      }
      const sourceText = artifact.contents?.[candidate.contentRef];
      if (sourceText === undefined) {
        throw new Error(
          `Published MDX Asset "${candidate._id}" content is unavailable`
        );
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
        parsedDocument = parseMdxDocument({ source: sourceText });
        cache.documents.set(documentKey, parsedDocument);
      }
      const document = await parsedDocument;
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
        throw new Error("Published MDX materialization exceeds safe limits");
      }
      for (const diagnostic of templates.diagnostics) {
        if (diagnostic.severity === "warning") {
          warnings.push({ route, diagnostic });
        }
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
            artifact,
            assetId: candidate._id,
          }),
          assetReferences,
          assetDependencies: assetReferences.map(({ assetId }) => {
            const asset = data.assets.get(assetId);
            const documentDependency = artifact.documents.find(
              ({ _id }) => _id === assetId
            );
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
