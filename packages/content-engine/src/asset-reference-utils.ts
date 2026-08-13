import { createAssetIdResolver } from "./asset-path-resolution";

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
  return (value: string) => {
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
