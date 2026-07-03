import type { StyleValue } from "@webstudio-is/css-engine";
import deepEqual from "fast-deep-equal";
import { z } from "zod";
import {
  getAllPages,
  getStyleDeclKey,
  type Asset,
  type DataSource,
  type Pages,
  type Prop,
  type Props,
  type Resource,
  type StyleDecl,
  type Styles,
} from "@webstudio-is/sdk";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import type { CompactBuild } from "../types";
import { throwBuilderRuntimeError } from "./errors";
import { createRuntimeMutation } from "./mutation";

export type AssetUsage =
  | { type: "favicon" }
  | { type: "socialImage"; pageId: string }
  | { type: "marketplaceThumbnail"; pageId: string }
  | { type: "prop"; propId: string }
  | { type: "style"; styleDeclKey: string };

type AssetStyleValueReplacement = {
  fromAssetId: string;
  toAssetId: string;
  fromFontFamily?: string;
  toFontFamily?: string;
};

export const assetReplaceInput = z.object({
  fromAssetId: z.string(),
  toAssetId: z.string(),
});

export const assetDeleteInput = z.object({
  assetIdsOrPrefixes: z.array(z.string()).min(1),
  force: z.boolean().optional(),
});

const traverseAssetStyleValue = (
  value: StyleValue,
  callback: (value: StyleValue) => void
) => {
  callback(value);
  if (value.type === "tuple" || value.type === "layers") {
    for (const item of value.value) {
      traverseAssetStyleValue(item, callback);
    }
  }
};

export const replaceAssetInStyleValueMutable = (
  value: StyleValue,
  replacement: AssetStyleValueReplacement
) => {
  let didReplace = false;
  const { fromFontFamily, toFontFamily } = replacement;
  traverseAssetStyleValue(value, (item) => {
    if (
      item.type === "image" &&
      item.value.type === "asset" &&
      item.value.value === replacement.fromAssetId
    ) {
      item.value.value = replacement.toAssetId;
      didReplace = true;
    }
    if (
      item.type === "fontFamily" &&
      fromFontFamily !== undefined &&
      toFontFamily !== undefined &&
      item.value.includes(fromFontFamily)
    ) {
      item.value = item.value.map((fontFamily) =>
        fontFamily === fromFontFamily ? toFontFamily : fontFamily
      );
      didReplace = true;
    }
  });
  return didReplace;
};

export const replaceAssetMutable = ({
  pages,
  props,
  styles,
  replacement,
}: {
  pages?: Pages;
  props: Iterable<Prop>;
  styles: Iterable<StyleDecl>;
  replacement: AssetStyleValueReplacement;
}) => {
  if (pages !== undefined) {
    if (pages.meta?.faviconAssetId === replacement.fromAssetId) {
      pages.meta.faviconAssetId = replacement.toAssetId;
    }
    for (const page of getAllPages(pages)) {
      if (page.meta.socialImageAssetId === replacement.fromAssetId) {
        page.meta.socialImageAssetId = replacement.toAssetId;
      }
      if (page.marketplace?.thumbnailAssetId === replacement.fromAssetId) {
        page.marketplace.thumbnailAssetId = replacement.toAssetId;
      }
    }
  }
  for (const prop of props) {
    if (prop.type === "asset" && prop.value === replacement.fromAssetId) {
      prop.value = replacement.toAssetId;
    }
  }
  for (const styleDecl of styles) {
    replaceAssetInStyleValueMutable(styleDecl.value, replacement);
  }
};

