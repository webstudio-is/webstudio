import type { JsonValue } from "../canonical-json";
import { assetQueryResult, type AssetQueryResult } from "../schema";
import { assertAssetQueryResultSize } from "../structured-query";
import { resolveAdaptedDocumentGraph } from "./document-resolution";
import type { AdaptedDocument } from "./document-adapter";
import type { DocumentSourceLoader } from "./document-source";
import type { DocumentGraph } from "./graph";

const isJsonObject = (
  value: JsonValue
): value is { readonly [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const isReferenceMarker = (value: JsonValue) =>
  isJsonObject(value) &&
  Object.keys(value).length === 1 &&
  typeof value.$ref === "string";

const projectResolvedValue = ({
  selected,
  resolved,
}: {
  selected: JsonValue;
  resolved: JsonValue;
}): JsonValue => {
  if (isReferenceMarker(selected)) {
    return resolved;
  }
  if (Array.isArray(selected)) {
    if (Array.isArray(resolved) === false) {
      return selected;
    }
    return selected.map((value, index) =>
      index < resolved.length
        ? projectResolvedValue({ selected: value, resolved: resolved[index] })
        : value
    );
  }
  if (isJsonObject(selected)) {
    if (isJsonObject(resolved) === false) {
      return selected;
    }
    return Object.fromEntries(
      Object.entries(selected).map(([key, value]) => [
        key,
        Object.hasOwn(resolved, key)
          ? projectResolvedValue({ selected: value, resolved: resolved[key] })
          : value,
      ])
    );
  }
  return resolved;
};

const getResolvedProperties = (document: AdaptedDocument) => {
  const value =
    document.format === "markdown"
      ? document.value.frontmatter
      : document.value;
  return isJsonObject(value) ? value : undefined;
};

/** Resolves selected graph roots and overlays only fields present in query output. */
export const resolveAssetQueryDocumentGraph = async ({
  graph,
  rootIds,
  result,
  load,
  concurrency,
  signal,
}: {
  graph: DocumentGraph;
  rootIds: readonly string[];
  result: AssetQueryResult;
  load: DocumentSourceLoader;
  concurrency: number;
  signal?: AbortSignal;
}): Promise<AssetQueryResult> => {
  const selectedRootIds = new Set(rootIds);
  const resolvableRootIds = result.items.flatMap((item) =>
    selectedRootIds.has(item.id) && item.properties !== undefined
      ? [item.id]
      : []
  );
  if (resolvableRootIds.length === 0) {
    return result;
  }
  const resolved = await resolveAdaptedDocumentGraph({
    graph,
    rootIds: resolvableRootIds,
    concurrency,
    signal,
    load,
  });
  const rootsById = new Map(
    resolvableRootIds.map((rootId, index) => [rootId, resolved.roots[index]])
  );
  const assembled = assetQueryResult.parse({
    ...result,
    items: result.items.map((item) => {
      const root = rootsById.get(item.id);
      if (root === undefined || item.properties === undefined) {
        return item;
      }
      const properties = getResolvedProperties(root);
      if (properties === undefined) {
        return item;
      }
      return {
        ...item,
        properties: projectResolvedValue({
          selected: item.properties,
          resolved: properties,
        }),
      };
    }),
  });
  assertAssetQueryResultSize(assembled);
  return assembled;
};
