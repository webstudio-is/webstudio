import {
  createCanonicalAssetPath,
  discoverNamedMdxAssetReferences,
  parseMdxDocumentRecovering,
  rewriteMdxAssetReferences,
} from "@webstudio-is/content-engine/mdx";
import {
  discoverNamedMarkdownDocumentAssetReferences,
  rewriteMarkdownAssetReferences,
} from "@webstudio-is/content-engine/markdown-assets";
import {
  discoverNamedJsonAssetReferences,
  rewriteJsonAssetReferences,
} from "@webstudio-is/content-engine";
import {
  createWebstudioDataFromFragment,
  extractWebstudioFragment,
  mergeWebstudioFragments,
  remapFragmentAssets,
} from "./runtime/fragment";
import {
  blockComponent,
  blockTemplateComponent,
  createAssetFolderHierarchy,
  createId,
  formatAssetName,
  getAssetFolderSiblingKey,
  findContentBlockBodyContainers,
  getContentBlockSource,
  getStaticContentBlockSourceAssetId,
  isMdxFileAsset,
  hasAssetsResourceUrl,
  type Asset,
  type AssetFolder,
  type AssetFolders,
  type WebstudioFragment,
} from "@webstudio-is/sdk";

import type {
  PageCopyData,
  PageTransferData,
} from "./runtime/data-formats/page-transfer";

export * from "./runtime/data-formats/data-envelope";
export * from "./runtime/data-formats/instance-transfer";
export * from "./runtime/data-formats/page-transfer";
export * from "./runtime/data-formats/token-css";
export * from "./runtime/data-formats/webstudio-pragma";
export * from "./runtime/jsx/syntax";
export * from "./runtime/jsx/utils";
export * from "./runtime/webflow/instances-properties";
export * from "./runtime/webflow/schema";
export * from "./runtime/webflow/styles";

