import { parse, postprocess, preprocess } from "micromark";
import { decodeString } from "micromark-util-decode-string";
import {
  createAssetReferenceResolver,
  createNamedAssetReferenceContext,
} from "./asset-reference-utils";
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
  const resolveAssetReference = createAssetReferenceResolver({
    assetIdsByPath,
    sourcePath,
  });
  return getMarkdownUrlTokens(markdown).flatMap(({ start, end, url }) => {
    const reference = resolveAssetReference(url);
    if (reference === undefined) {
      return [];
    }
    return [{ start, end, ...reference }];
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
    ...createNamedAssetReferenceContext({ source, assets }),
  });
