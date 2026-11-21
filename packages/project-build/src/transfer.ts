import { parse as parseJavaScript, parseExpressionAt } from "acorn";
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
  compareAssetQueryDocuments,
  discoverNamedJsonAssetReferences,
  extractAssetQueryProperties,
  type AssetRuntimeData,
  rewriteJsonAssetReferences,
} from "@webstudio-is/content-engine";
import {
  parseDirectPathExpression,
  parseJsonExpression,
} from "@webstudio-is/expression";
import {
  createWebstudioDataFromFragment,
  extractWebstudioFragment,
  mergeWebstudioFragments,
  remapFragmentAssets,
} from "./runtime/fragment";
import {
  blockComponent,
  blockTemplateComponent,
  collectionComponent,
  contentBlockSourceProp,
  createAssetFolderHierarchy,
  createId,
  createStructuredAssetQueryResourceBody,
  formatAssetName,
  getAssetFolderSiblingKey,
  findContentBlockBodyContainers,
  getContentBlockSource,
  getContentBlockSources,
  getMimeTypeByFilename,
  getStaticContentBlockSourceAssetId,
  decodeDataVariableId,
  isAssetsResource,
  isMdxFileAsset,
  hasAssetsResourceUrl,
  parseStructuredAssetQueryResourceBodyResult,
  type Asset,
  type AssetFolder,
  type AssetFolders,
  type StructuredAssetQueryResourceConfiguration,
  type StructuredAssetQueryWhereBinding,
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

const matchesStaticAssetWhere = (
  where: StructuredAssetQueryWhereBinding,
  asset: Asset
): boolean => {
  if ("all" in where) {
    return where.all.every((child) => matchesStaticAssetWhere(child, asset));
  }
  if ("any" in where) {
    return where.any.some((child) => matchesStaticAssetWhere(child, asset));
  }
  const value = parseJsonExpression(where.value);
  if (
    (where.field[0] !== "id" &&
      where.field[0] !== "folderId" &&
      where.field[0] !== "name") ||
    where.field.length !== 1 ||
    (where.operator !== "eq" && where.operator !== "in") ||
    (typeof value !== "string" &&
      !(
        Array.isArray(value) && value.every((item) => typeof item === "string")
      ))
  ) {
    throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
  }
  const assetValue =
    where.field[0] === "id"
      ? asset.id
      : where.field[0] === "folderId"
        ? asset.folderId
        : formatAssetName(asset);
  if (assetValue === undefined) {
    return false;
  }
  return where.operator === "eq"
    ? assetValue === value
    : Array.isArray(value) && value.includes(assetValue);
};

const validateStaticAssetWhere = (where: StructuredAssetQueryWhereBinding) => {
  if ("all" in where || "any" in where) {
    const children = "all" in where ? where.all : where.any;
    if (children.length === 0) {
      throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
    }
    for (const child of children) {
      validateStaticAssetWhere(child);
    }
    return;
  }
  const value = parseJsonExpression(where.value);
  if (
    (where.field[0] !== "id" &&
      where.field[0] !== "folderId" &&
      where.field[0] !== "name") ||
    where.field.length !== 1 ||
    (where.operator !== "eq" && where.operator !== "in") ||
    (typeof value !== "string" &&
      !(
        Array.isArray(value) && value.every((item) => typeof item === "string")
      ))
  ) {
    throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
  }
};

const includesAssetId = (
  output: StructuredAssetQueryResourceConfiguration["output"]
) =>
  output.includeMetadata ||
  (output.mode === "fields" &&
    output.fields.some((field) => field.length === 1 && field[0] === "id"));

const hasAssetQueryFilter = (where: StructuredAssetQueryWhereBinding) =>
  "field" in where ||
  ("all" in where
    ? where.all.some(hasAssetQueryFilter)
    : where.any.some(hasAssetQueryFilter));

const hasUnsupportedAssetQueryDataLookup = (
  fragments: readonly WebstudioFragment[],
  page: PageTransferData["page"],
  dependencies: ReturnType<typeof getStaticAssetResourceDependencies>,
  targetIds: ReadonlyMap<string, string>
) => {
  const dataSourceToAssetIds = new Map<string, Set<string>>();
  const comparisonDataSourceToAssetIds = new Map<string, Set<string>>();
  const assetIdPaths = new Map<string, string[]>();
  const getStaticPath = (node: unknown): string[] | undefined => {
    if (typeof node !== "object" || node === null) {
      return;
    }
    const value = node as Record<string, unknown>;
    if (value.type === "Identifier" && typeof value.name === "string") {
      return [value.name];
    }
    if (value.type === "ChainExpression") {
      return getStaticPath(value.expression);
    }
    if (value.type !== "MemberExpression") {
      return;
    }
    const objectPath = getStaticPath(value.object);
    if (objectPath === undefined) {
      return;
    }
    const property = value.property as Record<string, unknown> | undefined;
    const propertyName = value.computed
      ? property?.type === "Literal" &&
        (typeof property.value === "string" ||
          typeof property.value === "number")
        ? String(property.value)
        : undefined
      : property?.type === "Identifier" && typeof property.name === "string"
        ? property.name
        : undefined;
    return propertyName === undefined
      ? undefined
      : [...objectPath, propertyName];
  };
  const getCollectionDataPaths = (
    node: unknown,
    includeData = false
  ): string[][] => {
    if (typeof node !== "object" || node === null) {
      return [];
    }
    const path = getStaticPath(node);
    if (path?.length === 2 && path[1] === "data") {
      return [path];
    }
    const value = node as Record<string, unknown>;
    if (value.type === "MemberExpression") {
      const property = value.property as Record<string, unknown> | undefined;
      const propertyName = value.computed
        ? property?.type === "Literal" && typeof property.value === "string"
          ? property.value
          : undefined
        : property?.type === "Identifier" && typeof property.name === "string"
          ? property.name
          : undefined;
      if (propertyName === "data" || propertyName === undefined) {
        return getCollectionDataPaths(value.object, true);
      }
    }
    if (includeData && path?.length === 1) {
      return [[...path, "data"]];
    }
    const branches =
      value.type === "ConditionalExpression"
        ? [value.consequent, value.alternate]
        : value.type === "LogicalExpression"
          ? [value.left, value.right]
          : value.type === "SequenceExpression" &&
              Array.isArray(value.expressions)
            ? [value.expressions.at(-1)]
            : value.type === "ChainExpression" ||
                value.type === "ParenthesizedExpression"
              ? [value.expression]
              : [];
    return branches.flatMap((branch) =>
      getCollectionDataPaths(branch, includeData)
    );
  };
  for (const fragment of fragments) {
    const data = createWebstudioDataFromFragment(fragment);
    const dataSources = [...data.dataSources.values()];
    for (const dataSource of dataSources) {
      if (dataSource.type !== "resource") {
        continue;
      }
      const dependency = dependencies.get(dataSource.resourceId);
      if (dependency === undefined) {
        continue;
      }
      const assetIds = new Set(dependency.assets.map(({ id }) => id));
      comparisonDataSourceToAssetIds.set(dataSource.id, assetIds);
      assetIdPaths.set(dataSource.id, ["data", "id"]);
      if (dependency.query.result !== "many") {
        continue;
      }
      dataSourceToAssetIds.set(dataSource.id, assetIds);
    }
    for (const instance of data.instances.values()) {
      if (instance.component !== collectionComponent) {
        continue;
      }
      const props = [...data.props.values()].filter(
        (prop) => prop.instanceId === instance.id
      );
      const collectionData = props.find((prop) => prop.name === "data");
      if (collectionData?.type !== "expression") {
        continue;
      }
      let expression: unknown;
      try {
        expression = parseExpressionAt(collectionData.value, 0, {
          ecmaVersion: "latest",
        });
      } catch {
        continue;
      }
      const collectionDataPaths = getCollectionDataPaths(expression);
      const dependenciesForCollection = collectionDataPaths.flatMap(
        ([dataSourceName]) => {
          const dataSourceId = decodeDataVariableId(dataSourceName);
          const dataSource =
            dataSourceId === undefined
              ? undefined
              : data.dataSources.get(dataSourceId);
          const dependency =
            dataSource?.type === "resource"
              ? dependencies.get(dataSource.resourceId)
              : undefined;
          return dependency?.query.result === "many" ? [dependency] : [];
        }
      );
      if (dependenciesForCollection.length === 0) {
        continue;
      }
      const assetIds = new Set(
        dependenciesForCollection.flatMap(({ assets }) =>
          assets.map(({ id }) => id)
        )
      );
      const itemAssetIds = new Set(
        dependenciesForCollection
          .filter(({ query }) => includesAssetId(query.output))
          .flatMap(({ assets }) => assets.map(({ id }) => id))
      );
      const collectionItem = props.find((prop) => prop.name === "item");
      const collectionItemKey = props.find((prop) => prop.name === "itemKey");
      if (collectionItem?.type === "parameter") {
        const dataSource = data.dataSources.get(collectionItem.value);
        if (
          dataSource?.type === "parameter" &&
          dataSource.name === "collectionItem" &&
          itemAssetIds.size > 0
        ) {
          comparisonDataSourceToAssetIds.set(dataSource.id, itemAssetIds);
          assetIdPaths.set(dataSource.id, ["id"]);
        }
      }
      if (collectionItemKey?.type === "parameter") {
        const dataSource = data.dataSources.get(collectionItemKey.value);
        if (
          dataSource?.type === "parameter" &&
          dataSource.name === "collectionItemKey"
        ) {
          comparisonDataSourceToAssetIds.set(dataSource.id, assetIds);
          assetIdPaths.set(dataSource.id, []);
        }
      }
    }
  }
  const referencesChangedAssetId = (node: unknown, key: string) => {
    const path = getStaticPath(node);
    if (path === undefined) {
      return false;
    }
    const dataSourceId = decodeDataVariableId(path[0]);
    const assetIds =
      dataSourceId === undefined
        ? undefined
        : comparisonDataSourceToAssetIds.get(dataSourceId);
    const expectedPath =
      dataSourceId === undefined ? undefined : assetIdPaths.get(dataSourceId);
    return (
      assetIds !== undefined &&
      expectedPath !== undefined &&
      path.length === expectedPath.length + 1 &&
      expectedPath.every((part, index) => path[index + 1] === part) &&
      assetIds.has(key) &&
      targetIds.get(key) !== key
    );
  };
  if (
    dataSourceToAssetIds.size === 0 &&
    comparisonDataSourceToAssetIds.size === 0
  ) {
    return false;
  }
  const expressions: Array<{ value: string; isAction?: boolean }> = [];
  for (const fragment of fragments) {
    expressions.push(
      ...fragment.children.flatMap((child) =>
        child.type === "expression" ? [{ value: child.value }] : []
      ),
      ...fragment.instances.flatMap((instance) =>
        instance.children.flatMap((child) =>
          child.type === "expression" ? [{ value: child.value }] : []
        )
      ),
      ...fragment.props.flatMap((prop) =>
        prop.type === "expression"
          ? [{ value: prop.value }]
          : prop.type === "action"
            ? prop.value.map(({ code }) => ({ value: code, isAction: true }))
            : []
      ),
      ...fragment.resources.flatMap((resource) => [
        { value: resource.url },
        ...(resource.body === undefined ? [] : [{ value: resource.body }]),
        ...resource.headers.map(({ value }) => ({ value })),
        ...(resource.searchParams?.map(({ value }) => ({ value })) ?? []),
        ...Object.values(resource.email ?? {}).flatMap((value) =>
          typeof value === "string" ? [{ value }] : []
        ),
      ])
    );
  }
  expressions.push(
    { value: page.title },
    ...Object.values(page.meta).flatMap((value) => {
      if (typeof value === "string") {
        return [{ value }];
      }
      return Array.isArray(value)
        ? value.flatMap((entry) =>
            typeof entry.content === "string" ? [{ value: entry.content }] : []
          )
        : [];
    })
  );

  let hasLookup = false;
  const hasChangedAssetResource = (node: unknown, key?: string): boolean => {
    if (typeof node !== "object" || node === null) {
      return false;
    }
    const path = getStaticPath(node);
    const dataSourceId = path && decodeDataVariableId(path[0]);
    const assetIds =
      dataSourceId === undefined
        ? undefined
        : dataSourceToAssetIds.get(dataSourceId);
    if (path?.length === 1 && assetIds !== undefined) {
      return key === undefined
        ? [...assetIds].some((id) => targetIds.get(id) !== id)
        : assetIds.has(key) && targetIds.get(key) !== key;
    }
    const value = node as Record<string, unknown>;
    const branches =
      value.type === "ConditionalExpression"
        ? [value.consequent, value.alternate]
        : value.type === "LogicalExpression"
          ? [value.left, value.right]
          : value.type === "SequenceExpression" &&
              Array.isArray(value.expressions)
            ? [value.expressions.at(-1)]
            : value.type === "ChainExpression" ||
                value.type === "ParenthesizedExpression"
              ? [value.expression]
              : [];
    return branches.some((branch) => hasChangedAssetResource(branch, key));
  };
  const hasChangedAssetMap = (node: unknown, key?: string): boolean => {
    if (typeof node !== "object" || node === null) {
      return false;
    }
    const path = getStaticPath(node);
    const dataSourceId = path && decodeDataVariableId(path[0]);
    const assetIds =
      dataSourceId === undefined
        ? undefined
        : dataSourceToAssetIds.get(dataSourceId);
    if (path?.length === 2 && path[1] === "data" && assetIds !== undefined) {
      return key === undefined
        ? [...assetIds].some((id) => targetIds.get(id) !== id)
        : assetIds.has(key) && targetIds.get(key) !== key;
    }
    const value = node as Record<string, unknown>;
    if (value.type === "MemberExpression") {
      const property = value.property as Record<string, unknown> | undefined;
      const propertyName = value.computed
        ? property?.type === "Literal" &&
          (typeof property.value === "string" ||
            typeof property.value === "number")
          ? String(property.value)
          : undefined
        : property?.type === "Identifier" && typeof property.name === "string"
          ? property.name
          : undefined;
      if (propertyName === "data") {
        return hasChangedAssetResource(value.object, key);
      }
      if (propertyName === undefined) {
        return hasChangedAssetResource(value.object, key);
      }
    }
    const branches =
      value.type === "ConditionalExpression"
        ? [value.consequent, value.alternate]
        : value.type === "LogicalExpression"
          ? [value.left, value.right]
          : value.type === "SequenceExpression" &&
              Array.isArray(value.expressions)
            ? [value.expressions.at(-1)]
            : value.type === "AssignmentExpression"
              ? [value.right]
              : value.type === "ChainExpression" ||
                  value.type === "ParenthesizedExpression"
                ? [value.expression]
                : [];
    return branches.some((branch) => hasChangedAssetMap(branch, key));
  };
  const carriesChangedAssetMap = (node: unknown): boolean => {
    if (typeof node !== "object" || node === null) {
      return false;
    }
    const value = node as Record<string, unknown>;
    const path = getStaticPath(node);
    const dataSourceId = path && decodeDataVariableId(path[0]);
    const assetIds =
      dataSourceId === undefined
        ? undefined
        : dataSourceToAssetIds.get(dataSourceId);
    if (
      assetIds !== undefined &&
      (path?.length === 1 || (path?.length === 2 && path[1] === "data"))
    ) {
      return [...assetIds].some((id) => targetIds.get(id) !== id);
    }
    if (value.type === "MemberExpression") {
      const property = value.property as Record<string, unknown> | undefined;
      const propertyName = value.computed
        ? property?.type === "Literal" &&
          (typeof property.value === "string" ||
            typeof property.value === "number")
          ? String(property.value)
          : undefined
        : property?.type === "Identifier" && typeof property.name === "string"
          ? property.name
          : undefined;
      if (propertyName === "data") {
        return hasChangedAssetResource(value.object);
      }
      if (propertyName === undefined) {
        return hasChangedAssetResource(value.object);
      }
    }
    if (path !== undefined) {
      return false;
    }
    const branches =
      value.type === "ConditionalExpression"
        ? [value.consequent, value.alternate]
        : value.type === "LogicalExpression"
          ? [value.left, value.right]
          : value.type === "SequenceExpression" &&
              Array.isArray(value.expressions)
            ? [value.expressions.at(-1)]
            : value.type === "AssignmentExpression"
              ? [value.right]
              : value.type === "ArrayExpression" &&
                  Array.isArray(value.elements)
                ? value.elements
                : value.type === "ObjectExpression" &&
                    Array.isArray(value.properties)
                  ? value.properties
                  : value.type === "Property"
                    ? [value.value]
                    : value.type === "SpreadElement"
                      ? [value.argument]
                      : value.type === "CallExpression" &&
                          Array.isArray(value.arguments)
                        ? value.arguments
                        : value.type === "ChainExpression" ||
                            value.type === "ParenthesizedExpression"
                          ? [value.expression ?? value.argument]
                          : [];
    return branches.some(carriesChangedAssetMap);
  };
  const visit = (node: unknown) => {
    if (typeof node !== "object" || node === null) {
      return;
    }
    const value = node as Record<string, unknown>;
    if (
      value.type === "BinaryExpression" &&
      ["==", "===", "!=", "!=="].includes(String(value.operator))
    ) {
      const left = value.left as Record<string, unknown> | undefined;
      const right = value.right as Record<string, unknown> | undefined;
      const leftLiteral = left?.type === "Literal" ? left.value : undefined;
      const rightLiteral = right?.type === "Literal" ? right.value : undefined;
      if (
        (typeof leftLiteral === "string" &&
          referencesChangedAssetId(value.right, leftLiteral)) ||
        (typeof rightLiteral === "string" &&
          referencesChangedAssetId(value.left, rightLiteral))
      ) {
        hasLookup = true;
      }
    }
    if (
      value.type === "CallExpression" &&
      Array.isArray(value.arguments) &&
      value.arguments.length > 0
    ) {
      const argument = value.arguments[0];
      const callee = value.callee as Record<string, unknown> | undefined;
      const property = callee?.property as Record<string, unknown> | undefined;
      const propertyName =
        property?.type === "Identifier"
          ? property.name
          : property?.type === "Literal"
            ? property.value
            : undefined;
      const list = callee?.object as Record<string, unknown> | undefined;
      const elements =
        callee?.type === "MemberExpression" &&
        propertyName === "includes" &&
        list?.type === "ArrayExpression" &&
        Array.isArray(list.elements)
          ? list.elements
          : undefined;
      if (
        elements?.some((element) => {
          const literal = element as Record<string, unknown> | undefined;
          return (
            literal?.type === "Literal" &&
            typeof literal.value === "string" &&
            referencesChangedAssetId(argument, literal.value)
          );
        })
      ) {
        hasLookup = true;
      }
    }
    if (value.type === "MemberExpression") {
      const property = value.property as Record<string, unknown> | undefined;
      const propertyKey =
        value.computed === true &&
        property?.type === "Literal" &&
        (typeof property.value === "string" ||
          typeof property.value === "number")
          ? String(property.value)
          : value.computed !== true &&
              property?.type === "Identifier" &&
              typeof property.name === "string"
            ? property.name
            : undefined;
      if (hasChangedAssetMap(value.object, propertyKey)) {
        hasLookup = true;
      }
    }
    if (
      (value.type === "AssignmentExpression" ||
        value.type === "VariableDeclarator") &&
      carriesChangedAssetMap(
        value.type === "AssignmentExpression" ? value.right : value.init
      )
    ) {
      hasLookup = true;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key !== "start" && key !== "end" && key !== "loc") {
        if (Array.isArray(child)) {
          child.forEach(visit);
        } else {
          visit(child);
        }
      }
    }
  };

  for (const { value, isAction } of expressions) {
    try {
      visit(
        isAction
          ? parseJavaScript(value, { ecmaVersion: "latest" })
          : parseExpressionAt(value, 0, { ecmaVersion: "latest" })
      );
    } catch {
      continue;
    }
    if (hasLookup) {
      return true;
    }
  }
  return false;
};

