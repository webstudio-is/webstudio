import {
  discoverNamedMdxAssetReferences,
  parseMdxDocumentRecovering,
  type MdxDocument,
} from "@webstudio-is/content-engine/mdx";
import { resolveAssetValueReferences } from "@webstudio-is/content-engine";
import type {
  Asset,
  ContentBlockDiagnostic,
  ContentBlockExternalContentIdentity,
  WebstudioData,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  toAssetReferenceRuntimeData,
} from "@webstudio-is/sdk";
import {
  materializeMdxAuthoredContent,
  type MaterializedMdxAuthoredContentRoot,
} from "./mdx-authored-content";
import {
  createMdxContentModelDiagnostics,
  createMdxDiagnostics,
} from "./mdx-diagnostics";
import { createMdxAssetReferenceValues } from "./mdx-asset-references";
import { materializeMdxTemplates } from "./mdx-materialization";
import { resolveMdxTemplates } from "./mdx-template-resolution";

const emptyMdxDocument: MdxDocument = {
  frontmatter: { properties: {} },
  children: [],
};

export const materializeMdxSource = async ({
  source,
  identity,
  data,
  metas,
  projectId,
  parsed,
  createUnresolvedTemplateInstance,
}: {
  source: string;
  identity: ContentBlockExternalContentIdentity;
  data: Omit<WebstudioData, "pages">;
  metas: Map<string, WsComponentMeta>;
  projectId: string;
  parsed?: Readonly<{
    source: string;
    result: Awaited<ReturnType<typeof parseMdxDocumentRecovering>>;
  }>;
  createUnresolvedTemplateInstance?: Parameters<
    typeof materializeMdxAuthoredContent
  >[0]["createUnresolvedTemplateInstance"];
}): Promise<{
  root: MaterializedMdxAuthoredContentRoot;
  diagnostics: readonly ContentBlockDiagnostic[];
}> => {
  const parsedSource =
    parsed?.source === source
      ? parsed.result
      : await parseMdxDocumentRecovering({ source });
  const document =
    parsedSource.status === "parsed" ? parsedSource.document : emptyMdxDocument;
  const resolution = resolveMdxTemplates({
    document,
    identity,
    instances: data.instances,
    metas,
  });
  const sourceAsset = data.assets.get(identity.assetId);
  const hierarchy = createAssetFolderHierarchy(data.assetFolders ?? new Map());
  const getNamedAsset = (asset: Asset) => ({
    id: asset.id,
    name: formatAssetName(asset),
    folderNames: hierarchy.getPath(asset.folderId).map(({ name }) => name),
  });
  const assetReferences =
    sourceAsset === undefined
      ? []
      : discoverNamedMdxAssetReferences({
          document,
          source: getNamedAsset(sourceAsset),
          assets: Array.from(data.assets.values(), getNamedAsset),
        });
  const templates = await materializeMdxTemplates({
    identity,
    resolution,
    data,
    metas,
    projectId,
    assetReferences,
  });
  const authoredRoot = materializeMdxAuthoredContent({
    identity,
    document,
    templateMaterialization: templates,
    assetReferences,
    assetReferenceValues:
      sourceAsset === undefined
        ? undefined
        : createMdxAssetReferenceValues({
            source: sourceAsset,
            assets: data.assets.values(),
            assetFolders: data.assetFolders ?? new Map(),
          }),
    createUnresolvedTemplateInstance,
  });
  const resolvedDocument = resolveAssetValueReferences({
    value: document,
    references: assetReferences.filter(({ assetId, structured }) => {
      const asset = data.assets.get(assetId);
      return !(
        structured === true &&
        asset?.type === "file" &&
        ["json", "md", "mdx"].includes(asset.format.toLowerCase())
      );
    }),
    runtimeAssets: Object.fromEntries(
      Array.from(data.assets.values(), (asset) => [
        asset.id,
        toAssetReferenceRuntimeData(asset, "https://webstudio.local"),
      ])
    ),
  });
  const root: MaterializedMdxAuthoredContentRoot = {
    ...authoredRoot,
    resolvedFrontmatter: resolvedDocument.frontmatter.properties,
  };
  const includedAssetIds = new Set(root.fragment.assets.map(({ id }) => id));
  for (const { assetId } of assetReferences) {
    const asset = data.assets.get(assetId);
    if (asset !== undefined && includedAssetIds.has(asset.id) === false) {
      includedAssetIds.add(asset.id);
      root.fragment.assets.push(asset);
    }
  }
  return {
    root,
    diagnostics: [
      ...createMdxDiagnostics({
        identity,
        diagnostics: parsedSource.diagnostics,
      }),
      ...templates.diagnostics,
      ...createMdxContentModelDiagnostics({ root, metas }),
    ],
  };
};