export const calculateUsagesByAssetId = ({
  pages,
  props,
  styles,
  assets,
}: {
  pages: Pages | undefined;
  props: Props;
  styles: Styles;
  assets: Map<Asset["id"], Asset>;
}): Map<Asset["id"], AssetUsage[]> => {
  const usagesByAsset = new Map<Asset["id"], AssetUsage[]>();
  const addUsage = (assetId: Asset["id"], usage: AssetUsage) => {
    const usages = usagesByAsset.get(assetId) ?? [];
    usages.push(usage);
    usagesByAsset.set(assetId, usages);
  };

  const fontFamilyToAssetId = new Map<string, Asset["id"]>();
  for (const asset of assets.values()) {
    if (asset.type === "font") {
      fontFamilyToAssetId.set(asset.meta.family, asset.id);
    }
  }

  if (pages?.meta?.faviconAssetId) {
    addUsage(pages.meta.faviconAssetId, { type: "favicon" });
  }
  if (pages) {
    for (const page of getAllPages(pages)) {
      if (page.meta.socialImageAssetId) {
        addUsage(page.meta.socialImageAssetId, {
          type: "socialImage",
          pageId: page.id,
        });
      }
      if (page.marketplace?.thumbnailAssetId) {
        addUsage(page.marketplace.thumbnailAssetId, {
          type: "marketplaceThumbnail",
          pageId: page.id,
        });
      }
    }
  }
  for (const prop of props.values()) {
    if (
      prop.type === "asset" &&
      prop.name !== "width" &&
      prop.name !== "height"
    ) {
      addUsage(prop.value, { type: "prop", propId: prop.id });
    }
  }
  for (const [styleDeclKey, styleDecl] of styles) {
    traverseAssetStyleValue(styleDecl.value, (value) => {
      if (value.type === "image" && value.value.type === "asset") {
        addUsage(value.value.value, {
          type: "style",
          styleDeclKey,
        });
      }
      if (value.type === "fontFamily") {
        for (const fontFamily of value.value) {
          const assetId = fontFamilyToAssetId.get(fontFamily);
          if (assetId !== undefined) {
            addUsage(assetId, {
              type: "style",
              styleDeclKey,
            });
          }
        }
      }
    });
  }
  return usagesByAsset;
};

type AssetReferenceBuild = Pick<
  CompactBuild,
  "pages" | "props" | "styles" | "resources" | "dataSources"
>;

const getRequiredAssets = (state: Pick<BuilderState, "assets">) => {
  if (state.assets === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Assets namespace is missing"
    );
  }
  return state.assets;
};

const getRequiredAssetReferenceBuild = (
  state: Pick<
    BuilderState,
    "pages" | "props" | "styles" | "resources" | "dataSources"
  >
): AssetReferenceBuild => {
  if (
    state.pages === undefined ||
    state.props === undefined ||
    state.styles === undefined ||
    state.resources === undefined ||
    state.dataSources === undefined
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Asset reference namespaces are missing"
    );
  }
  return {
    pages: state.pages,
    props: Array.from(state.props.values()),
    styles: Array.from(state.styles.values()),
    resources: Array.from(state.resources.values()),
    dataSources: Array.from(state.dataSources.values()),
  };
};

