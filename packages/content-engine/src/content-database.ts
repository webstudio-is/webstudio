import { evaluateQueryWhere } from "@webstudio-is/query-builder/runtime";
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
  restoreContentRuntimeDocumentGraph,
  type ContentRuntimeArtifact,
} from "./content-runtime-artifact";
import {
  AssetIndexRevisionError,
  executeAssetQuery,
  matchesAssetQueryFilter,
  type AssetRuntimeData,
} from "./structured-query";
import { encodeUtf8, getUtf8ByteLength, toByteChunks } from "./byte-stream";
import type { AssetResourceContentReader } from "./hydration";
import { getMaterializedAssetQueryResult } from "./materialized-query";
import {
  createDocumentGraph,
  getAdaptedDocumentProperties,
  isDocumentGraphFieldAffected,
  getDocumentGraphQueryRootIds,
  resolveAdaptedDocumentGraph,
  selectDocumentGraphForQuery,
  type DocumentSourceLoader,
  emitDocumentGraphRuntimeEvent,
  type DocumentGraphRuntimeObserver,
  assertDocumentSourceIdentity,
} from "./document-graph";
import { contentEngineLimits } from "./limits";
import { resolveAssetValueReferences } from "./asset-value-references";

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

export type RuntimeContentDatabase = Pick<
  ContentDatabase,
  "query" | "queryWithDocumentGraph"
>;

const selectByteRange = (
  source: Parameters<typeof toByteChunks>[0],
  range?: { offset: number; length: number }
): AsyncIterable<Uint8Array> => {
  if (range === undefined) {
    return toByteChunks(source);
  }
  return {
    async *[Symbol.asyncIterator]() {
      let skipped = 0;
      let emitted = 0;
      for await (const chunk of toByteChunks(source)) {
        if (emitted === range.length) {
          return;
        }
        if (skipped + chunk.byteLength <= range.offset) {
          skipped += chunk.byteLength;
          continue;
        }
        const start = Math.max(0, range.offset - skipped);
        const length = Math.min(
          chunk.byteLength - start,
          range.length - emitted
        );
        if (length > 0) {
          yield chunk.subarray(start, start + length);
          emitted += length;
        }
        skipped += chunk.byteLength;
      }
    },
  };
};

const createDocumentContentReader = ({
  graph,
  load,
  signal,
}: {
  graph: ReturnType<typeof createDocumentGraph>;
  load: DocumentSourceLoader;
  signal?: AbortSignal;
}): AssetResourceContentReader => {
  const nodesByContentRef = new Map(
    graph.nodes.map((node) => [node.contentRef, node])
  );
  return async (contentRef, range) => {
    const node = nodesByContentRef.get(contentRef);
    if (node === undefined) {
      throw new Error(
        `Document content reference ${contentRef} is unavailable`
      );
    }
    const loaded = assertDocumentSourceIdentity({
      node,
      source: await load(node, { signal }),
    });
    return {
      data: selectByteRange(loaded.source, range),
      ...(range === undefined ? {} : { contentLength: range.length }),
    };
  };
};

