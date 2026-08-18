import {
  createAssetReferenceResolver,
  type ResolvedAssetReference,
} from "./asset-reference-utils";

export type AssetValueReference = ResolvedAssetReference & {
  path: Array<string | number>;
};

export type AssetValueReferences = Record<string, AssetValueReference[]>;

export const getRuntimeAssetUrls = (
  runtimeAssets?: Readonly<Record<string, { url: string }>>
): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(runtimeAssets ?? {}).map(([id, asset]) => [id, asset.url])
  );

export const discoverAssetValueReferences = ({
  properties,
  sourcePath,
  assetIdsByPath,
  rootPath = ["properties"],
}: {
  properties: Readonly<Record<string, unknown>>;
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
  rootPath?: Array<string | number>;
}): AssetValueReference[] => {
  const resolveAssetReference = createAssetReferenceResolver({
    sourcePath,
    assetIdsByPath,
  });
  const references: AssetValueReference[] = [];
  const visit = (value: unknown, path: Array<string | number>) => {
    if (typeof value === "string") {
      const reference = resolveAssetReference(value);
      if (reference !== undefined) {
        references.push({ path, ...reference });
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
  visit(properties, rootPath);
  return references;
};

export const mergeAssetUrlSuffix = (url: string, suffix?: string) => {
  if (suffix === undefined || suffix.length === 0) {
    return url;
  }
  const base = new URL("https://content.webstudio.invalid/__assets__/");
  const canonical = new URL(url, base);
  const authored = new URL(suffix, base);
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
  if (URL.canParse(url)) {
    return canonical.href;
  }
  const pathname = canonical.pathname.startsWith(base.pathname)
    ? canonical.pathname.slice(base.pathname.length)
    : canonical.pathname;
  return `${pathname}${canonical.search}${canonical.hash}`;
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
