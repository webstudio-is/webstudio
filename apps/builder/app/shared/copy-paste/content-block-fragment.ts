import {
  createCanonicalAssetPath,
  discoverNamedMdxAssetReferences,
  parseMdxDocumentRecovering,
} from "@webstudio-is/content-engine/mdx";
import {
  createWebstudioDataFromFragment,
  extractWebstudioFragment,
  mergeWebstudioFragments,
} from "@webstudio-is/project-build/runtime";
import {
  blockComponent,
  blockTemplateComponent,
  createAssetFolderHierarchy,
  formatAssetName,
  getContentBlockSource,
  getStaticContentBlockSourceAssetId,
  isMdxFileAsset,
  type Asset,
  type AssetFolders,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import {
  getExternalContentRootAssets,
  openExternalContentAsset,
} from "../external-content-roots";

export const prepareConnectedContentBlockFragment = ({
  fragment,
  projectId,
  assets,
}: {
  fragment: WebstudioFragment;
  projectId: string | undefined;
  assets?: ReadonlyMap<Asset["id"], Asset>;
}) => {
  const data = createWebstudioDataFromFragment(fragment);
  let changed = false;
  const staticSourceAssetIds = new Set<string>();
  for (const instance of data.instances.values()) {
    if (instance.component !== blockComponent) {
      continue;
    }
    const source = getContentBlockSource({
      blockInstanceId: instance.id,
      props: data.props.values(),
    });
    if (source === undefined) {
      continue;
    }
    const staticAssetId = getStaticContentBlockSourceAssetId(source);
    if (staticAssetId !== undefined) {
      staticSourceAssetIds.add(staticAssetId);
    }
    data.instances.set(instance.id, {
      ...instance,
      children: instance.children.filter(
        (child) =>
          child.type === "id" &&
          data.instances.get(child.value)?.component === blockTemplateComponent
      ),
    });
    changed = true;
  }
  const prepared =
    changed === false
      ? fragment
      : mergeWebstudioFragments(
          fragment.children.flatMap((child) =>
            child.type === "id" ? [child.value] : []
          ),
          fragment.children.flatMap((child) =>
            child.type === "id"
              ? [extractWebstudioFragment(data, child.value)]
              : []
          )
        );
  const assetIds = new Set(prepared.assets.map(({ id }) => id));
  for (const assetId of staticSourceAssetIds) {
    const asset = assets?.get(assetId);
    if (asset !== undefined && assetIds.has(asset.id) === false) {
      assetIds.add(asset.id);
      prepared.assets.push(asset);
    }
  }
  if (projectId === undefined) {
    return prepared;
  }
  const blockInstanceIds = new Set(
    prepared.instances
      .filter(({ component }) => component === blockComponent)
      .map(({ id }) => id)
  );
  for (const asset of getExternalContentRootAssets({
    projectId,
    blockInstanceIds,
  })) {
    if (assetIds.has(asset.id) === false) {
      assetIds.add(asset.id);
      prepared.assets.push(asset);
    }
  }
  return prepared;
};

export const hasDynamicContentBlockSource = (fragment: WebstudioFragment) => {
  const data = createWebstudioDataFromFragment(fragment);
  return Array.from(data.instances.values()).some((instance) => {
    if (instance.component !== blockComponent) {
      return false;
    }
    const source = getContentBlockSource({
      blockInstanceId: instance.id,
      props: data.props.values(),
    });
    return (
      source?.type === "expression" &&
      getStaticContentBlockSourceAssetId(source) === undefined
    );
  });
};

export const createClipboardAssetPaths = (
  assets: readonly Asset[],
  assetFolders: AssetFolders
) => {
  const folderHierarchy = createAssetFolderHierarchy(assetFolders);
  return Object.fromEntries(
    assets.map((asset) => [
      asset.id,
      createCanonicalAssetPath({
        folderNames: folderHierarchy
          .getPath(asset.folderId)
          .map(({ name }) => name),
        name: formatAssetName(asset),
      }),
    ])
  );
};

export const includeMdxAssetDependencies = async ({
  fragment,
  projectId,
  assets,
  assetFolders,
  discoveryCache = new Map(),
  readSource = async (assetId: string) =>
    (await openExternalContentAsset({ projectId, assetId })).source,
}: {
  fragment: WebstudioFragment;
  projectId: string;
  assets: ReadonlyMap<Asset["id"], Asset>;
  assetFolders: AssetFolders;
  discoveryCache?: Map<string, Promise<readonly string[] | undefined>>;
  readSource?: (assetId: string) => Promise<string>;
}) => {
  const included = new Map(fragment.assets.map((asset) => [asset.id, asset]));
  const pending = fragment.assets.filter(isMdxFileAsset);
  const inspected = new Set<string>();
  const skippedAssetIds: string[] = [];
  const folderHierarchy = createAssetFolderHierarchy(assetFolders);
  const getNamedAsset = (asset: Asset) => ({
    id: asset.id,
    name: formatAssetName(asset),
    folderNames: folderHierarchy
      .getPath(asset.folderId)
      .map(({ name }) => name),
  });
  while (pending.length > 0) {
    const sourceAsset = pending.shift()!;
    if (inspected.has(sourceAsset.id)) {
      continue;
    }
    inspected.add(sourceAsset.id);
    let discovery = discoveryCache.get(sourceAsset.id);
    if (discovery === undefined) {
      discovery = (async () => {
        try {
          const source = await readSource(sourceAsset.id);
          const parsed = await parseMdxDocumentRecovering({ source });
          if (parsed.status === "unrecoverable") {
            return;
          }
          return discoverNamedMdxAssetReferences({
            document: parsed.document,
            source: getNamedAsset(sourceAsset),
            assets: Array.from(assets.values(), getNamedAsset),
          }).map(({ assetId }) => assetId);
        } catch {
          return;
        }
      })();
      discoveryCache.set(sourceAsset.id, discovery);
    }
    const dependencyIds = await discovery;
    if (dependencyIds === undefined) {
      skippedAssetIds.push(sourceAsset.id);
      continue;
    }
    for (const assetId of dependencyIds) {
      const dependency = assets.get(assetId);
      if (dependency === undefined || included.has(assetId)) {
        continue;
      }
      included.set(assetId, dependency);
      if (isMdxFileAsset(dependency)) {
        pending.push(dependency);
      }
    }
  }
  return {
    fragment: { ...fragment, assets: Array.from(included.values()) },
    skippedAssetIds,
  };
};