export const getStaticAssetResourceDependencies = (
  fragments: readonly WebstudioFragment[],
  assets: readonly Asset[]
) => {
  const dependencies = new Map<
    string,
    {
      assets: Asset[];
      query: StructuredAssetQueryResourceConfiguration;
    }
  >();
  for (const resource of fragments.flatMap(({ resources }) => resources)) {
    if (
      hasAssetsResourceUrl(resource) &&
      isAssetsResource(resource) === false
    ) {
      throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
    }
    if (isAssetsResource(resource) === false) {
      continue;
    }
    const parsed = parseStructuredAssetQueryResourceBodyResult(resource.body);
    if (
      parsed.success === false ||
      hasAssetQueryFilter(parsed.value.where) === false
    ) {
      throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
    }
    validateStaticAssetWhere(parsed.value.where);
    const limit = parseJsonExpression(parsed.value.limit);
    const offset = parseJsonExpression(parsed.value.offset);
    if (
      !Number.isSafeInteger(limit) ||
      Number(limit) < 0 ||
      !Number.isSafeInteger(offset) ||
      Number(offset) !== 0
    ) {
      throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
    }
    const matches = assets.filter((asset) =>
      matchesStaticAssetWhere(parsed.value.where, asset)
    );
    if (
      matches.length > Number(limit) ||
      ((parsed.value.result === "one" ||
        parsed.value.result === "first" ||
        parsed.value.result === "last") &&
        matches.length > 1)
    ) {
      throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
    }
    dependencies.set(resource.id, { assets: matches, query: parsed.value });
  }
  return dependencies;
};

