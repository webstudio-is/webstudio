import { createCanonicalAssetPath } from "@webstudio-is/content-engine/mdx";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  type Asset,
  type AssetFolders,
} from "@webstudio-is/sdk";

export const getMdxPropValuePathKey = ({
  nodePath,
  propIndex,
}: {
  nodePath: readonly number[];
  propIndex: number;
}) =>
  ["children", ...nodePath.flatMap((segment) => [segment, "children"])]
    .slice(0, -1)
    .concat("props", propIndex, "value")
    .map(String)
    .join("/");

const getRelativeAssetPath = ({
  sourcePath,
  targetPath,
}: {
  sourcePath: string;
  targetPath: string;
}) => {
  const source = sourcePath.split("/").slice(0, -1);
  const target = targetPath.split("/");
  let commonLength = 0;
  while (
    source[commonLength] !== undefined &&
    source[commonLength] === target[commonLength]
  ) {
    commonLength += 1;
  }
  const segments = [
    ...source.slice(commonLength).map(() => ".."),
    ...target.slice(commonLength),
  ];
  const relative = segments.join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
};

export const createMdxAssetReferenceValues = ({
  source,
  assets,
  assetFolders,
}: {
  source: Asset;
  assets: Iterable<Asset>;
  assetFolders: AssetFolders;
}) => {
  const hierarchy = createAssetFolderHierarchy(assetFolders);
  const getPath = (asset: Asset) =>
    createCanonicalAssetPath({
      name: formatAssetName(asset),
      folderNames: hierarchy.getPath(asset.folderId).map(({ name }) => name),
    });
  const sourcePath = getPath(source);
  const paths = Array.from(assets, (asset) => ({
    asset,
    path: getPath(asset),
  }));
  const counts = new Map<string, number>();
  for (const { path } of paths) {
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  return new Map(
    paths.map(({ asset, path }) => [
      asset.id,
      counts.get(path) === 1
        ? getRelativeAssetPath({ sourcePath, targetPath: path })
        : asset.id,
    ])
  );
};
