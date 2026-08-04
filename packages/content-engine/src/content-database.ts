import {
  evaluateQueryWhere,
  mapQueryWhere,
} from "@webstudio-is/query-builder/runtime";
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
  executeAssetQueries,
  matchesAssetQueryFilter,
  type AssetRuntimeData,
} from "./structured-query";
import { encodeUtf8, getUtf8ByteLength, toByteChunks } from "./byte-stream";
import type { AssetResourceContentReader } from "./hydration";
import { getMaterializedAssetQueryResult } from "./materialized-query";
import {
  createDocumentGraph,
  getDocumentGraphClosure,
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
import { serializeJsonDeterministically } from "./canonical-json";

type ContentDatabaseQueryArguments = [
  request: AssetQueryRequestInput,
  readContent?: AssetResourceContentReader,
  runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>,
];

export type ContentDatabase = {
  query(...args: ContentDatabaseQueryArguments): Promise<AssetQueryResult>;
  queryManyWithDocumentGraph(input: {
    requests: readonly AssetQueryRequestInput[];
    load: DocumentSourceLoader;
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

const getDocumentGraphStitchKey = (
  query: ReturnType<typeof assetQuery.parse>
) =>
  serializeJsonDeterministically({
    where: mapQueryWhere(query.where, ({ field, operator }) => ({
      field,
      operator,
      value: "__webstudio_query_value__",
    })),
    sort: query.sort,
    output: query.output,
    content: query.content,
  });

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
  const executeQueries = async ({
    requests,
    queryContentReader,
    runtimeAssets,
    documents = artifact.documents,
    skipMaterialized = false,
  }: {
    requests: readonly AssetQueryRequestInput[];
    queryContentReader?: AssetResourceContentReader;
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
    documents?: readonly ContentDatabaseDocument[];
    skipMaterialized?: boolean;
  }): Promise<PromiseSettledResult<AssetQueryResult>[]> => {
    const results: Array<PromiseSettledResult<AssetQueryResult> | undefined> =
      Array.from({ length: requests.length });
    const assetUrls = Object.fromEntries(
      Object.entries(runtimeAssets ?? {}).map(([id, asset]) => [id, asset.url])
    );
    const pendingIndexes: number[] = [];
    for (const [index, request] of requests.entries()) {
      if (
        request.indexRevision !== undefined &&
        request.indexRevision !== revision
      ) {
        results[index] = {
          status: "rejected",
          reason: new AssetIndexRevisionError(),
        };
        continue;
      }
      if (skipMaterialized === false) {
        try {
          const materialized = await getMaterializedAssetQueryResult({
            queries: artifact.queries,
            query: request.query,
            assetValueReferences: artifact.assetValueReferences,
            assetUrls,
          });
          if (materialized !== undefined) {
            results[index] = { status: "fulfilled", value: materialized };
            continue;
          }
        } catch (error) {
          results[index] = { status: "rejected", reason: error };
          continue;
        }
      }
      pendingIndexes.push(index);
    }
    if (pendingIndexes.length > 0) {
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
      const executed = await executeAssetQueries({
        queries: pendingIndexes.map((index) => requests[index].query),
        catalog,
        documents,
        read: readEmbeddedContent,
        runtimeAssets,
        assetReferences: artifact.assetReferences,
        assetValueReferences: artifact.assetValueReferences,
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
  const query = async (...args: ContentDatabaseQueryArguments) =>
    await executeQuery(...args);
  const queryWithDocumentGraph: ContentDatabase["queryWithDocumentGraph"] =
    async ({
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
    };
  const queryManyWithDocumentGraph: ContentDatabase["queryManyWithDocumentGraph"] =
    async ({
      requests,
      load,
      readContent: queryContentReader,
      runtimeAssets,
      signal,
      onEvent,
    }) => {
      if (documentGraph === undefined) {
        return await executeQueries({
          requests,
          queryContentReader,
          runtimeAssets,
        });
      }
      type QueryState = {
        index: number;
        request: AssetQueryRequestInput;
        query: ReturnType<typeof assetQuery.parse>;
        rootIds: string[];
      };
      const results: Array<PromiseSettledResult<AssetQueryResult> | undefined> =
        Array.from({ length: requests.length });
      const statesByStitchKey = new Map<string, QueryState[]>();
      for (const [index, request] of requests.entries()) {
        if (
          request.indexRevision !== undefined &&
          request.indexRevision !== revision
        ) {
          results[index] = {
            status: "rejected",
            reason: new AssetIndexRevisionError(),
          };
          continue;
        }
        try {
          const query = assetQuery.parse(request.query);
          const key = getDocumentGraphStitchKey(query);
          const state = { index, request, query, rootIds: [] };
          const group = statesByStitchKey.get(key);
          if (group === undefined) {
            statesByStitchKey.set(key, [state]);
          } else {
            group.push(state);
          }
        } catch (error) {
          results[index] = { status: "rejected", reason: error };
        }
      }

      const assetUrls = Object.fromEntries(
        Object.entries(runtimeAssets ?? {}).map(([id, asset]) => [
          id,
          asset.url,
        ])
      );
      const storedDocuments = new Map(
        artifact.documents.map((document) => [document._id, document])
      );
      const resolvedStoredDocuments = new Map<
        string,
        ContentDatabaseDocument | undefined
      >();
      const getStoredDocument = (id: string) => {
        if (resolvedStoredDocuments.has(id)) {
          return resolvedStoredDocuments.get(id);
        }
        const stored = storedDocuments.get(id);
        const resolved =
          stored === undefined
            ? undefined
            : resolveAssetValueReferences({
                value: stored,
                references: artifact.assetValueReferences?.[id],
                assetUrls,
              });
        resolvedStoredDocuments.set(id, resolved);
        return resolved;
      };
      const noGraphStates: QueryState[] = [];
      const individualStates: QueryState[] = [];
      const stitchedGroups: QueryState[][] = [];
      for (const states of statesByStitchKey.values()) {
        try {
          const candidateRootIds = getDocumentGraphQueryRootIds({
            graph: documentGraph,
            query: states[0].query,
          });
          if (candidateRootIds.length === 0) {
            noGraphStates.push(...states);
            continue;
          }
          for (const rootId of candidateRootIds) {
            const document = getStoredDocument(rootId);
            if (document === undefined) {
              continue;
            }
            const filterResults = new Map<string, boolean | undefined>();
            for (const state of states) {
              const matched = evaluateQueryWhere(
                state.query.where,
                (filter) => {
                  const key = serializeJsonDeterministically(filter);
                  if (filterResults.has(key)) {
                    return filterResults.get(key);
                  }
                  const result = isDocumentGraphFieldAffected({
                    graph: documentGraph,
                    sourceId: rootId,
                    field: filter.field,
                  })
                    ? undefined
                    : matchesAssetQueryFilter(
                        document,
                        filter,
                        runtimeAssets?.[rootId]
                      );
                  filterResults.set(key, result);
                  return result;
                }
              );
              if (matched !== false) {
                state.rootIds.push(rootId);
              }
            }
          }
          if (states.every(({ rootIds }) => rootIds.length === 0)) {
            noGraphStates.push(...states);
            continue;
          }
          const eligible: QueryState[] = [];
          for (const state of states) {
            if (state.rootIds.length === 0) {
              eligible.push(state);
              continue;
            }
            const selected = selectDocumentGraphForQuery({
              graph: documentGraph,
              query: state.query,
              rootIds: state.rootIds,
            });
            const documentCount = getDocumentGraphClosure({
              graph: selected,
              rootIds: state.rootIds,
            }).length;
            if (documentCount > contentEngineLimits.hydratedFileCount) {
              individualStates.push(state);
            } else {
              eligible.push(state);
            }
          }
          if (eligible.length < 2) {
            individualStates.push(...eligible);
          } else {
            stitchedGroups.push(eligible);
          }
        } catch {
          individualStates.push(...states);
        }
      }

      const contentReader =
        queryContentReader ??
        createDocumentContentReader({ graph: documentGraph, load, signal });
      const runIndividually = async (states: readonly QueryState[]) => {
        const settled = await Promise.allSettled(
          states.map(({ request }) =>
            queryWithDocumentGraph({
              request,
              load,
              readContent: queryContentReader,
              runtimeAssets,
              signal,
              onEvent,
            })
          )
        );
        for (const [position, state] of states.entries()) {
          results[state.index] = settled[position];
        }
      };
      const runStitched = async (states: readonly QueryState[]) => {
        try {
          const rootIds = [
            ...new Set(states.flatMap((state) => state.rootIds)),
          ];
          const queryGraph = selectDocumentGraphForQuery({
            graph: documentGraph,
            query: states[0].query,
            rootIds,
          });
          const documentCount = getDocumentGraphClosure({
            graph: queryGraph,
            rootIds,
          }).length;
          if (documentCount > contentEngineLimits.candidateDocuments) {
            await runIndividually(states);
            return;
          }
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
            maximumDocuments: documentCount,
            signal,
            onEvent,
            allowUnresolvedReferences: true,
          });
          const propertiesById = new Map(
            rootIds.flatMap((rootId) => {
              const resolvedRoot = resolved.values.get(rootId);
              const properties =
                resolvedRoot === undefined
                  ? undefined
                  : getAdaptedDocumentProperties(resolvedRoot);
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
          const settled = await executeQueries({
            requests: states.map(({ request }) => request),
            queryContentReader: contentReader,
            runtimeAssets,
            documents,
            skipMaterialized: true,
          });
          for (const [position, state] of states.entries()) {
            results[state.index] = settled[position];
          }
        } catch (error) {
          if (signal?.aborted) {
            for (const { index } of states) {
              results[index] = { status: "rejected", reason: error };
            }
            return;
          }
          await runIndividually(states);
        }
      };

      await Promise.all([
        noGraphStates.length === 0
          ? Promise.resolve()
          : executeQueries({
              requests: noGraphStates.map(({ request }) => request),
              queryContentReader: contentReader,
              runtimeAssets,
            }).then((settled) => {
              for (const [position, state] of noGraphStates.entries()) {
                results[state.index] = settled[position];
              }
            }),
        runIndividually(individualStates),
        ...stitchedGroups.map(runStitched),
      ]);
      return results.map((result) => {
        if (result === undefined) {
          throw new Error("Content database query was not settled");
        }
        return result;
      });
    };
  return { query, queryManyWithDocumentGraph, queryWithDocumentGraph };
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