const createQueryableContentDatabase = ({
  artifact,
  revision,
  catalog,
  documentGraph,
  inlineDocuments,
  readContent,
}: {
  artifact: Pick<
    ContentRuntimeArtifact,
    | "documents"
    | "contents"
    | "assetReferences"
    | "assetValueReferences"
    | "queries"
  >;
  revision: string;
  catalog?: BuilderAssetFieldCatalog;
  documentGraph?: ReturnType<typeof createDocumentGraph>;
  inlineDocuments?: ReadonlyMap<string, ContentDatabaseDocument>;
  readContent?: AssetResourceContentReader;
}): RuntimeContentDatabase => {
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
      request.indexRevision !== revision
    ) {
      throw new AssetIndexRevisionError();
    }
    const assetUrls = Object.fromEntries(
      Object.entries(runtimeAssets ?? {}).map(([id, asset]) => [id, asset.url])
    );
    const materialized =
      options?.skipMaterialized === true
        ? undefined
        : await getMaterializedAssetQueryResult({
            queries: artifact.queries,
            query: request.query,
            assetValueReferences: artifact.assetValueReferences,
            assetUrls,
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
      catalog,
      documents: options?.documents ?? artifact.documents,
      read: readEmbeddedContent,
      runtimeAssets,
      assetReferences: artifact.assetReferences,
      assetValueReferences: artifact.assetValueReferences,
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
      const contentReader =
        queryContentReader ??
        createDocumentContentReader({ graph: documentGraph, load, signal });
      const query = assetQuery.parse(request.query);
      const documentsById = new Map(
        artifact.documents.map((document) => [document._id, document])
      );
      const rootIds = getDocumentGraphQueryRootIds({
        graph: documentGraph,
        query,
      }).filter((rootId) => {
        const storedDocument = documentsById.get(rootId);
        const document =
          storedDocument === undefined
            ? undefined
            : resolveAssetValueReferences({
                value: storedDocument,
                references: artifact.assetValueReferences?.[rootId],
                assetUrls: Object.fromEntries(
                  Object.entries(runtimeAssets ?? {}).map(([id, asset]) => [
                    id,
                    asset.url,
                  ])
                ),
              });
        if (document === undefined) {
          return false;
        }
        return (
          evaluateQueryWhere(query.where, (filter) => {
            if (
              isDocumentGraphFieldAffected({
                graph: documentGraph,
                sourceId: rootId,
                field: filter.field,
              })
            ) {
              return;
            }
            return matchesAssetQueryFilter(
              document,
              filter,
              runtimeAssets?.[rootId]
            );
          }) !== false
        );
      });
      if (rootIds.length === 0) {
        return await executeQuery(request, contentReader, runtimeAssets);
      }
      const queryGraph = selectDocumentGraphForQuery({
        graph: documentGraph,
        query,
        rootIds,
      });
      emitDocumentGraphRuntimeEvent(onEvent, {
        type: "roots-selected",
        rootCount: rootIds.length,
      });
      const resolved = await resolveAdaptedDocumentGraph({
        graph: queryGraph,
        rootIds,
        load: async (node, options) => {
          const inlineDocument = inlineDocuments?.get(node.id);
          if (inlineDocument !== undefined) {
            return {
              format: "json",
              revision: node.revision,
              source: JSON.stringify(inlineDocument.properties),
            };
          }
          return await load(node, options);
        },
        concurrency: contentEngineLimits.concurrentContentReads,
        signal,
        onEvent,
        allowUnresolvedReferences: true,
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
      return await executeQuery(request, contentReader, runtimeAssets, {
        documents,
        skipMaterialized: true,
      });
    },
  };
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
  const documentGraph =
    artifact.documentGraph === undefined
      ? undefined
      : createDocumentGraph({
          nodes: artifact.documentGraph.nodes,
          edges: artifact.documentGraph.edges,
        });
  const database = createQueryableContentDatabase({
    artifact,
    revision: artifact.integrity.checksum,
    catalog: artifact.fieldCatalog,
    documentGraph,
    readContent,
  });
  return {
    ...database,
    getFieldCatalog: () => artifact.fieldCatalog,
    getStats: () => ({
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
    }),
  };
};

export const createRuntimeContentDatabase = ({
  artifact,
  readContent,
}: {
  artifact: ContentRuntimeArtifact;
  readContent?: AssetResourceContentReader;
}): RuntimeContentDatabase => {
  const restored = restoreContentRuntimeDocumentGraph({ artifact });
  return createQueryableContentDatabase({
    artifact,
    revision: artifact.revision,
    documentGraph: restored?.graph,
    inlineDocuments: restored?.inlineDocuments,
    readContent,
  });
};
