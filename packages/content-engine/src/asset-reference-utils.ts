import { createCanonicalAssetPath } from "./asset-path";
import {
  createAssetIdResolver,
  createUniqueAssetIdsByPath,
} from "./asset-path-resolution";

export type ResolvedAssetReference = {
  assetId: string;
  suffix?: string;
};

export const createNamedAssetReferenceContext = ({
  source,
  assets,
}: {
  source: { name: string; folderNames: readonly string[] };
  assets: Iterable<{
    id: string;
    name: string;
    folderNames: readonly string[];
  }>;
}) => ({
  sourcePath: createCanonicalAssetPath(source),
  assetIdsByPath: createUniqueAssetIdsByPath(
    Array.from(assets, (asset) => ({
      id: asset.id,
      path: createCanonicalAssetPath(asset),
    }))
  ),
});

const getAssetReferenceSuffix = (value: string) => {
  let parsed: URL;
  try {
    parsed = new URL(value, "https://content.webstudio.invalid/");
  } catch {
    return;
  }
  const suffix = `${parsed.search}${parsed.hash}`;
  return suffix === "" ? undefined : suffix;
};

export const createAssetReferenceResolver = ({
  sourcePath,
  assetIdsByPath,
}: {
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
}) => {
  const resolveAssetId = createAssetIdResolver(assetIdsByPath, sourcePath);
  return (value: string): ResolvedAssetReference | undefined => {
    const assetId = resolveAssetId(value);
    if (assetId === undefined) {
      return;
    }
    const suffix = getAssetReferenceSuffix(value);
    return {
      assetId,
      ...(suffix === undefined ? {} : { suffix }),
    };
  };
};