export const createAssetReplacementPayload = ({
  build,
  fromAsset,
  toAsset,
}: {
  build: Pick<CompactBuild, "pages" | "props" | "styles">;
  fromAsset: Asset;
  toAsset: Asset;
}) => {
  const pages = structuredClone(build.pages);
  const props = new Map(
    build.props.map((item) => [item.id, structuredClone(item)])
  );
  const styles = new Map(
    build.styles.map((item) => [getStyleDeclKey(item), structuredClone(item)])
  );

  replaceAssetMutable({
    pages,
    props: props.values(),
    styles: styles.values(),
    replacement: {
      fromAssetId: fromAsset.id,
      toAssetId: toAsset.id,
      fromFontFamily:
        fromAsset.type === "font" ? fromAsset.meta.family : undefined,
      toFontFamily: toAsset.type === "font" ? toAsset.meta.family : undefined,
    },
  });

  const pagePatches = [];
  if (build.pages.meta?.faviconAssetId !== pages.meta?.faviconAssetId) {
    pagePatches.push({
      op: "replace" as const,
      path: ["meta", "faviconAssetId"],
      value: pages.meta?.faviconAssetId,
    });
  }
  for (const page of getAllPages(build.pages)) {
    const nextPage = pages.pages.get(page.id);
    if (nextPage === undefined) {
      continue;
    }
    if (page.meta.socialImageAssetId !== nextPage.meta.socialImageAssetId) {
      pagePatches.push({
        op: "replace" as const,
        path: ["pages", page.id, "meta", "socialImageAssetId"],
        value: nextPage.meta.socialImageAssetId,
      });
    }
    if (
      page.marketplace?.thumbnailAssetId !==
      nextPage.marketplace?.thumbnailAssetId
    ) {
      pagePatches.push({
        op: "replace" as const,
        path: ["pages", page.id, "marketplace", "thumbnailAssetId"],
        value: nextPage.marketplace?.thumbnailAssetId,
      });
    }
  }

  const propPatches = [];
  for (const item of build.props) {
    const nextItem = props.get(item.id);
    if (nextItem !== undefined && deepEqual(item, nextItem) === false) {
      propPatches.push({
        op: "replace" as const,
        path: [item.id],
        value: nextItem,
      });
    }
  }

  const stylePatches = [];
  for (const item of build.styles) {
    const key = getStyleDeclKey(item);
    const nextItem = styles.get(key);
    if (
      nextItem !== undefined &&
      deepEqual(item.value, nextItem.value) === false
    ) {
      stylePatches.push({
        op: "replace" as const,
        path: [key],
        value: nextItem,
      });
    }
  }

  const payload = [];
  if (pagePatches.length > 0) {
    payload.push({ namespace: "pages" as const, patches: pagePatches });
  }
  if (propPatches.length > 0) {
    payload.push({ namespace: "props" as const, patches: propPatches });
  }
  if (stylePatches.length > 0) {
    payload.push({ namespace: "styles" as const, patches: stylePatches });
  }
  payload.push({
    namespace: "assets" as const,
    patches: [{ op: "remove" as const, path: [fromAsset.id] }],
  });
  return payload;
};

export const findAsset = (assets: Iterable<Asset>, assetId: Asset["id"]) => {
  for (const asset of assets) {
    if (asset.id === assetId) {
      return asset;
    }
  }
};

const countStringReferences = (value: unknown, target: string): number => {
  if (value === target) {
    return 1;
  }
  if (Array.isArray(value)) {
    return value.reduce(
      (count, item) => count + countStringReferences(item, target),
      0
    );
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).reduce(
      (count, item) => count + countStringReferences(item, target),
      0
    );
  }
  return 0;
};

const countResourceAssetReferences = (resource: Resource, assetId: string) =>
  countStringReferences(resource.url, assetId) +
  countStringReferences(resource.body, assetId) +
  countStringReferences(
    resource.searchParams?.map((param) => param.value),
    assetId
  ) +
  countStringReferences(
    resource.headers.map((header) => header.value),
    assetId
  );

const countDataSourceAssetReferences = (
  dataSource: DataSource,
  assetId: string
) =>
  dataSource.type === "variable"
    ? countStringReferences(dataSource.value, assetId)
    : 0;

const countApiOnlyAssetUsage = (build: AssetReferenceBuild, assetId: string) =>
  build.resources.reduce(
    (count, resource) =>
      count + countResourceAssetReferences(resource, assetId),
    0
  ) +
  build.dataSources.reduce(
    (count, dataSource) =>
      count + countDataSourceAssetReferences(dataSource, assetId),
    0
  );

const getAssetUsageCounts = (build: AssetReferenceBuild, assets: Asset[]) => {
  const usageMap = calculateUsagesByAssetId({
    pages: build.pages,
    props: new Map(build.props.map((item) => [item.id, item])),
    styles: new Map(build.styles.map((item) => [getStyleDeclKey(item), item])),
    assets: new Map(assets.map((asset) => [asset.id, asset])),
  });
  const counts = new Map<Asset["id"], number>();
  for (const asset of assets) {
    counts.set(
      asset.id,
      (usageMap.get(asset.id)?.length ?? 0) +
        countApiOnlyAssetUsage(build, asset.id)
    );
  }
  return counts;
};