type TransferAssetProperties = Awaited<
  ReturnType<typeof extractAssetQueryProperties>
>["properties"];

const getTransferAssetQueryDocument = (
  asset: Asset,
  id: string,
  path: string,
  properties: TransferAssetProperties = {}
) => {
  const name = formatAssetName(asset);
  const extensionSeparator = name.lastIndexOf(".");
  return {
    _id: id,
    name,
    description: asset.description ?? undefined,
    path,
    key: extensionSeparator <= 0 ? name : name.slice(0, extensionSeparator),
    folderId: asset.folderId,
    extension:
      extensionSeparator === -1
        ? ""
        : name.slice(extensionSeparator + 1).toLowerCase(),
    mimeType: getMimeTypeByFilename(name),
    size: asset.size,
    createdAt: asset.createdAt,
    properties,
  };
};

const getTransferAssetRuntimeData = (asset: Asset): AssetRuntimeData => ({
  url: "",
  ...("width" in asset.meta ? { width: asset.meta.width } : {}),
  ...("height" in asset.meta ? { height: asset.meta.height } : {}),
});

const getTransferAssetIdentity = (asset: Asset) =>
  `${asset.projectId}\u0000${asset.id}`;

const compareTransferAssetQueryDocuments = (
  left: Asset,
  right: Asset,
  sort: StructuredAssetQueryResourceConfiguration["sort"],
  paths: Record<string, string>,
  properties: ReadonlyMap<string, TransferAssetProperties>
) =>
  compareAssetQueryDocuments(
    getTransferAssetQueryDocument(
      left,
      left.id,
      paths[left.id],
      properties.get(getTransferAssetIdentity(left))
    ),
    getTransferAssetQueryDocument(
      right,
      right.id,
      paths[right.id],
      properties.get(getTransferAssetIdentity(right))
    ),
    sort,
    {
      [left.id]: getTransferAssetRuntimeData(left),
      [right.id]: getTransferAssetRuntimeData(right),
    }
  );

