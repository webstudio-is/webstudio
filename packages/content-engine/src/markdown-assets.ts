import { parse, postprocess, preprocess } from "micromark";
import { decodeString } from "micromark-util-decode-string";
import { createCanonicalAssetPath, encodeAssetPathSegment } from "./asset-path";
import type { MarkdownAssetReference } from "./markdown-references";

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

const getMarkdownUrlTokens = (markdown: string) => {
  const events = postprocess(
    parse()
      .document()
      .write(preprocess()(markdown, undefined, true))
  );
  const tokens: Array<{ start: number; end: number; url: string }> = [];
  for (const [phase, token] of events) {
    if (
      phase !== "enter" ||
      (token.type !== "resourceDestinationString" &&
        token.type !== "definitionDestinationString")
    ) {
      continue;
    }
    const source = markdown.slice(token.start.offset, token.end.offset);
    tokens.push({
      start: token.start.offset,
      end: token.end.offset,
      url: decodeString(source),
    });
  }
  return tokens;
};

const getRelativeAssetPath = ({
  sourcePath,
  url,
}: {
  sourcePath: string;
  url: string;
}) => {
  if (
    url.length === 0 ||
    url.startsWith("#") ||
    url.startsWith("?") ||
    url.startsWith("/")
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

export const createAssetIdResolver = (
  assetIdsByPath: ReadonlyMap<string, string>,
  sourcePath: string
) => {
  const assetIds = new Set(assetIdsByPath.values());
  return (url: string) => {
    const path = getRelativeAssetPath({ sourcePath, url });
    return (
      (path === undefined ? undefined : assetIdsByPath.get(path)) ??
      (assetIds.has(url) ? url : undefined)
    );
  };
};

export const discoverMarkdownAssetReferenceRanges = ({
  markdown,
  sourcePath,
  assetIdsByPath,
}: {
  markdown: string;
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
}): MarkdownAssetReference[] => {
  const resolveAssetId = createAssetIdResolver(assetIdsByPath, sourcePath);
  return getMarkdownUrlTokens(markdown).flatMap(({ start, end, url }) => {
    const assetId = resolveAssetId(url);
    if (assetId === undefined) {
      return [];
    }
    const parsed = new URL(url, "https://content.webstudio.invalid/");
    const suffix = `${parsed.search}${parsed.hash}`;
    return [{ start, end, assetId, ...(suffix === "" ? {} : { suffix }) }];
  });
};

export const discoverNamedMarkdownAssetReferenceRanges = ({
  markdown,
  source,
  assets,
}: {
  markdown: string;
  source: { name: string; folderNames: readonly string[] };
  assets: Iterable<{
    id: string;
    name: string;
    folderNames: readonly string[];
  }>;
}) =>
  discoverMarkdownAssetReferenceRanges({
    markdown,
    sourcePath: createCanonicalAssetPath(source),
    assetIdsByPath: createUniqueAssetIdsByPath(
      Array.from(assets, (asset) => ({
        id: asset.id,
        path: createCanonicalAssetPath(asset),
      }))
    ),
  });