const serializeAssetSummary = (asset: Asset) => ({
  id: asset.id,
  name: asset.name,
  type: asset.type,
  size: asset.size,
  contentType: asset.format,
  createdAt: asset.createdAt,
});

export const serializeAssetList = ({
  assets,
  build,
  input,
}: {
  assets: Asset[];
  build?: AssetReferenceBuild;
  input: {
    type?: "image" | "font";
    withUsage?: boolean;
    sort?: "name" | "size" | "createdAt" | "usage";
    cursor?: string;
    limit?: number;
  };
}) => {
  const shouldCountUsage = input.withUsage === true || input.sort === "usage";
  const usageCounts =
    shouldCountUsage && build !== undefined
      ? getAssetUsageCounts(build, assets)
      : undefined;
  const sorted = assets
    .filter((asset) => input.type === undefined || asset.type === input.type)
    .map((asset) => ({
      ...serializeAssetSummary(asset),
      usageCount: shouldCountUsage
        ? (usageCounts?.get(asset.id) ?? 0)
        : undefined,
    }));
  sorted.sort((left, right) => {
    switch (input.sort) {
      case "size":
        return right.size - left.size;
      case "createdAt":
        return right.createdAt.localeCompare(left.createdAt);
      case "usage":
        return (right.usageCount ?? 0) - (left.usageCount ?? 0);
      case "name":
      default:
        return left.name.localeCompare(right.name);
    }
  });
  const start = input.cursor === undefined ? 0 : Number(input.cursor);
  if (Number.isInteger(start) === false || start < 0) {
    throw new Error("Invalid asset cursor");
  }
  const limit = input.limit ?? sorted.length;
  const items = sorted.slice(start, start + limit);
  const nextIndex = start + items.length;
  return {
    items,
    nextCursor: nextIndex < sorted.length ? String(nextIndex) : null,
  };
};

export const createAssetUsageList = ({
  asset,
  assets,
  build,
}: {
  asset: Asset;
  assets: Asset[];
  build: AssetReferenceBuild;
}) => {
  const usages: Array<{
    namespace:
      | "props"
      | "styles"
      | "resources"
      | "dataSources"
      | "pages"
      | "project";
    pageId?: string;
    instanceId?: string;
    path: Array<string | number>;
  }> = [];
  const props = new Map(build.props.map((item) => [item.id, item]));
  const styles = new Map(
    build.styles.map((item) => [getStyleDeclKey(item), item])
  );
  const usageMap = calculateUsagesByAssetId({
    pages: build.pages,
    props,
    styles,
    assets: new Map(assets.map((item) => [item.id, item])),
  });
  for (const usage of usageMap.get(asset.id) ?? []) {
    if (usage.type === "favicon") {
      usages.push({ namespace: "project", path: ["meta", "faviconAssetId"] });
    }
    if (usage.type === "socialImage") {
      usages.push({
        namespace: "pages",
        pageId: usage.pageId,
        path: ["pages", usage.pageId, "meta", "socialImageAssetId"],
      });
    }
    if (usage.type === "marketplaceThumbnail") {
      usages.push({
        namespace: "pages",
        pageId: usage.pageId,
        path: ["pages", usage.pageId, "marketplace", "thumbnailAssetId"],
      });
    }
    if (usage.type === "prop") {
      usages.push({
        namespace: "props",
        instanceId: props.get(usage.propId)?.instanceId,
        path: [usage.propId, "value"],
      });
    }
    if (usage.type === "style") {
      usages.push({
        namespace: "styles",
        path: [usage.styleDeclKey, "value"],
      });
    }
  }
  for (const resource of build.resources) {
    if (countResourceAssetReferences(resource, asset.id) > 0) {
      usages.push({ namespace: "resources", path: [resource.id] });
    }
  }
  for (const dataSource of build.dataSources) {
    if (countDataSourceAssetReferences(dataSource, asset.id) > 0) {
      usages.push({ namespace: "dataSources", path: [dataSource.id] });
    }
  }
  return usages;
};