const getAssetQuerySourceOrder = (
  assets: Asset[],
  query: StructuredAssetQueryResourceConfiguration,
  queryAssets: ReadonlyMap<string, Asset>,
  paths: Record<string, string>,
  properties: ReadonlyMap<string, TransferAssetProperties>
) =>
  [...assets]
    .sort((left, right) =>
      compareTransferAssetQueryDocuments(
        queryAssets.get(left.id)!,
        queryAssets.get(right.id)!,
        query.sort,
        paths,
        properties
      )
    )
    .map(({ id }) => id);

const hasChangedAssetResourceQueryOrder = async (
  dependencies: ReturnType<typeof getStaticAssetResourceDependencies>,
  targetAssets: ReadonlyMap<string, Asset>,
  sourcePaths: Record<string, string>,
  targetPaths: Record<string, string>,
  sameStorage: boolean,
  documents: ReadonlyMap<string, { source: string }>
): Promise<boolean> => {
  const properties = new Map<string, TransferAssetProperties>();
  for (const { assets, query } of dependencies.values()) {
    if (assets.length < 2) {
      continue;
    }
    if (
      query.sort.some(({ field }) =>
        ["url", "revision", "excerpt"].includes(field[0])
      ) &&
      (!sameStorage ||
        assets.some((asset) => {
          const target = targetAssets.get(asset.id);
          return (
            target === undefined ||
            target.id !== asset.id ||
            sourcePaths[asset.id] !== targetPaths[target.id]
          );
        }))
    ) {
      return true;
    }
    if (query.sort.some(({ field }) => field[0] === "properties")) {
      if (!sameStorage) {
        return true;
      }
      for (const asset of assets) {
        const source = documents.get(asset.id)?.source;
        if (
          source === undefined &&
          ["md", "mdx", "json"].includes(asset.format.toLowerCase())
        ) {
          return true;
        }
        try {
          const assetProperties =
            source === undefined
              ? {}
              : (await extractAssetQueryProperties(asset.format, source))
                  .properties;
          if (
            typeof assetProperties !== "object" ||
            assetProperties === null ||
            Array.isArray(assetProperties)
          ) {
            throw new Error("Invalid asset properties");
          }
          properties.set(getTransferAssetIdentity(asset), assetProperties);
          const target = targetAssets.get(asset.id);
          if (target === undefined) {
            return true;
          }
          properties.set(getTransferAssetIdentity(target), assetProperties);
        } catch {
          properties.set(getTransferAssetIdentity(asset), {});
          const target = targetAssets.get(asset.id);
          if (target === undefined) {
            return true;
          }
          properties.set(getTransferAssetIdentity(target), {});
        }
      }
    }
    const sortedSourceIds = getAssetQuerySourceOrder(
      assets,
      query,
      new Map(assets.map((asset) => [asset.id, asset])),
      sourcePaths,
      properties
    );
    const sortedTargetSourceIds = getAssetQuerySourceOrder(
      assets,
      query,
      targetAssets,
      targetPaths,
      properties
    );
    if (
      sortedSourceIds.some(
        (sourceId, index) => sourceId !== sortedTargetSourceIds[index]
      )
    ) {
      return true;
    }
  }
  return false;
};

