import type {
  ContentArtifactV1,
  AssetQueryRequestInput,
  AssetQueryResult,
  BuilderAssetFieldCatalog,
  ContentDatabaseStats,
} from "./schema";
import { serializeContentArtifact } from "./content-artifact";
import {
  AssetIndexRevisionError,
  executeAssetQuery,
  type AssetRuntimeData,
} from "./structured-query";
import { encodeUtf8, getUtf8ByteLength } from "./byte-stream";
import type { AssetResourceContentReader } from "./hydration";
import { getMaterializedAssetQueryResult } from "./materialized-query";
import {
  createDocumentGraph,
  selectAssetQueryDocumentGraphRoots,
} from "./document-graph";

type ContentDatabaseQueryArguments = [
  request: AssetQueryRequestInput,
  readContent?: AssetResourceContentReader,
  runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>,
];

export type ContentDatabaseDocumentGraphSelection = Readonly<{
  result: AssetQueryResult;
  rootIds: readonly string[];
}>;

export type ContentDatabase = {
  query(...args: ContentDatabaseQueryArguments): Promise<AssetQueryResult>;
  queryWithDocumentGraphRoots(
    ...args: ContentDatabaseQueryArguments
  ): Promise<ContentDatabaseDocumentGraphSelection>;
  getFieldCatalog(): BuilderAssetFieldCatalog;
  getStats(): ContentDatabaseStats;
};

export const createContentDatabase = ({
  artifact,
  readContent,
}: {
  artifact: ContentArtifactV1;
  readContent?: AssetResourceContentReader;
}): ContentDatabase => {
  const includedDocumentCount =
    artifact.database?.includedDocumentCount ?? artifact.documents.length;
  const sourceDocumentCount =
    artifact.database?.sourceDocumentCount ?? includedDocumentCount;
  const omittedDocumentCount = sourceDocumentCount - includedDocumentCount;
  const usedBytes = getUtf8ByteLength(serializeContentArtifact(artifact));
  const maxBytes = artifact.database?.maxBytes ?? Number.MAX_SAFE_INTEGER;
  const unboundedBytes = artifact.database?.unboundedBytes ?? usedBytes;
  const stats: ContentDatabaseStats = {
    format: artifact.format,
    version: artifact.version,
    revision: artifact.integrity.checksum,
    usedBytes,
    maxBytes,
    unboundedBytes,
    includedDocumentCount,
    omittedDocumentCount,
    omissionReason:
      omittedDocumentCount === 0
        ? undefined
        : unboundedBytes > maxBytes
          ? "size"
          : "unavailable",
    truncated: omittedDocumentCount > 0,
  };
  const documentGraph =
    artifact.documentGraph === undefined
      ? undefined
      : createDocumentGraph({
          nodes: artifact.documentGraph.nodes,
          edges: artifact.documentGraph.edges,
        });
  const executeQuery = async (
    request: AssetQueryRequestInput,
    queryContentReader?: AssetResourceContentReader,
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>,
  ) => {
    if (
      request.indexRevision !== undefined &&
      request.indexRevision !== artifact.integrity.checksum
    ) {
      throw new AssetIndexRevisionError();
    }
    const materialized = await getMaterializedAssetQueryResult({
      queries: artifact.queries,
      query: request.query,
    });
    if (materialized !== undefined) {
      return { result: materialized, materialized: true } as const;
    }
    const readEmbeddedContent: AssetResourceContentReader = async (
      contentRef,
      range,
    ) => {
      const content = artifact.contents?.[contentRef];
      if (content === undefined) {
        const externalReader = queryContentReader ?? readContent;
        if (externalReader === undefined) {
          throw new Error("Content is not embedded in this database");
        }
        return await externalReader(contentRef, range);
      }
      const bytes = encodeUtf8(content);
      const selected =
        range === undefined
          ? bytes
          : bytes.slice(range.offset, range.offset + range.length);
      return {
        data: (async function* () {
          yield selected;
        })(),
        contentLength: selected.byteLength,
      };
    };
    const result = await executeAssetQuery({
      query: request.query,
      catalog: artifact.fieldCatalog,
      documents: artifact.documents,
      read: readEmbeddedContent,
      runtimeAssets,
      assetReferences: artifact.assetReferences,
    });
    return { result, materialized: false } as const;
  };
  const query = async (...args: ContentDatabaseQueryArguments) =>
    (await executeQuery(...args)).result;
  return {
    query,
    queryWithDocumentGraphRoots: async (...args) => {
      const executed = await executeQuery(...args);
      return {
        result: executed.result,
        rootIds:
          documentGraph === undefined
            ? []
            : selectAssetQueryDocumentGraphRoots({
                graph: documentGraph,
                documents: executed.materialized
                  ? documentGraph.nodes.map((node) => ({
                      _id: node.id,
                      revision: node.revision,
                      contentRef: node.contentRef,
                    }))
                  : artifact.documents,
                result: executed.result,
              }),
      };
    },
    getFieldCatalog: () => artifact.fieldCatalog,
    getStats: () => stats,
  };
};
