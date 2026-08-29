import {
  discoverAssetValueReferences,
  rewriteAssetValueReferences,
} from "./asset-value-references";
import { createNamedAssetReferenceContext } from "./asset-reference-utils";
import { createUniqueAssetIdsByPath } from "./asset-path-resolution";
import { parseJsonDocumentSource } from "./document-graph/json-document";

export class JsonAssetReferenceError extends Error {
  constructor(cause: unknown) {
    super("Unable to parse JSON Asset references", { cause });
    this.name = "JsonAssetReferenceError";
  }
}

const parseJson = async (source: string) => {
  try {
    return await parseJsonDocumentSource({ source });
  } catch (cause) {
    throw new JsonAssetReferenceError(cause);
  }
};

export const discoverNamedJsonAssetReferences = async ({
  source,
  asset,
  assets,
}: {
  source: string;
  asset: { name: string; folderNames: readonly string[] };
  assets: Iterable<{
    id: string;
    name: string;
    folderNames: readonly string[];
  }>;
}) => {
  const properties = await parseJson(source);
  const assetList = Array.from(assets);
  return discoverAssetValueReferences({
    properties,
    ...createNamedAssetReferenceContext({ source: asset, assets: assetList }),
    structuredAssetIds: new Set(assetList.map(({ id }) => id)),
    rootPath: [],
  });
};

export const rewriteJsonAssetReferences = async ({
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
  const properties = await parseJson(source);
  const assetIdsByPath = createUniqueAssetIdsByPath(
    Array.from(assetPaths, ([id, path]) => ({ id, path }))
  );
  const references = discoverAssetValueReferences({
    properties,
    sourcePath,
    assetIdsByPath,
    structuredAssetIds: new Set(assetIdsByPath.values()),
    rootPath: [],
  });
  if (references.length === 0) {
    return source;
  }
  const rewritten = rewriteAssetValueReferences({
    value: properties,
    references,
    assetUrls: Object.fromEntries(replacementPaths),
  });
  return `${JSON.stringify(rewritten, undefined, 2)}\n`;
};