const hasTransferableDynamicContentBlockSource = (
  fragment: WebstudioFragment,
  assetResourceDependencies: ReturnType<
    typeof getStaticAssetResourceDependencies
  >
) => {
  const data = createWebstudioDataFromFragment(fragment);
  const dynamicSources = [...data.instances.values()]
    .filter((instance) => instance.component === blockComponent)
    .map((instance) =>
      getContentBlockSource({
        blockInstanceId: instance.id,
        props: data.props.values(),
      })
    )
    .filter(
      (source) =>
        source?.type === "expression" &&
        getStaticContentBlockSourceAssetId(source) === undefined
    );
  const getAssetResourceDataSource = (expression: string) => {
    const path = parseDirectPathExpression(expression)?.path;
    const dataSourceId =
      path === undefined ? undefined : decodeDataVariableId(path[0]);
    const dataSource =
      dataSourceId === undefined
        ? undefined
        : data.dataSources.get(dataSourceId);
    const dependency =
      dataSource?.type === "resource"
        ? assetResourceDependencies.get(dataSource.resourceId)
        : undefined;
    return dependency === undefined
      ? undefined
      : { dataSource, dependency, path };
  };
  return (
    dynamicSources.length > 0 &&
    dynamicSources.every((source) => {
      if (source?.type !== "expression") {
        return false;
      }
      const sourcePath = parseDirectPathExpression(source.value)?.path;
      if (sourcePath === undefined) {
        return false;
      }
      const dataSourceId = decodeDataVariableId(sourcePath[0]);
      const dataSource =
        dataSourceId === undefined
          ? undefined
          : data.dataSources.get(dataSourceId);
      if (dataSource?.type === "resource") {
        const dependency = assetResourceDependencies.get(dataSource.resourceId);
        return (
          sourcePath.at(-1) === "id" &&
          dependency !== undefined &&
          (dependency.query.result === "one" ||
            dependency.query.result === "first" ||
            dependency.query.result === "last") &&
          sourcePath.length === 3 &&
          sourcePath[1] === "data" &&
          sourcePath[2] === "id"
        );
      }
      if (
        dataSource?.type !== "parameter" ||
        (dataSource.name !== "collectionItem" &&
          dataSource.name !== "collectionItemKey") ||
        dataSource.scopeInstanceId === undefined ||
        data.instances.get(dataSource.scopeInstanceId)?.component !==
          collectionComponent
      ) {
        return false;
      }
      const collectionData = [...data.props.values()].find(
        (prop) =>
          prop.instanceId === dataSource.scopeInstanceId &&
          prop.name === "data" &&
          prop.type === "expression"
      );
      const collectionItemProp = [...data.props.values()].find(
        (prop) =>
          prop.instanceId === dataSource.scopeInstanceId &&
          prop.name === "item" &&
          prop.type === "parameter"
      );
      const collectionItemKeyProp = [...data.props.values()].find(
        (prop) =>
          prop.instanceId === dataSource.scopeInstanceId &&
          prop.name === "itemKey" &&
          prop.type === "parameter"
      );
      const itemDataSource =
        collectionItemProp?.type === "parameter"
          ? data.dataSources.get(collectionItemProp.value)
          : undefined;
      const itemKeyDataSource =
        collectionItemKeyProp?.type === "parameter"
          ? data.dataSources.get(collectionItemKeyProp.value)
          : undefined;
      const collectionDataSource =
        collectionData?.type === "expression"
          ? getAssetResourceDataSource(collectionData.value)
          : undefined;
      return (
        collectionData?.type === "expression" &&
        collectionDataSource !== undefined &&
        collectionDataSource.path !== undefined &&
        collectionDataSource.path.length === 2 &&
        collectionDataSource.path[1] === "data" &&
        collectionDataSource.dependency.query.result === "many" &&
        ((dataSource.name === "collectionItem" &&
          itemDataSource?.id === dataSource.id &&
          sourcePath.length === 2 &&
          sourcePath[1] === "id" &&
          includesAssetId(collectionDataSource.dependency.query.output)) ||
          (dataSource.name === "collectionItemKey" &&
            itemKeyDataSource?.id === dataSource.id &&
            sourcePath.length === 1))
      );
    })
  );
};

