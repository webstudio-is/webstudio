import { evaluateQueryWhere } from "@webstudio-is/query-builder/runtime";
import type {
  ContentArtifactV1,
  AssetQueryRequestInput,
  AssetQueryResult,
  AssetQueryExecutionResult,
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
  executeAssetQueries,
  matchesAssetQueryFilter,
  type AssetRuntimeData,
} from "./structured-query";
import { encodeUtf8, getUtf8ByteLength, toByteChunks } from "./byte-stream";
import type { AssetResourceContentReader } from "./hydration";
import { getMaterializedAssetQueryResult } from "./materialized-query";
import {
  createDocumentGraph,
  createDocumentResolutionSession,
  getAdaptedDocumentProperties,
  isDocumentGraphFieldAffected,
  getDocumentGraphQueryRootIds,
  selectDocumentGraphForQuery,
  type AdaptedDocument,
  type DocumentResolutionSession,
  type DocumentSource,
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
  /**
   * Executes independent queries through one request-scoped graph resolution
   * session. Document loads are shared, while selection, limits, results, and
   * failures remain isolated and in request order.
   */
  queryManyWithDocumentGraph(input: {
    requests: readonly AssetQueryRequestInput[];
    load: DocumentSourceLoader;
    resolutionSession?: DocumentResolutionSession;
    readContent?: AssetResourceContentReader;
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
    signal?: AbortSignal;
    onEvent?: DocumentGraphRuntimeObserver;
  }): Promise<PromiseSettledResult<AssetQueryResult>[]>;
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
  "query" | "queryManyWithDocumentGraph" | "queryWithDocumentGraph"
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
  getCached,
  readFallback,
  signal,
}: {
  graph: ReturnType<typeof createDocumentGraph>;
  load: DocumentSourceLoader;
  getCached: (
    node: Parameters<DocumentSourceLoader>[0]
  ) => DocumentSource | undefined;
  readFallback?: AssetResourceContentReader;
  signal?: AbortSignal;
}): AssetResourceContentReader => {
  const nodesByContentRef = new Map(
    graph.nodes.map((node) => [node.contentRef, node])
  );
  return async (contentRef, range) => {
    const node = nodesByContentRef.get(contentRef);
    if (node === undefined) {
      if (readFallback !== undefined) {
        return await readFallback(contentRef, range);
      }
      throw new Error(
        `Document content reference ${contentRef} is unavailable`
      );
    }
    const loaded = assertDocumentSourceIdentity({
      node,
      source: getCached(node) ?? (await load(node, { signal })),
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
  const documentsById = new Map(
    artifact.documents.map((document) => [document._id, document])
  );
  const assertIndexRevision = (request: AssetQueryRequestInput) => {
    if (
      request.indexRevision !== undefined &&
      request.indexRevision !== revision
    ) {
      throw new AssetIndexRevisionError();
    }
  };
  const createContentReader = (
    queryContentReader?: AssetResourceContentReader
  ): AssetResourceContentReader => {
    return async (contentRef, range) => {
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
  };
  const getSettledValue = (
    result: PromiseSettledResult<AssetQueryExecutionResult>
  ): AssetQueryExecutionResult => {
    if (result.status === "rejected") {
      throw result.reason;
    }
    return result.value;
  };
  const executeDynamicQueries = async ({
    requests,
    queryContentReader,
    runtimeAssets,
    documents = artifact.documents,
  }: {
    requests: readonly AssetQueryRequestInput[];
    queryContentReader?: AssetResourceContentReader;
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
    documents?: readonly ContentDatabaseDocument[];
  }) =>
    await executeAssetQueries({
      queries: requests.map(({ query }) => query),
      catalog,
      documents,
      read: createContentReader(queryContentReader),
      runtimeAssets,
      assetReferences: artifact.assetReferences,
      assetValueReferences: artifact.assetValueReferences,
    });
  const executeDynamicQuery = async ({
    request,
    ...input
  }: {
    request: AssetQueryRequestInput;
    queryContentReader?: AssetResourceContentReader;
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
    documents?: readonly ContentDatabaseDocument[];
  }) =>
    getSettledValue(
      (
        await executeDynamicQueries({
          ...input,
          requests: [request],
        })
      )[0]
    );
  const executeQueries = async ({
    requests,
    queryContentReader,
    runtimeAssets,
  }: {
    requests: readonly AssetQueryRequestInput[];
    queryContentReader?: AssetResourceContentReader;
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
  }): Promise<PromiseSettledResult<AssetQueryExecutionResult>[]> => {
    const results: Array<
      PromiseSettledResult<AssetQueryExecutionResult> | undefined
    > = Array.from({ length: requests.length });
    const pendingIndexes: number[] = [];
    for (const [index, request] of requests.entries()) {
      try {
        assertIndexRevision(request);
        const materialized = await getMaterializedAssetQueryResult({
          queries: artifact.queries,
          query: request.query,
          assetValueReferences: artifact.assetValueReferences,
          runtimeAssets,
        });
        if (materialized !== undefined) {
          results[index] = { status: "fulfilled", value: materialized };
          continue;
        }
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
        continue;
      }
      pendingIndexes.push(index);
    }
    if (pendingIndexes.length > 0) {
      const executed = await executeDynamicQueries({
        requests: pendingIndexes.map((index) => requests[index]),
        queryContentReader,
        runtimeAssets,
      });
      for (const [position, index] of pendingIndexes.entries()) {
        results[index] = executed[position];
      }
    }
    return results.map((result) => {
      if (result === undefined) {
        throw new Error("Content database query was not settled");
      }
      return result;
    });
  };
  const executeQuery = async (
    request: AssetQueryRequestInput,
    queryContentReader?: AssetResourceContentReader,
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>
  ) =>
    getSettledValue(
      (
        await executeQueries({
          requests: [request],
          queryContentReader,
          runtimeAssets,
        })
      )[0]
    );
  const query = async (...args: ContentDatabaseQueryArguments) =>
    await executeQuery(...args);

  const createInlineAwareLoader = (
    load: DocumentSourceLoader
  ): DocumentSourceLoader => {
    return async (node, options) => {
      const inlineDocument = inlineDocuments?.get(node.id);
      if (inlineDocument !== undefined) {
        return {
          format: "json",
          revision: node.revision,
          source: JSON.stringify(inlineDocument.properties),
        };
      }
      return await load(node, options);
    };
  };
  const getResolvableRootIds = ({
    graph,
    query,
    runtimeAssets,
  }: {
    graph: ReturnType<typeof createDocumentGraph>;
    query: ReturnType<typeof assetQuery.parse>;
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
  }) => {
    return getDocumentGraphQueryRootIds({ graph, query }).filter((rootId) => {
      const storedDocument = documentsById.get(rootId);
      const document =
        storedDocument === undefined
          ? undefined
          : resolveAssetValueReferences({
              value: storedDocument,
              references: artifact.assetValueReferences?.[rootId],
              runtimeAssets: runtimeAssets ?? {},
            });
      if (document === undefined) {
        return false;
      }
      return (
        evaluateQueryWhere(query.where, (filter) => {
          if (
            isDocumentGraphFieldAffected({
              graph,
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
  };
  const replaceResolvedRootProperties = ({
    rootIds,
    roots,
  }: {
    rootIds: readonly string[];
    roots: readonly AdaptedDocument[];
  }) => {
    const propertiesById = new Map(
      rootIds.flatMap((rootId, index) => {
        const properties = getAdaptedDocumentProperties(roots[index]);
        return properties === undefined ? [] : [[rootId, properties] as const];
      })
    );
    return artifact.documents.map((document) => {
      const properties = propertiesById.get(document._id);
      return properties === undefined
        ? document
        : contentDatabaseDocument.parse({ ...document, properties });
    });
  };
  const executeQueryWithDocumentGraph = async ({
    request,
    graph,
    resolutionSession,
    contentReader,
    runtimeAssets,
    onEvent,
  }: {
    request: AssetQueryRequestInput;
    graph: ReturnType<typeof createDocumentGraph>;
    resolutionSession: DocumentResolutionSession;
    contentReader: AssetResourceContentReader;
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
    onEvent?: DocumentGraphRuntimeObserver;
  }) => {
    assertIndexRevision(request);
    const query = assetQuery.parse(request.query);
    const rootIds = getResolvableRootIds({
      graph,
      query,
      runtimeAssets,
    });
    if (rootIds.length === 0) {
      return await executeQuery(request, contentReader, runtimeAssets);
    }
    const queryGraph = selectDocumentGraphForQuery({
      graph,
      query,
      rootIds,
    });
    emitDocumentGraphRuntimeEvent(onEvent, {
      type: "roots-selected",
      rootCount: rootIds.length,
    });
    const resolved = await resolutionSession.resolve({
      graph: queryGraph,
      rootIds,
      onEvent,
      allowUnresolvedReferences: true,
    });
    const documents = replaceResolvedRootProperties({
      rootIds,
      roots: resolved.roots,
    });
    return await executeDynamicQuery({
      request,
      queryContentReader: contentReader,
      runtimeAssets,
      documents,
    });
  };
  const queryManyWithDocumentGraph = async ({
    requests,
    load,
    resolutionSession: sharedResolutionSession,
    readContent: queryContentReader,
    runtimeAssets,
    signal,
    onEvent,
  }: Parameters<ContentDatabase["queryManyWithDocumentGraph"]>[0]) => {
    if (documentGraph === undefined) {
      return await executeQueries({
        requests,
        queryContentReader,
        runtimeAssets,
      });
    }
    const documentLoader = createInlineAwareLoader(load);
    const resolutionSession =
      sharedResolutionSession ??
      createDocumentResolutionSession({
        load: documentLoader,
        concurrency: contentEngineLimits.concurrentContentReads,
        signal,
      });
    const contentReader = createDocumentContentReader({
      graph: documentGraph,
      load: documentLoader,
      getCached: resolutionSession.getCached,
      readFallback: queryContentReader ?? readContent,
      signal,
    });
    // Share only graph resolution, like a request-scoped GraphQL DataLoader.
    // Running each query independently preserves partial-result semantics.
    return await Promise.allSettled(
      requests.map((request) =>
        executeQueryWithDocumentGraph({
          request,
          graph: documentGraph,
          resolutionSession,
          contentReader,
          runtimeAssets,
          onEvent,
        })
      )
    );
  };
  const queryWithDocumentGraph = async ({
    request,
    ...input
  }: Parameters<ContentDatabase["queryWithDocumentGraph"]>[0]) =>
    getSettledValue(
      (
        await queryManyWithDocumentGraph({
          ...input,
          requests: [request],
        })
      )[0]
    );
  return {
    query,
    queryManyWithDocumentGraph,
    queryWithDocumentGraph,
  } as unknown as RuntimeContentDatabase;
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
