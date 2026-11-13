import { parse, postprocess, preprocess } from "micromark";
import { decodeString } from "micromark-util-decode-string";
import {
  createAssetReferenceResolver,
  createNamedAssetReferenceContext,
} from "./asset-reference-utils";
import {
  discoverAssetValueReferences,
  rewriteAssetValueReferences,
} from "./asset-value-references";
import { createUniqueAssetIdsByPath } from "./asset-path-resolution";
import { parseMarkdownDocumentSource } from "./document-graph/markdown-document";
import { replaceMarkdownFrontmatter } from "./frontmatter";
import type { MarkdownAssetReference } from "./markdown-references";
import { rewriteMarkdownAssetReferenceRanges } from "./markdown-references";

export class MarkdownAssetReferenceError extends Error {
  constructor(cause: unknown) {
    super("Unable to parse Markdown Asset references", { cause });
    this.name = "MarkdownAssetReferenceError";
  }
}

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

export const discoverNamedMarkdownDocumentAssetReferences = async ({
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
}) => {
  const assetList = Array.from(assets);
  const context = createNamedAssetReferenceContext({
    source,
    assets: assetList,
  });
  const document = await parseMarkdownDocumentSource({ source: markdown });
  return [
    ...discoverAssetValueReferences({
      properties: document.frontmatter,
      ...context,
      structuredAssetIds: new Set(assetList.map(({ id }) => id)),
    }),
    ...discoverMarkdownAssetReferenceRanges({
      markdown: document.body,
      ...context,
    }),
  ];
};

export const rewriteMarkdownAssetReferences = async ({
  source,
  sourcePath,
  assetPaths,
  replacementPaths,
}: {
  source: string;
  sourcePath: string;
  assetPaths: ReadonlyMap<string, string>;
  replacementPaths: ReadonlyMap<string, string>;
}) => {
  let document;
  try {
    document = await parseMarkdownDocumentSource({ source });
  } catch (cause) {
    throw new MarkdownAssetReferenceError(cause);
  }
  const assetIdsByPath = createUniqueAssetIdsByPath(
    Array.from(assetPaths, ([id, path]) => ({ id, path }))
  );
  const assetUrls = Object.fromEntries(replacementPaths);
  const frontmatterReferences = discoverAssetValueReferences({
    properties: document.frontmatter,
    sourcePath,
    assetIdsByPath,
    structuredAssetIds: new Set(assetIdsByPath.values()),
  });
  const bodyReferences = discoverMarkdownAssetReferenceRanges({
    markdown: document.body,
    sourcePath,
    assetIdsByPath,
  });
  const body = rewriteMarkdownAssetReferenceRanges({
    markdown: document.body,
    references: bodyReferences,
    assetUrls,
  });
  let rewritten = source;
  if (body !== document.body) {
    rewritten = `${source.slice(0, source.length - document.body.length)}${body}`;
  }
  if (frontmatterReferences.length > 0) {
    const frontmatter = rewriteAssetValueReferences({
      value: { properties: document.frontmatter },
      references: frontmatterReferences,
      assetUrls,
    }).properties;
    rewritten = await replaceMarkdownFrontmatter({
      source: rewritten,
      properties: frontmatter,
    });
  }
  return rewritten;
};
