import type { StyleValue } from "@webstudio-is/css-engine";
import deepEqual from "fast-deep-equal";
import isValidFilename from "valid-filename";
import { z } from "zod";
import {
  ALLOWED_FILE_TYPES,
  getAllPages,
  getFileExtension,
  getStyleDeclKey,
  isAllowedMimeCategory,
  formatAssetName,
  getAssetDisplayNameParts,
  parseAssetName,
  type Asset,
  type DataSource,
  type Pages,
  type Prop,
  type Props,
  type Resource,
  type StyleDecl,
  type Styles,
  assetType,
  fileAsset,
  fontAsset,
  imageAsset,
} from "@webstudio-is/sdk";
import {
  appendOptionalPropertyPatch,
  type BuilderPatchChange,
} from "../contracts/patch";
import {
  paginateOutput,
  projectOutput,
  type PaginatedOutputInput,
} from "./output";
import type { BuilderState } from "../state/builder-state";
import type { CompactBuild } from "../types";
import type { ProjectSettings } from "../shared/project-settings";
import {
  addZodValidationIssue,
  getZodValidationIssueOptions,
  throwBuilderRuntimeError,
} from "./errors";
import { createRuntimeMutation } from "./mutation";
import { createCopyName } from "./copy-name";
import type { BuilderRuntimeContext } from "./context";
import {
  collectFontFamiliesFromStyleValue,
  traverseStyleValue,
} from "./style-utils";

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

export const assetUpdateInput = z.object({
  assetId: z.string(),
  values: z
    .object({
      filename: z
        .string()
        .describe(
          "Editable display filename. This does not change the immutable uploaded asset name; list-assets returns both name and filename."
        )
        .optional(),
      description: z.union([z.string(), z.null()]).optional(),
      folderId: z.union([z.string().min(1), z.null()]).optional(),
    })
    .refine(
      (values) => Object.keys(values).length > 0,
      getZodValidationIssueOptions({
        code: "empty_asset_update",
        path: [],
        message: "At least one asset field is required",
        constraint: "at_least_one_property",
        example: { description: "A concise image description" },
      })
    ),
});

const imageDescriptionUpdate = z.union([
  z
    .object({
      assetId: z.string(),
      description: z
        .string()
        .trim()
        .min(1)
        .describe(
          "Concise alt description generated after inspecting the rendered image in context."
        ),
      decorative: z.literal(false).optional(),
    })
    .strict(),
  z
    .object({
      assetId: z.string(),
      decorative: z
        .literal(true)
        .describe(
          "Mark the image decorative and intentionally store an empty alt description."
        ),
    })
    .strict(),
]);

export const imageDescriptionsSetInput = z
  .object({
    updates: z
      .array(imageDescriptionUpdate)
      .min(1)
      .describe(
        "Descriptions or decorative decisions for image assets reported by the accessibility audit."
      ),
  })
  .superRefine(({ updates }, context) => {
    const assetIds = new Set<string>();
    updates.forEach(({ assetId }, index) => {
      if (assetIds.has(assetId)) {
        addZodValidationIssue(context, {
          code: "duplicate_asset_update",
          path: ["updates", String(index), "assetId"],
          message: "Each image asset may be updated only once.",
          constraint: "unique_by:assetId",
        });
      }
      assetIds.add(assetId);
    });
  });

const addableAsset = z.union([
  fontAsset.omit({ projectId: true }),
  imageAsset.omit({ projectId: true }),
  fileAsset.omit({ projectId: true }),
]);

export const assetAddInput = z.object({ asset: addableAsset });

export const assetDuplicateInput = z.object({
  assetId: z.string().min(1),
  folderId: z.string().min(1).nullable().optional(),
});

export const assetGetInput = z.object({ assetId: z.string().min(1) });

export const parseAssetType = (value: string | null) => {
  const result = assetType.safeParse(value);
  return result.success ? result.data : undefined;
};

export type AssetInfoFallback =
  | { width: number; height: number; format: string }
  | undefined;

export const getAssetInfoFallback = ({
  format,
  searchParams,
}: {
  format: string | undefined;
  searchParams: URLSearchParams;
}): AssetInfoFallback => {
  const width = Number.parseInt(searchParams.get("width") ?? "", 10);
  const height = Number.parseInt(searchParams.get("height") ?? "", 10);
  if (
    Number.isFinite(width) === false ||
    Number.isFinite(height) === false ||
    format === undefined
  ) {
    return;
  }
  return { width, height, format };
};

