import { getJsonReferenceMarkerValue } from "./document-graph/document-utils";
import type { JsonValue } from "./canonical-json";
import { createAssetIdResolver } from "./asset-path-resolution";

export type AssetValueReference = {
  path: Array<string | number>;
  assetId: string;
  suffix?: string;
  structured?: true;
};

export type AssetValueReferences = Record<string, AssetValueReference[]>;

export type AssetReferenceRuntimeData = {
  url: string;
  name?: string;
  description?: string;
  mimeType?: string;
  width?: number;
  height?: number;
};

export const getRuntimeAssetUrls = (
  runtimeAssets?: Readonly<Record<string, { url: string }>>
): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(runtimeAssets ?? {}).map(([id, asset]) => [id, asset.url])
  );

const getUrlSuffix = (value: string) => {
  let parsed: URL;
  try {
    parsed = new URL(value, "https://content.webstudio.invalid/");
  } catch {
    return;
  }
  const suffix = `${parsed.search}${parsed.hash}`;
  return suffix === "" ? undefined : suffix;
};

export const discoverAssetValueReferences = ({
  properties,
  sourcePath,
  assetIdsByPath,
  structuredAssetIds,
}: {
  properties: Readonly<Record<string, unknown>>;
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
  structuredAssetIds?: ReadonlySet<string>;
}): AssetValueReference[] => {
  const resolveAssetId = createAssetIdResolver(assetIdsByPath, sourcePath);
  const references: AssetValueReference[] = [];
  const visit = (value: unknown, path: Array<string | number>) => {
    if (typeof value === "string") {
      const assetId = resolveAssetId(value);
      if (assetId !== undefined) {
        const suffix = getUrlSuffix(value);
        references.push({
          path,
          assetId,
          ...(suffix === undefined ? {} : { suffix }),
        });
      }
      return;
    }
    const marker = getJsonReferenceMarkerValue(value as JsonValue);
    if (typeof marker === "string") {
      const assetId = resolveAssetId(marker);
      if (assetId !== undefined && structuredAssetIds?.has(assetId)) {
        const suffix = getUrlSuffix(marker);
        references.push({
          path,
          assetId,
          ...(suffix === undefined ? {} : { suffix }),
          structured: true,
        });
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) {
        visit(item, [...path, index]);
      }
      return;
    }
    if (typeof value !== "object" || value === null) {
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      visit(item, [...path, key]);
    }
  };
  visit(properties, ["properties"]);
  return references;
};

export const mergeAssetUrlSuffix = (url: string, suffix?: string) => {
  if (suffix === undefined) {
    return url;
  }
  const base = "https://content.webstudio.invalid";
  const canonical = new URL(url, `${base}/`);
  const authored = new URL(suffix, `${base}/`);
  for (const [key, value] of authored.searchParams) {
    canonical.searchParams.append(key, value);
  }
  if (authored.hash !== "") {
    canonical.hash = authored.hash;
  }
  if (url.startsWith("//")) {
    return `//${canonical.host}${canonical.pathname}${canonical.search}${canonical.hash}`;
  }
  if (url.startsWith("/")) {
    return `${canonical.pathname}${canonical.search}${canonical.hash}`;
  }
  return canonical.href;
};

const replaceValueAtPath = ({
  value,
  path,
  replacement,
}: {
  value: unknown;
  path: readonly (string | number)[];
  replacement: unknown;
}): unknown => {
  const [segment, ...rest] = path;
  if (segment === undefined) {
    return replacement;
  }
  if (
    typeof value !== "object" ||
    value === null ||
    Object.hasOwn(value, segment) === false
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    if (typeof segment !== "number") {
      return value;
    }
    const next = [...value];
    next[segment] = replaceValueAtPath({
      value: value[segment],
      path: rest,
      replacement,
    });
    return next;
  }
  if (typeof segment !== "string") {
    return value;
  }
  return {
    ...value,
    [segment]: replaceValueAtPath({
      value: (value as Readonly<Record<string, unknown>>)[segment],
      path: rest,
      replacement,
    }),
  };
};

const toStructuredAssetValue = ({
  reference,
  runtimeAsset,
}: {
  reference: AssetValueReference;
  runtimeAsset: AssetReferenceRuntimeData;
}) => ({
  id: reference.assetId,
  src: mergeAssetUrlSuffix(runtimeAsset.url, reference.suffix),
  ...(runtimeAsset.name === undefined ? {} : { name: runtimeAsset.name }),
  ...(runtimeAsset.description === undefined
    ? {}
    : { description: runtimeAsset.description }),
  ...(runtimeAsset.mimeType === undefined
    ? {}
    : { mimeType: runtimeAsset.mimeType }),
  ...(runtimeAsset.width === undefined ? {} : { width: runtimeAsset.width }),
  ...(runtimeAsset.height === undefined ? {} : { height: runtimeAsset.height }),
});

export const resolveAssetValueReferences = <Value>({
  value,
  references,
  runtimeAssets = {},
  assetUrls,
}: {
  value: Value;
  references: readonly AssetValueReference[] | undefined;
  runtimeAssets?: Readonly<Record<string, AssetReferenceRuntimeData>>;
  /** @deprecated Pass runtimeAssets so structured references can include metadata. */
  assetUrls?: Readonly<Record<string, string>>;
}): Value => {
  const assets =
    assetUrls === undefined
      ? runtimeAssets
      : {
          ...Object.fromEntries(
            Object.entries(assetUrls).map(([id, url]) => [id, { url }])
          ),
          ...runtimeAssets,
        };
  let resolved: unknown = value;
  for (const reference of references ?? []) {
    const runtimeAsset = assets[reference.assetId];
    if (runtimeAsset === undefined) {
      continue;
    }
    resolved = replaceValueAtPath({
      value: resolved,
      path: reference.path,
      replacement:
        reference.structured === true
          ? toStructuredAssetValue({ reference, runtimeAsset })
          : mergeAssetUrlSuffix(runtimeAsset.url, reference.suffix),
    });
  }
  return resolved as Value;
};