const remapPageTransferFragment = (
  fragment: WebstudioFragment,
  assets: ReadonlyMap<string, Asset>,
  assetResourceSourceIds: ReadonlyMap<string, readonly string[]>
) => {
  const remapped = remapFragmentAssets(fragment, assets);
  const blockSources = getContentBlockSources(fragment);
  return {
    ...remapped,
    props: remapped.props.map((prop) => {
      if (prop.name !== contentBlockSourceProp || prop.type !== "expression") {
        return prop;
      }
      const source = blockSources.get(prop.instanceId);
      if (source?.type !== "expression") {
        return prop;
      }
      const sourceId = getStaticContentBlockSourceAssetId(source);
      const target = sourceId === undefined ? undefined : assets.get(sourceId);
      return target === undefined || target.id === sourceId
        ? prop
        : { ...prop, value: JSON.stringify(target.id) };
    }),
    resources: remapped.resources.map((resource) => {
      if (
        assetResourceSourceIds.has(resource.id) === false ||
        isAssetsResource(resource) === false
      ) {
        return resource;
      }
      const parsed = parseStructuredAssetQueryResourceBodyResult(resource.body);
      if (parsed.success === false) {
        throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
      }
      const copiedIds = assetResourceSourceIds
        .get(resource.id)!
        .flatMap((id) => {
          const targetId = assets.get(id)?.id;
          return targetId === undefined ? [] : [targetId];
        });
      const idFilter: StructuredAssetQueryWhereBinding = {
        field: ["id"],
        operator: copiedIds.length === 1 ? "eq" : "in",
        value: JSON.stringify(
          copiedIds.length === 1 ? copiedIds[0] : copiedIds
        ),
      };
      const body = createStructuredAssetQueryResourceBody({
        ...parsed.value,
        where: idFilter,
      });
      if (parseStructuredAssetQueryResourceBodyResult(body).success === false) {
        throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
      }
      return {
        ...resource,
        body,
      };
    }),
  };
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
  assets: ReadonlyMap<string, Asset>,
  assetResourceSourceIds: ReadonlyMap<string, readonly string[]>
): PageTransferData => {
  const mapId = (id: string | undefined) =>
    id === undefined ? undefined : (assets.get(id)?.id ?? id);
  return {
    ...item,
    rootFragment: remapPageTransferFragment(
      item.rootFragment,
      assets,
      assetResourceSourceIds
    ),
    bodyFragment: remapPageTransferFragment(
      item.bodyFragment,
      assets,
      assetResourceSourceIds
    ),
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
  const assetResourceDependencies = sameProject
    ? new Map<
        string,
        { assets: Asset[]; query: StructuredAssetQueryResourceConfiguration }
      >()
    : getStaticAssetResourceDependencies(fragments, source.assets);
  if (
    !sameStorage &&
    [...assetResourceDependencies.values()].some(
      ({ assets, query }) =>
        assets.length > 1 &&
        query.sort.some(({ field }) =>
          ["url", "revision", "excerpt", "properties"].includes(field[0])
        )
    )
  ) {
    throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
  }
  if (
    fragments.some(
      (fragment) =>
        !hasRenderedScope &&
        hasDynamicContentBlockSource(fragment) &&
        hasTransferableDynamicContentBlockSource(
          fragment,
          assetResourceDependencies
        ) === false
    )
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
  for (const { assets } of assetResourceDependencies.values()) {
    for (const asset of assets) {
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
  if (
    hasUnsupportedAssetQueryDataLookup(
      fragments,
      item.page,
      assetResourceDependencies,
      targetIds
    )
  ) {
    throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
  }
  const assetResourceSourceIds = new Map(
    [...assetResourceDependencies].map(([resourceId, dependency]) => [
      resourceId,
      dependency.assets.map(({ id }) => id),
    ])
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
  return {
    item,
    folders,
    assets,
    assetResourceDependencies,
    documents,
    target,
    sourcePaths,
    sameStorage,
    assetResourceSourceIds,
  };
};

export const previewPageTransfer = (
  plan: Awaited<ReturnType<typeof planPageTransfer>>
) => {
  const assets = new Map(
    plan.assets.map(({ source, target }) => [source.id, target])
  );
  return remapPageTransfer(plan.item, assets, plan.assetResourceSourceIds);
};

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
  if (
    await hasChangedAssetResourceQueryOrder(
      plan.assetResourceDependencies,
      assets,
      plan.sourcePaths,
      getAssetCatalogPaths(current),
      plan.sameStorage,
      plan.documents
    )
  ) {
    throw pageCopyError("PAGE_COPY_DYNAMIC_DEPENDENCY_UNSUPPORTED");
  }
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
  return await commit(
    remapPageTransfer(plan.item, assets, plan.assetResourceSourceIds),
    revision
  );
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
