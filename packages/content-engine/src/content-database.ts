import type {
  ContentArtifactV1,
  AssetQueryRequestInput,
  AssetQueryResult,
  BuilderAssetFieldCatalog,
  ContentDatabaseStats,
  ContentDatabaseDocument,
} from "./schema";
import { assetQuery, contentDatabaseDocument } from "./schema";
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
  getAdaptedDocumentProperties,
  getDocumentGraphQueryRootIds,
  resolveAdaptedDocumentGraph,
  type DocumentSourceLoader,
  emitDocumentGraphRuntimeEvent,
  type DocumentGraphRuntimeObserver,
} from "./document-graph";
import { contentEngineLimits } from "./limits";

type ContentDatabaseQueryArguments = [
  request: AssetQueryRequestInput,
  readContent?: AssetResourceContentReader,
  runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>,
];

export type ContentDatabase = {
  query(...args: ContentDatabaseQueryArguments): Promise<AssetQueryResult>;
  queryWithDocumentGraph(input: {
    request: AssetQueryRequestInput;
    load: DocumentSourceLoader;
    readContent?: AssetResourceContentReader;
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
    signal?: AbortSignal;
    onEvent?: DocumentGraphRuntimeObserver;
  }): Promise<AssetQueryResult>;
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
    options?: {
      documents?: readonly ContentDatabaseDocument[];
      skipMaterialized?: boolean;
    }
  ) => {
    if (
      request.indexRevision !== undefined &&
      request.indexRevision !== artifact.integrity.checksum
    ) {
      throw new AssetIndexRevisionError();
    }
    const materialized =
      options?.skipMaterialized === true
        ? undefined
        : await getMaterializedAssetQueryResult({
            queries: artifact.queries,
            query: request.query,
          });
    if (materialized !== undefined) {
      return materialized;
    }
    const readEmbeddedContent: AssetResourceContentReader = async (
      contentRef,
      range
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
      documents: options?.documents ?? artifact.documents,
      read: readEmbeddedContent,
      runtimeAssets,
      assetReferences: artifact.assetReferences,
    });
    return result;
  };
  const query = async (...args: ContentDatabaseQueryArguments) =>
    await executeQuery(...args);
  return {
    query,
    queryWithDocumentGraph: async ({
      request,
      load,
      readContent: queryContentReader,
      runtimeAssets,
      signal,
      onEvent,
    }) => {
      if (documentGraph === undefined) {
        return await executeQuery(request, queryContentReader, runtimeAssets);
      }
      const query = assetQuery.parse(request.query);
      const documentIds = new Set(artifact.documents.map(({ _id }) => _id));
      const rootIds = getDocumentGraphQueryRootIds({
        graph: documentGraph,
        query,
      }).filter((rootId) => documentIds.has(rootId));
      if (rootIds.length === 0) {
        return await executeQuery(request, queryContentReader, runtimeAssets);
      }
      emitDocumentGraphRuntimeEvent(onEvent, {
        type: "roots-selected",
        rootCount: rootIds.length,
      });
      const resolved = await resolveAdaptedDocumentGraph({
        graph: documentGraph,
        rootIds,
        load,
        concurrency: contentEngineLimits.concurrentContentReads,
        signal,
        onEvent,
      });
      const propertiesById = new Map(
        rootIds.flatMap((rootId, index) => {
          const properties = getAdaptedDocumentProperties(
            resolved.roots[index]
          );
          return properties === undefined
            ? []
            : [[rootId, properties] as const];
        })
      );
      const documents = artifact.documents.map((document) => {
        const properties = propertiesById.get(document._id);
        return properties === undefined
          ? document
          : contentDatabaseDocument.parse({ ...document, properties });
      });
      return await executeQuery(request, queryContentReader, runtimeAssets, {
        documents,
        skipMaterialized: true,
      });
    },
    getFieldCatalog: () => artifact.fieldCatalog,
    getStats: () => stats,
  };
};
