import { parse, postprocess, preprocess } from "micromark";
import { decodeString } from "micromark-util-decode-string";
import { createCanonicalAssetPath } from "./asset-path";
import {
  createAssetIdResolver,
  createUniqueAssetIdsByPath,
} from "./asset-path-resolution";
import type { MarkdownAssetReference } from "./markdown-references";

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