export const createAssetDeletePayload = (
  assets: Asset[]
): BuilderPatchChange[] => [
  {
    namespace: "assets",
    patches: assets.map((asset) => ({
      op: "remove" as const,
      path: [asset.id],
    })),
  },
];

export const listAssets = (
  state: Pick<
    BuilderState,
    "assets" | "pages" | "props" | "styles" | "resources" | "dataSources"
  >,
  input: {
    type?: "image" | "font";
    withUsage?: boolean;
    sort?: "name" | "size" | "createdAt" | "usage";
    cursor?: string;
    limit?: number;
  } = {}
) => {
  try {
    return serializeAssetList({
      assets: Array.from(getRequiredAssets(state).values()),
      build:
        input.withUsage === true || input.sort === "usage"
          ? getRequiredAssetReferenceBuild(state)
          : undefined,
      input,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid asset cursor") {
      return throwBuilderRuntimeError("BAD_REQUEST", error.message);
    }
    throw error;
  }
};

export const findAssetUsage = (
  state: Pick<
    BuilderState,
    "assets" | "pages" | "props" | "styles" | "resources" | "dataSources"
  >,
  input: { assetId: string }
) => {
  const assets = Array.from(getRequiredAssets(state).values());
  const asset = findAsset(assets, input.assetId);
  if (asset === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Asset not found");
  }
  return {
    usages: createAssetUsageList({
      asset,
      assets,
      build: getRequiredAssetReferenceBuild(state),
    }),
  };
};

export const replaceAsset = (
  state: Pick<
    BuilderState,
    "assets" | "pages" | "props" | "styles" | "resources" | "dataSources"
  >,
  input: z.infer<typeof assetReplaceInput>
) => {
  const assets = Array.from(getRequiredAssets(state).values());
  const fromAsset = findAsset(assets, input.fromAssetId);
  const toAsset = findAsset(assets, input.toAssetId);
  if (fromAsset === undefined || toAsset === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Asset not found");
  }
  const build = getRequiredAssetReferenceBuild(state);
  const unrewritableUsages = createAssetUsageList({
    asset: fromAsset,
    assets,
    build,
  }).filter(
    (usage) =>
      usage.namespace === "resources" || usage.namespace === "dataSources"
  );
  if (unrewritableUsages.length > 0) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Asset is referenced in resources or variables. Update those references before replacing the asset."
    );
  }
  return createRuntimeMutation({
    payload: createAssetReplacementPayload({
      build,
      fromAsset,
      toAsset,
    }),
    result: { fromAssetId: fromAsset.id, toAssetId: toAsset.id },
    invalidatesNamespaces: ["pages", "props", "styles", "assets"],
  });
};

export const deleteAssets = (
  state: Pick<
    BuilderState,
    "assets" | "pages" | "props" | "styles" | "resources" | "dataSources"
  >,
  input: z.infer<typeof assetDeleteInput>
) => {
  const assets = Array.from(getRequiredAssets(state).values());
  const selectedAssets = assets.filter((asset) =>
    input.assetIdsOrPrefixes.some(
      (value) => asset.id === value || asset.id.startsWith(value)
    )
  );
  if (selectedAssets.length === 0) {
    return createRuntimeMutation({
      payload: [],
      result: { assetIds: [] },
      invalidatesNamespaces: ["assets"],
    });
  }
  const build = getRequiredAssetReferenceBuild(state);
  const usagesByAsset = new Map(
    selectedAssets.map((asset) => [
      asset.id,
      createAssetUsageList({ asset, assets, build }),
    ])
  );
  if (input.force !== true) {
    const usedAssetIds = selectedAssets
      .filter((asset) => (usagesByAsset.get(asset.id)?.length ?? 0) > 0)
      .map((asset) => asset.id);
    if (usedAssetIds.length > 0) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Assets are still referenced: ${usedAssetIds.join(", ")}`
      );
    }
  }
  return createRuntimeMutation({
    payload: createAssetDeletePayload(selectedAssets),
    result: { assetIds: selectedAssets.map((asset) => asset.id) },
    invalidatesNamespaces: ["assets"],
  });
};