export const prepareConnectedContentBlockFragment = ({
  fragment,
  assets,
  getRenderedAssets,
}: {
  fragment: WebstudioFragment;
  assets?: ReadonlyMap<Asset["id"], Asset>;
  getRenderedAssets?: (blockInstanceIds: ReadonlySet<string>) => Asset[];
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
    const bodyContainers = findContentBlockBodyContainers({
      blockInstance: instance,
      instances: data.instances,
    });
    if (bodyContainers.length === 0) {
      data.instances.set(instance.id, {
        ...instance,
        children: instance.children.filter(
          (child) =>
            child.type === "id" &&
            data.instances.get(child.value)?.component ===
              blockTemplateComponent
        ),
      });
    } else {
      for (const body of bodyContainers) {
        data.instances.set(body.id, { ...body, children: [] });
      }
    }
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
  if (getRenderedAssets === undefined) {
    return prepared;
  }
  const blockInstanceIds = new Set(
    prepared.instances
      .filter(({ component }) => component === blockComponent)
      .map(({ id }) => id)
  );
  for (const asset of getRenderedAssets(blockInstanceIds)) {
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
  assets,
  assetFolders,
  discoveryCache = new Map(),
  readSource,
}: {
  fragment: WebstudioFragment;
  assets: ReadonlyMap<Asset["id"], Asset>;
  assetFolders: AssetFolders;
  discoveryCache?: Map<string, Promise<readonly string[] | undefined>>;
  readSource: (assetId: string) => Promise<string>;
}) => {
  const isContentDocument = (asset: Asset) =>
    isMdxFileAsset(asset) ||
    (asset.type === "file" &&
      ["md", "json"].includes(asset.format.toLowerCase()));
  const included = new Map(fragment.assets.map((asset) => [asset.id, asset]));
  const pending = fragment.assets.filter(isContentDocument);
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
          const namedAssets = Array.from(assets.values(), getNamedAsset);
          if (sourceAsset.format.toLowerCase() === "json") {
            return (
              await discoverNamedJsonAssetReferences({
                source,
                asset: getNamedAsset(sourceAsset),
                assets: namedAssets,
              })
            ).map(({ assetId }) => assetId);
          }
          if (isMdxFileAsset(sourceAsset) === false) {
            return (
              await discoverNamedMarkdownDocumentAssetReferences({
                markdown: source,
                source: getNamedAsset(sourceAsset),
                assets: namedAssets,
              })
            ).map(({ assetId }) => assetId);
          }
          const parsed = await parseMdxDocumentRecovering({ source });
          if (parsed.status === "unrecoverable") {
            return;
          }
          return discoverNamedMdxAssetReferences({
            document: parsed.document,
            source: getNamedAsset(sourceAsset),
            assets: namedAssets,
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
      if (isContentDocument(dependency)) {
        pending.push(dependency);
      }
    }
  }
  return {
    fragment: { ...fragment, assets: Array.from(included.values()) },
    skippedAssetIds,
  };
};

export const includePageTransferMetaAssets = (
  fragment: WebstudioFragment,
  assetIds: Array<string | undefined>,
  assets: ReadonlyMap<Asset["id"], Asset>
) => {
  const fragmentAssets = new Map(
    fragment.assets.map((asset) => [asset.id, asset])
  );
  for (const assetId of assetIds) {
    const asset = assetId === undefined ? undefined : assets.get(assetId);
    if (asset !== undefined) {
      fragmentAssets.set(asset.id, asset);
    }
  }
  return { ...fragment, assets: Array.from(fragmentAssets.values()) };
};

export const createPageTransferItem = (
  data: PageCopyData,
  assets: ReadonlyMap<Asset["id"], Asset>
): PageTransferData => ({
  ...data,
  bodyFragment: includePageTransferMetaAssets(
    data.bodyFragment,
    [
      data.page.meta.socialImageAssetId,
      data.page.marketplace?.thumbnailAssetId,
    ],
    assets
  ),
  type: "page",
});

export const getPageCopyAssetCatalogRevision = async (
  assets: readonly Asset[],
  folders: AssetFolders
) => {
  const paths = createClipboardAssetPaths(assets, folders);
  const compareId = (left: { id: string }, right: { id: string }) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  const catalog = JSON.stringify([
    [...assets]
      .sort(compareId)
      .map(({ id, name, folderId, description }) => [
        id,
        name,
        folderId,
        description,
        paths[id],
      ]),
    [...folders.values()]
      .sort(compareId)
      .map(({ id, parentId, name }) => [id, parentId, name]),
  ]);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(catalog)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export type PageCopyCatalog = {
  assets: readonly Asset[];
  folders: readonly AssetFolder[];
};

export type PageCopyAssetPlan = {
  source: Asset;
  target: Asset;
  reuse: boolean;
  document?: string;
};

export const pageCopyError = (code: string) =>
  Object.assign(new Error(code), { code });

const getAssetCatalogPaths = ({ assets, folders }: PageCopyCatalog) =>
  createClipboardAssetPaths(
    assets,
    new Map(folders.map((folder) => [folder.id, folder]))
  );

const isTransferDocument = (asset: Asset) =>
  isMdxFileAsset(asset) ||
  (asset.type === "file" &&
    ["md", "json"].includes(asset.format.toLowerCase()));

const groupTransferPaths = (paths: Iterable<[string, string]>) => {
  const byPath = new Map<string, string[]>();
  for (const [id, path] of paths) {
    const ids = byPath.get(path) ?? [];
    ids.push(id);
    byPath.set(path, ids);
  }
  return byPath;
};

const getTransferNamedAssets = ({ assets, folders }: PageCopyCatalog) => {
  const hierarchy = createAssetFolderHierarchy(
    new Map(folders.map((folder) => [folder.id, folder]))
  );
  return assets.map((asset) => ({
    id: asset.id,
    name: formatAssetName(asset),
    folderNames: hierarchy.getPath(asset.folderId).map(({ name }) => name),
  }));
};

const findTransferDocumentReferences = async (
  asset: Asset,
  source: string,
  assets: ReturnType<typeof getTransferNamedAssets>
) => {
  const named = assets.find(({ id }) => id === asset.id);
  if (named === undefined) {
    throw pageCopyError("PAGE_COPY_SOURCE_ASSET_MISSING");
  }
  if (isMdxFileAsset(asset)) {
    const parsed = await parseMdxDocumentRecovering({ source });
    if (parsed.status === "unrecoverable") {
      throw pageCopyError("PAGE_COPY_DOCUMENT_UNSUPPORTED");
    }
    return discoverNamedMdxAssetReferences({
      document: parsed.document,
      source: named,
      assets,
    });
  }
  if (asset.format.toLowerCase() === "json") {
    return await discoverNamedJsonAssetReferences({
      source,
      asset: named,
      assets,
    });
  }
  return await discoverNamedMarkdownDocumentAssetReferences({
    markdown: source,
    source: named,
    assets,
  });
};

const getRelativeTransferPath = (from: string, to: string) => {
  const fromFolder = from.split("/").slice(0, -1);
  const toParts = to.split("/");
  while (fromFolder.length > 0 && fromFolder[0] === toParts[0]) {
    fromFolder.shift();
    toParts.shift();
  }
  return [...fromFolder.map(() => ".."), ...toParts].join("/");
};

const remapPageTransfer = (
  item: PageTransferData,
  assets: ReadonlyMap<string, Asset>
): PageTransferData => {
  const mapId = (id: string | undefined) =>
    id === undefined ? undefined : (assets.get(id)?.id ?? id);
  return {
    ...item,
    rootFragment: remapFragmentAssets(item.rootFragment, assets),
    bodyFragment: remapFragmentAssets(item.bodyFragment, assets),
    page: {
      ...item.page,
      meta: {
        ...item.page.meta,
        socialImageAssetId: mapId(item.page.meta.socialImageAssetId),
      },
      marketplace:
        item.page.marketplace === undefined
          ? undefined
          : {
              ...item.page.marketplace,
              thumbnailAssetId: mapId(item.page.marketplace.thumbnailAssetId),
            },
    },
  };
};

export const planPageTransfer = async ({
  item,
  source,
  target,
  targetProjectId,
  sameStorage,
  sameProject,
  hasRenderedScope,
  readDocument,
  createAssetId = () => createId("nano"),
}: {
  item: PageTransferData;
  source: PageCopyCatalog;
  target: PageCopyCatalog;
  targetProjectId: string;
  sameStorage: boolean;
  sameProject: boolean;
  hasRenderedScope: boolean;
  readDocument: (asset: Asset) => Promise<string>;
  createAssetId?: () => string;
}) => {
  const fragments = [item.rootFragment, item.bodyFragment];
  if (
    (!hasRenderedScope && fragments.some(hasDynamicContentBlockSource)) ||
    (!sameProject &&
      fragments.some((fragment) =>
        fragment.resources.some(hasAssetsResourceUrl)
      ))
  ) {
    throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
  }

  const sourceAssets = new Map(source.assets.map((asset) => [asset.id, asset]));
  const targetAssets = new Map(target.assets.map((asset) => [asset.id, asset]));
  const requiredAssets = new Map<string, Asset>();
  const namedSourceAssets = getTransferNamedAssets(source);
  const sourcePaths = getAssetCatalogPaths(source);
  const targetPaths = getAssetCatalogPaths(target);
  const targetPathsByName = groupTransferPaths(Object.entries(targetPaths));
  const sourcesByName = groupTransferPaths(Object.entries(sourcePaths));

  const includeAsset = (id: string | undefined) => {
    if (id === undefined || requiredAssets.has(id)) {
      return;
    }
    const asset = sourceAssets.get(id);
    if (asset === undefined) {
      throw pageCopyError("PAGE_COPY_SOURCE_ASSET_MISSING");
    }
    requiredAssets.set(id, asset);
  };
  for (const fragment of fragments) {
    for (const asset of fragment.assets) {
      includeAsset(asset.id);
    }
  }
  includeAsset(item.page.meta.socialImageAssetId);
  includeAsset(item.page.marketplace?.thumbnailAssetId);

  const documents = new Map<
    string,
    {
      source: string;
      references: Awaited<ReturnType<typeof findTransferDocumentReferences>>;
    }
  >();
  // Map iteration also visits document dependencies discovered in this loop.
  for (const asset of requiredAssets.values()) {
    if (!isTransferDocument(asset)) {
      continue;
    }
    const source = await readDocument(asset);
    const references = await findTransferDocumentReferences(
      asset,
      source,
      namedSourceAssets
    );
    documents.set(asset.id, { source, references });
    for (const reference of references) {
      includeAsset(reference.assetId);
    }
  }

  const sourceFolders = createAssetFolderHierarchy(
    new Map(source.folders.map((folder) => [folder.id, folder]))
  );
  const targetFolders = new Map(
    target.folders.map((folder) => [folder.id, folder])
  );
  const targetFolderForSource = new Map<string, string>();
  const folders: AssetFolder[] = [];
  const assets: PageCopyAssetPlan[] = [];
  for (const asset of requiredAssets.values()) {
    let folderId: string | undefined;
    for (const sourceFolder of sourceFolders.getPath(asset.folderId)) {
      const mapped = targetFolderForSource.get(sourceFolder.id);
      if (mapped !== undefined) {
        folderId = mapped;
        continue;
      }
      const siblingKey = getAssetFolderSiblingKey(folderId, sourceFolder.name);
      const matching = [...targetFolders.values()].find(
        (folder) =>
          getAssetFolderSiblingKey(folder.parentId, folder.name) === siblingKey
      );
      if (matching !== undefined && matching.name !== sourceFolder.name) {
        // Document references resolve case-sensitive canonical paths.
        throw pageCopyError("PAGE_COPY_ASSET_CONFLICT");
      }
      if (matching) {
        folderId = matching.id;
      } else {
        const folder: AssetFolder = {
          id: createAssetId(),
          parentId: folderId,
          name: sourceFolder.name,
          projectId: targetProjectId,
          createdAt: sourceFolder.createdAt,
        };
        folders.push(folder);
        targetFolders.set(folder.id, folder);
        folderId = folder.id;
      }
      targetFolderForSource.set(sourceFolder.id, folderId);
    }
    const path = sourcePaths[asset.id];
    const existingIds = targetPathsByName.get(path) ?? [];
    const existing =
      existingIds.length === 1 ? targetAssets.get(existingIds[0]) : undefined;
    if (
      sourcesByName.get(path)?.length !== 1 ||
      (existingIds.length > 0 &&
        (!sameStorage ||
          existing?.name !== asset.name ||
          existing.description !== asset.description))
    ) {
      throw pageCopyError("PAGE_COPY_ASSET_CONFLICT");
    }
    const id =
      existing?.id ??
      (sameStorage && !targetAssets.has(asset.id) ? asset.id : createAssetId());
    const predicted = existing ?? {
      ...asset,
      id,
      folderId,
      projectId: targetProjectId,
    };
    assets.push({
      source: asset,
      target: predicted,
      reuse: existing !== undefined,
    });
    targetAssets.set(id, predicted);
    targetPathsByName.set(path, [id]);
  }

  const after = {
    assets: [...targetAssets.values()],
    folders: [...targetFolders.values()],
  };
  const afterPaths = getAssetCatalogPaths(after);
  const getBasenames = (paths: Record<string, string>) =>
    groupTransferPaths(
      Object.entries(paths).map(([id, path]) => [id, path.split("/").at(-1)!])
    );
  const beforeNames = getBasenames(targetPaths);
  const afterNames = getBasenames(afterPaths);
  for (const [name, ids] of beforeNames) {
    if (ids.length === 1 && (afterNames.get(name)?.length ?? 0) > 1) {
      throw pageCopyError("PAGE_COPY_ASSET_CONFLICT");
    }
  }

  const targetIds = new Map(
    assets.map(({ source, target }) => [source.id, target.id])
  );
  const namedTargetAssets = getTransferNamedAssets(after);
  for (const asset of assets) {
    const document = documents.get(asset.source.id);
    if (document === undefined) {
      continue;
    }
    const expected = document.references.map(({ assetId }) =>
      targetIds.get(assetId)
    );
    const matches = async (source: string) => {
      const actual = await findTransferDocumentReferences(
        asset.target,
        source,
        namedTargetAssets
      );
      return (
        expected.length === actual.length &&
        actual.every(({ assetId }, index) => assetId === expected[index])
      );
    };
    if (await matches(document.source)) {
      continue;
    }
    if (sameStorage) {
      throw pageCopyError("PAGE_COPY_ASSET_CONFLICT");
    }
    const destinationPath = afterPaths[asset.target.id];
    const replacementPaths = new Map(
      [...targetIds].map(([sourceId, targetId]) => [
        sourceId,
        getRelativeTransferPath(destinationPath, afterPaths[targetId]),
      ])
    );
    const rewrite = isMdxFileAsset(asset.source)
      ? rewriteMdxAssetReferences
      : asset.source.format.toLowerCase() === "json"
        ? rewriteJsonAssetReferences
        : rewriteMarkdownAssetReferences;
    asset.document = await rewrite({
      source: document.source,
      sourcePath: sourcePaths[asset.source.id],
      assetPaths: new Map(Object.entries(sourcePaths)),
      replacementPaths,
    });
    if (!(await matches(asset.document))) {
      throw pageCopyError("PAGE_COPY_ASSET_CONFLICT");
    }
  }
  return { item, folders, assets, target, documents };
};

export const previewPageTransfer = (
  plan: Awaited<ReturnType<typeof planPageTransfer>>
) =>
  remapPageTransfer(
    plan.item,
    new Map(plan.assets.map(({ source, target }) => [source.id, target]))
  );

export const executePageTransfer = async <Result extends { pageId: string }>({
  plan,
  createFolder,
  stageAssets,
  readTarget,
  commit,
}: {
  plan: Awaited<ReturnType<typeof planPageTransfer>>;
  createFolder: (folder: AssetFolder) => Promise<AssetFolder>;
  stageAssets: (
    plans: PageCopyAssetPlan[]
  ) => Promise<ReadonlyMap<string, Asset>>;
  readTarget: () => Promise<PageCopyCatalog>;
  commit: (item: PageTransferData, revision: string) => Promise<Result>;
}) => {
  const folderIds = new Map<string, string>();
  const targetFolders = new Map(
    plan.target.folders.map((folder) => [folder.id, folder])
  );
  for (const folder of plan.folders) {
    const parentId =
      folder.parentId === undefined
        ? undefined
        : (folderIds.get(folder.parentId) ?? folder.parentId);
    const created = await createFolder({ ...folder, parentId });
    if (created.name !== folder.name || created.parentId !== parentId) {
      throw pageCopyError("PAGE_COPY_DESTINATION_FOLDER_MISMATCH");
    }
    folderIds.set(folder.id, created.id);
    targetFolders.set(created.id, created);
  }
  const plans = plan.assets.map((asset) => ({
    ...asset,
    target: {
      ...asset.target,
      folderId:
        asset.target.folderId === undefined
          ? undefined
          : (folderIds.get(asset.target.folderId) ?? asset.target.folderId),
    },
  }));
  const assets = await stageAssets(plans);
  const expected = new Map(
    plan.target.assets.map((asset) => [asset.id, asset])
  );
  for (const { source, target } of plans) {
    const staged = assets.get(source.id);
    if (
      staged === undefined ||
      staged.projectId !== target.projectId ||
      staged.folderId !== target.folderId ||
      staged.type !== target.type ||
      formatAssetName(staged) !== formatAssetName(target)
    ) {
      throw pageCopyError("PAGE_COPY_DESTINATION_ASSET_MISMATCH");
    }
    expected.set(staged.id, staged);
  }

  const current = await readTarget();
  const [expectedRevision, revision] = await Promise.all([
    getPageCopyAssetCatalogRevision([...expected.values()], targetFolders),
    getPageCopyAssetCatalogRevision(
      current.assets,
      new Map(current.folders.map((folder) => [folder.id, folder]))
    ),
  ]);
  if (revision !== expectedRevision) {
    throw pageCopyError("PAGE_COPY_STALE");
  }

  const named = getTransferNamedAssets(current);
  for (const { source, document } of plans) {
    const known = plan.documents.get(source.id);
    if (known === undefined) {
      continue;
    }
    const target = assets.get(source.id)!;
    const references = await findTransferDocumentReferences(
      target,
      document ?? known.source,
      named
    );
    if (
      references.length !== known.references.length ||
      references.some(
        ({ assetId }, index) =>
          assetId !== assets.get(known.references[index]?.assetId)?.id
      )
    ) {
      throw pageCopyError("PAGE_COPY_ASSET_CONFLICT");
    }
  }
  return await commit(remapPageTransfer(plan.item, assets), revision);
};

export const projectPageCopyAssets = async ({
  plans,
  sameStorage,
  relink,
  upload,
}: {
  plans: PageCopyAssetPlan[];
  sameStorage: boolean;
  relink: (plans: PageCopyAssetPlan[]) => Promise<Asset[]>;
  upload: (plan: PageCopyAssetPlan) => Promise<Asset>;
}) => {
  const assets = new Map(
    plans
      .filter((plan) => plan.reuse)
      .map(({ source, target }) => [source.id, target])
  );
  const remaining = plans.filter((plan) => plan.reuse === false);
  if (sameStorage && remaining.length > 0) {
    const linked = new Map(
      (await relink(remaining)).map((asset) => [asset.id, asset])
    );
    for (const { source, target } of remaining) {
      const saved = linked.get(target.id);
      if (saved === undefined) {
        throw pageCopyError("PAGE_COPY_DESTINATION_ASSET_MISSING");
      }
      assets.set(source.id, saved);
    }
  }
  if (!sameStorage) {
    // Ordered uploads keep rate-limited deployments from receiving a burst.
    for (const plan of remaining) {
      assets.set(plan.source.id, await upload(plan));
    }
  }
  return assets;
};

export type PageCopyArtifacts = {
  assetIds: string[];
  folderIds: string[];
  reservations: { assetId: string; fileName: string }[];
  unconfirmedAssetIds: string[];
  unconfirmedFolders: { name: string; parentId?: string }[];
};

export const createPageCopyArtifacts = (): PageCopyArtifacts => ({
  assetIds: [],
  folderIds: [],
  reservations: [],
  unconfirmedAssetIds: [],
  unconfirmedFolders: [],
});

export const trackPageCopyFolder = async (
  artifacts: PageCopyArtifacts,
  path: { name: string; parentId?: string },
  create: () => Promise<AssetFolder>
) => {
  artifacts.unconfirmedFolders.push(path);
  const folder = await create();
  artifacts.unconfirmedFolders.pop();
  artifacts.folderIds.push(folder.id);
  return folder;
};

export const pageCopyFailure = (
  error: unknown,
  artifacts: PageCopyArtifacts,
  pendingPageId?: string
) => ({
  status:
    pendingPageId === undefined
      ? ("failed" as const)
      : ("indeterminate" as const),
  code:
    pendingPageId !== undefined
      ? "PAGE_COPY_COMMIT_UNKNOWN"
      : typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
        ? error.code
        : "PAGE_COPY_FAILED",
  ...(pendingPageId === undefined ? {} : { pageId: pendingPageId }),
  artifacts,
});
