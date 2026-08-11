import { encodeAssetPathSegment } from "./asset-path";

export const createUniqueAssetIdsByPath = (
  assets: Iterable<{ id: string; path: string }>
) => {
  const ambiguousPaths = new Set<string>();
  const assetIdsByPath = new Map<string, string>();
  for (const { id, path } of assets) {
    if (assetIdsByPath.has(path)) {
      ambiguousPaths.add(path);
      assetIdsByPath.delete(path);
      continue;
    }
    if (ambiguousPaths.has(path) === false) {
      assetIdsByPath.set(path, id);
    }
  }
  return assetIdsByPath;
};

const getRelativeAssetPath = ({
  sourcePath,
  url,
  allowRootRelative = false,
}: {
  sourcePath: string;
  url: string;
  allowRootRelative?: boolean;
}) => {
  if (
    url.length === 0 ||
    url.startsWith("#") ||
    url.startsWith("?") ||
    (allowRootRelative === false && url.startsWith("/"))
  ) {
    return;
  }
  const origin = "https://content.webstudio.invalid";
  let tokenPrefix = "__webstudio_asset_source_";
  while (sourcePath.includes(tokenPrefix) || url.includes(tokenPrefix)) {
    tokenPrefix = `_${tokenPrefix}`;
  }
  const sourceSegments = sourcePath.split("/");
  const sourceSegmentByToken = new Map(
    sourceSegments.map((segment, index) => [
      `${tokenPrefix}${index}__`,
      segment,
    ])
  );
  const sourceUrl = Array.from(sourceSegmentByToken.keys()).join("/");
  let parsed: URL;
  try {
    parsed = new URL(url, new URL(sourceUrl, `${origin}/`));
  } catch {
    return;
  }
  if (parsed.origin !== origin) {
    return;
  }
  const segments: string[] = [];
  for (const encodedSegment of parsed.pathname.slice(1).split("/")) {
    let segment: string;
    try {
      segment = decodeURIComponent(encodedSegment);
    } catch {
      return;
    }
    if (segment === "") {
      continue;
    }
    const sourceSegment = sourceSegmentByToken.get(segment);
    if (sourceSegment !== undefined) {
      segments.push(sourceSegment);
      continue;
    }
    if (segment.includes("/")) {
      return;
    }
    segments.push(encodeAssetPathSegment(segment));
  }
  return segments.join("/");
};

const getPublishedAssetName = (url: string) => {
  const path = getRelativeAssetPath({
    sourcePath: "document",
    url,
    allowRootRelative: true,
  });
  const segments = path?.split("/");
  if (segments?.length !== 2 || segments[0] !== "assets") {
    return;
  }
  return segments[1];
};

export const createAssetIdResolver = (
  assetIdsByPath: ReadonlyMap<string, string>,
  sourcePath: string
) => {
  const assetIds = new Set(assetIdsByPath.values());
  const assetIdsByName = createUniqueAssetIdsByPath(
    Array.from(assetIdsByPath, ([path, id]) => ({
      id,
      path: path.slice(path.lastIndexOf("/") + 1),
    }))
  );
  return (url: string) => {
    const path = getRelativeAssetPath({ sourcePath, url });
    return (
      (path === undefined ? undefined : assetIdsByPath.get(path)) ??
      assetIdsByName.get(getPublishedAssetName(url) ?? "") ??
      (assetIds.has(url) ? url : undefined)
    );
  };
};