export const getBrowserAssetFormat = ({
  contentType,
  name,
}: {
  contentType: string | null;
  name: string;
}) => {
  const fileExtension = getFileExtension(name)?.toLowerCase();
  const correctMimeType =
    ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES] ??
    contentType?.split(";")[0];

  const contentTypeArr = correctMimeType?.split("/") ?? [];
  const mimeCategory = contentTypeArr[0];
  if (mimeCategory && correctMimeType && !isAllowedMimeCategory(mimeCategory)) {
    throw new Error(`MIME type "${mimeCategory}/*" is not allowed`);
  }

  return contentTypeArr[0] === "video" ? contentTypeArr[1] : undefined;
};

export const replaceAssetInStyleValueMutable = (
  value: StyleValue,
  replacement: AssetStyleValueReplacement
) => {
  let didReplace = false;
  const { fromFontFamily, toFontFamily } = replacement;
  traverseStyleValue(value, (item) => {
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
  projectSettings,
  props,
  styles,
  replacement,
}: {
  pages?: Pages;
  projectSettings?: ProjectSettings;
  props: Iterable<Prop>;
  styles: Iterable<StyleDecl>;
  replacement: AssetStyleValueReplacement;
}) => {
  if (projectSettings?.meta.faviconAssetId === replacement.fromAssetId) {
    projectSettings.meta.faviconAssetId = replacement.toAssetId;
  }
  if (pages !== undefined) {
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
  projectSettings,
  props,
  styles,
  assets,
}: {
  pages: Pages | undefined;
  projectSettings?: ProjectSettings;
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

  const faviconAssetId = projectSettings?.meta.faviconAssetId;
  if (faviconAssetId) {
    addUsage(faviconAssetId, { type: "favicon" });
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
    traverseStyleValue(styleDecl.value, (value) => {
      if (value.type === "image" && value.value.type === "asset") {
        addUsage(value.value.value, {
          type: "style",
          styleDeclKey,
        });
      }
    });
    for (const fontFamily of collectFontFamiliesFromStyleValue(
      styleDecl.value
    )) {
      const assetId = fontFamilyToAssetId.get(fontFamily);
      if (assetId !== undefined) {
        addUsage(assetId, {
          type: "style",
          styleDeclKey,
        });
      }
    }
  }
  return usagesByAsset;
};

type AssetReferenceBuild = Pick<
  CompactBuild,
  "pages" | "projectSettings" | "props" | "styles" | "resources" | "dataSources"
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

export const getAsset = (
  state: Pick<BuilderState, "assets">,
  input: z.infer<typeof assetGetInput>
) => {
  const asset = getRequiredAssets(state).get(input.assetId);
  if (asset === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Asset not found");
  }
  return { asset };
};

const getRequiredAssetReferenceBuild = (
  state: Pick<
    BuilderState,
    | "pages"
    | "projectSettings"
    | "props"
    | "styles"
    | "resources"
    | "dataSources"
  >
): AssetReferenceBuild => {
  if (
    state.pages === undefined ||
    state.projectSettings === undefined ||
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
    projectSettings: state.projectSettings,
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
  build: Pick<CompactBuild, "pages" | "projectSettings" | "props" | "styles">;
  fromAsset: Asset;
  toAsset: Asset;
}) => {
  const pages = structuredClone(build.pages);
  const projectSettings = structuredClone(build.projectSettings);
  const props = new Map(
    build.props.map((item) => [item.id, structuredClone(item)])
  );
  const styles = new Map(
    build.styles.map((item) => [getStyleDeclKey(item), structuredClone(item)])
  );

  replaceAssetMutable({
    pages,
    projectSettings,
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
  const projectSettingsPatches: BuilderPatchChange["patches"] = [];
  const previousFaviconAssetId = build.projectSettings.meta.faviconAssetId;
  if (previousFaviconAssetId !== projectSettings.meta.faviconAssetId) {
    projectSettingsPatches.push({
      op: "replace" as const,
      path: ["meta", "faviconAssetId"],
      value: projectSettings.meta.faviconAssetId,
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
  if (projectSettingsPatches.length > 0) {
    payload.push({
      namespace: "projectSettings" as const,
      patches: projectSettingsPatches,
    });
  }
  if (pagePatches.length > 0) {
    payload.push({ namespace: "pages" as const, patches: pagePatches });
  }
  if (propPatches.length > 0) {
    payload.push({ namespace: "props" as const, patches: propPatches });
  }
  if (stylePatches.length > 0) {
    payload.push({ namespace: "styles" as const, patches: stylePatches });
  }
  const assetPatches: BuilderPatchChange["patches"] = [];
  if (fromAsset.description !== toAsset.description) {
    if (fromAsset.description === undefined) {
      assetPatches.push({
        op: "remove",
        path: [toAsset.id, "description"],
      });
    } else {
      assetPatches.push({
        op: toAsset.description === undefined ? "add" : "replace",
        path: [toAsset.id, "description"],
        value: fromAsset.description,
      });
    }
  }
  assetPatches.push({
    op: "remove" as const,
    path: [fromAsset.id],
  });
  payload.push({
    namespace: "assets" as const,
    patches: assetPatches,
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

export { formatAssetName, getAssetDisplayNameParts, parseAssetName };

export const getAssetDisplayFilename = (asset: Asset) =>
  getAssetDisplayNameParts(asset).basename;

const assertAssetFolderExists = (
  assetFolders: BuilderState["assetFolders"],
  folderId: string | undefined
) => {
  if (folderId !== undefined && assetFolders?.has(folderId) !== true) {
    return throwBuilderRuntimeError("NOT_FOUND", "Asset folder not found");
  }
};

export const addAsset = (
  state: Pick<BuilderState, "assets" | "assetFolders">,
  input: z.infer<typeof assetAddInput>,
  context: { projectId?: string }
) => {
  const assets = getRequiredAssets(state);
  if (context.projectId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "A configured project is required to add an asset"
    );
  }
  if (assets.has(input.asset.id)) {
    return throwBuilderRuntimeError("CONFLICT", "Asset already exists");
  }
  assertAssetFolderExists(state.assetFolders, input.asset.folderId);
  const asset: Asset = { ...input.asset, projectId: context.projectId };
  return createRuntimeMutation({
    payload: [
      {
        namespace: "assets",
        patches: [{ op: "add", path: [asset.id], value: asset }],
      },
    ],
    result: { assetId: asset.id },
    invalidatesNamespaces: ["assets"],
  });
};

export const duplicateAsset = (
  state: Pick<BuilderState, "assets" | "assetFolders">,
  input: z.infer<typeof assetDuplicateInput>,
  context: BuilderRuntimeContext
) => {
  const assets = getRequiredAssets(state);
  const asset = assets.get(input.assetId);
  if (asset === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Asset not found");
  }
  const folderId =
    input.folderId === undefined
      ? asset.folderId
      : (input.folderId ?? undefined);
  assertAssetFolderExists(state.assetFolders, folderId);

  const displayFilenames = new Set(
    Array.from(assets.values(), getAssetDisplayFilename)
  );
  const duplicatedAsset: Asset = {
    ...asset,
    id: context.createId(),
    filename: createCopyName(getAssetDisplayFilename(asset), (candidate) =>
      displayFilenames.has(candidate)
    ),
    folderId,
  };
  return createRuntimeMutation({
    payload: [
      {
        namespace: "assets",
        patches: [
          { op: "add", path: [duplicatedAsset.id], value: duplicatedAsset },
        ],
      },
    ],
    result: { assetId: duplicatedAsset.id },
    invalidatesNamespaces: ["assets"],
  });
};

export const updateAsset = (
  state: Pick<BuilderState, "assets" | "assetFolders">,
  input: z.infer<typeof assetUpdateInput>
) => {
  const assets = getRequiredAssets(state);
  const asset = findAsset(assets.values(), input.assetId);
  if (asset === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Asset not found");
  }

  const patches: BuilderPatchChange["patches"] = [];
  if (input.values.filename !== undefined) {
    if (isValidFilename(input.values.filename) === false) {
      return throwBuilderRuntimeError("BAD_REQUEST", "Invalid filename");
    }
    for (const currentAsset of assets.values()) {
      if (
        currentAsset.id !== asset.id &&
        getAssetDisplayFilename(currentAsset) === input.values.filename
      ) {
        return throwBuilderRuntimeError("CONFLICT", "Filename already used");
      }
    }
    if (asset.filename !== input.values.filename) {
      appendOptionalPropertyPatch(patches, {
        path: [asset.id, "filename"],
        previous: asset.filename,
        next: input.values.filename,
      });
    }
  }
  if (
    input.values.description !== undefined &&
    asset.description !== input.values.description
  ) {
    appendOptionalPropertyPatch(patches, {
      path: [asset.id, "description"],
      previous: asset.description,
      next: input.values.description,
    });
  }
  if (input.values.folderId !== undefined) {
    const folderId = input.values.folderId ?? undefined;
    assertAssetFolderExists(state.assetFolders, folderId);
    appendOptionalPropertyPatch(patches, {
      path: [asset.id, "folderId"],
      previous: asset.folderId,
      next: folderId,
    });
  }

  return createRuntimeMutation({
    payload: patches.length === 0 ? [] : [{ namespace: "assets", patches }],
    result: { assetId: asset.id },
    invalidatesNamespaces: patches.length === 0 ? [] : ["assets"],
  });
};

export const setImageDescriptions = (
  state: Pick<BuilderState, "assets">,
  input: z.infer<typeof imageDescriptionsSetInput>
) => {
  const assets = getRequiredAssets(state);
  const patches: BuilderPatchChange["patches"] = [];
  const updated = [];

  for (const update of input.updates) {
    const asset = findAsset(assets.values(), update.assetId);
    if (asset === undefined) {
      return throwBuilderRuntimeError(
        "NOT_FOUND",
        `Image asset "${update.assetId}" not found`
      );
    }
    if (asset.type !== "image") {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Asset "${asset.id}" is not an image`
      );
    }
    const description = update.decorative === true ? "" : update.description;
    if (asset.description !== description) {
      appendOptionalPropertyPatch(patches, {
        path: [asset.id, "description"],
        previous: asset.description,
        next: description,
      });
      updated.push({
        assetId: asset.id,
        decorative: update.decorative === true,
      });
    }
  }

  return createRuntimeMutation({
    payload: patches.length === 0 ? [] : [{ namespace: "assets", patches }],
    result: { updated },
    invalidatesNamespaces: patches.length === 0 ? [] : ["assets"],
  });
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
    projectSettings: build.projectSettings,
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
  filename: asset.filename,
  folderId: asset.folderId,
  type: asset.type,
  size: asset.size,
  contentType: asset.format,
});

export const serializeAssetList = ({
  assets,
  build,
  input,
}: {
  assets: Asset[];
  build?: AssetReferenceBuild;
  input: PaginatedOutputInput & {
    type?: Asset["type"];
    withUsage?: boolean;
    sort?: "name" | "size" | "createdAt" | "usage";
  };
}) => {
  const shouldCountUsage = input.withUsage === true || input.sort === "usage";
  const usageCounts =
    shouldCountUsage && build !== undefined
      ? getAssetUsageCounts(build, assets)
      : undefined;
  const sorted = assets.filter(
    (asset) => input.type === undefined || asset.type === input.type
  );
  sorted.sort((left, right) => {
    switch (input.sort) {
      case "size":
        return right.size - left.size;
      case "createdAt":
        return right.createdAt.localeCompare(left.createdAt);
      case "usage":
        return (
          (usageCounts?.get(right.id) ?? 0) - (usageCounts?.get(left.id) ?? 0)
        );
      case "name":
      default:
        return left.name.localeCompare(right.name);
    }
  });
  const projected = sorted.map((asset) =>
    projectOutput({
      input,
      compact: {
        ...serializeAssetSummary(asset),
        usageCount: shouldCountUsage
          ? (usageCounts?.get(asset.id) ?? 0)
          : undefined,
      },
      expanded: () => ({ record: asset }),
    })
  );
  return paginateOutput({
    items: projected,
    cursor: input.cursor,
    limit: input.limit,
    filters: {
      type: input.type,
      withUsage: input.withUsage,
      sort: input.sort,
    },
    verbose: input.verbose,
    invalidCursorMessage: "Invalid asset cursor",
  });
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
    projectSettings: build.projectSettings,
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
    | "assets"
    | "pages"
    | "projectSettings"
    | "props"
    | "styles"
    | "resources"
    | "dataSources"
  >,
  input: PaginatedOutputInput & {
    type?: Asset["type"];
    withUsage?: boolean;
    sort?: "name" | "size" | "createdAt" | "usage";
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
  input: { assetId: string } & PaginatedOutputInput
) => {
  const assets = Array.from(getRequiredAssets(state).values());
  const asset = findAsset(assets, input.assetId);
  if (asset === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Asset not found");
  }
  const { items, ...pagination } = paginateOutput({
    items: createAssetUsageList({
      asset,
      assets,
      build: getRequiredAssetReferenceBuild(state),
    }),
    cursor: input.cursor,
    limit: input.limit,
    filters: { assetId: input.assetId },
    verbose: input.verbose,
  });
  return { usages: items, ...pagination };
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
    invalidatesNamespaces: [
      "pages",
      "projectSettings",
      "props",
      "styles",
      "assets",
    ],
  });
};

export const deleteAssets = (
  state: Pick<
    BuilderState,
    | "assets"
    | "pages"
    | "projectSettings"
    | "props"
    | "styles"
    | "resources"
    | "dataSources"
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
