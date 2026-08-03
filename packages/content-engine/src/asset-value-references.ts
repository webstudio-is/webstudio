import { createAssetIdResolver } from "./markdown-assets";

export type AssetValueReference = {
  path: Array<string | number>;
  assetId: string;
  suffix?: string;
};

export type AssetValueReferences = Record<string, AssetValueReference[]>;

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
}: {
  properties: Readonly<Record<string, unknown>>;
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
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
  replacement: string;
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

export const resolveAssetValueReferences = <Value>({
  value,
  references,
  assetUrls,
}: {
  value: Value;
  references: readonly AssetValueReference[] | undefined;
  assetUrls: Readonly<Record<string, string>>;
}): Value => {
  let resolved: unknown = value;
  for (const reference of references ?? []) {
    const assetUrl = assetUrls[reference.assetId];
    if (assetUrl === undefined) {
      continue;
    }
    resolved = replaceValueAtPath({
      value: resolved,
      path: reference.path,
      replacement: mergeAssetUrlSuffix(assetUrl, reference.suffix),
    });
  }
  return resolved as Value;
};
