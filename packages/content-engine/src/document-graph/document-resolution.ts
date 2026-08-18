import { LRUCache } from "lru-cache";
import { ByteLimitExceededError, readBytePrefix } from "../byte-stream";
import { contentEngineLimits } from "../limits";
import {
  assembleDocument,
  parseDocumentSource,
  selectDocumentRepresentation,
  type AdaptedDocument,
  type DocumentFormat,
} from "./document-adapter";
import {
  getDocumentGraphClosure,
  type DocumentGraph,
  type DocumentGraphNode,
} from "./graph";
import {
  assertDocumentSourceIdentity,
  type DocumentSource,
  type DocumentSourceLoader,
} from "./document-source";
import { getDocumentSourceCacheKey } from "./cached-document-loader";
import { resolveDocumentGraph, type ResolvedDocumentGraph } from "./resolver";
import {
  emitDocumentGraphRuntimeEvent,
  getDocumentGraphErrorCode,
  type DocumentGraphRuntimeObserver,
} from "./observability";

export type DocumentResolutionLimitErrorCode =
  | "DOCUMENT_COUNT_EXCEEDED"
  | "CONTENT_LIMIT_EXCEEDED"
  | "TOTAL_BYTES_EXCEEDED";

export class DocumentResolutionLimitError extends Error {
  readonly code: DocumentResolutionLimitErrorCode;
  readonly documentId?: string;
  readonly documentCount?: number;
  readonly documentLimit?: number;
  readonly contentByteLimit?: number;
  readonly totalBytes?: number;
  readonly totalByteLimit?: number;

  constructor({
    code,
    message,
    documentId,
    documentCount,
    documentLimit,
    contentByteLimit,
    totalBytes,
    totalByteLimit,
    cause,
  }: {
    code: DocumentResolutionLimitErrorCode;
    message: string;
    documentId?: string;
    documentCount?: number;
    documentLimit?: number;
    contentByteLimit?: number;
    totalBytes?: number;
    totalByteLimit?: number;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "DocumentResolutionLimitError";
    this.code = code;
    this.documentId = documentId;
    this.documentCount = documentCount;
    this.documentLimit = documentLimit;
    this.contentByteLimit = contentByteLimit;
    this.totalBytes = totalBytes;
    this.totalByteLimit = totalByteLimit;
  }
}

type SessionDocumentSource = Readonly<{
  format: DocumentFormat;
  revision: string;
  bytes: Uint8Array;
  byteLength: number;
  parse: () => Promise<AdaptedDocument>;
}>;

type ResolveDocumentGraphInput = {
  graph: DocumentGraph;
  rootIds: readonly string[];
  maximumTotalBytes?: number;
  maximumDocuments?: number;
  onEvent?: DocumentGraphRuntimeObserver;
  allowUnresolvedReferences?: boolean;
};

export type DocumentResolutionSession = Readonly<{
  getCached: (node: DocumentGraphNode) => DocumentSource | undefined;
  resolve: (
    input: ResolveDocumentGraphInput
  ) => Promise<ResolvedDocumentGraph<AdaptedDocument>>;
}>;

const createConcurrencyLimiter = (
  concurrency: number,
  signal: AbortSignal | undefined
) => {
  let active = 0;
  const waiters: Array<{ start: () => void }> = [];

  const acquire = async () => {
    signal?.throwIfAborted();
    if (active < concurrency) {
      active += 1;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      let waiter: { start: () => void };
      const onAbort = () => {
        const index = waiters.indexOf(waiter);
        if (index !== -1) {
          waiters.splice(index, 1);
        }
        try {
          signal?.throwIfAborted();
        } catch (error) {
          reject(error);
        }
      };
      waiter = {
        start: () => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        },
      };
      waiters.push(waiter);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  };

  const release = () => {
    const next = waiters.shift();
    if (next === undefined) {
      active -= 1;
      return;
    }
    next.start();
  };

  return async <Result>(run: () => Promise<Result>) => {
    await acquire();
    try {
      return await run();
    } finally {
      release();
    }
  };
};

const resolveWithSessionDocumentLoader = async ({
  graph,
  rootIds,
  concurrency,
  maximumBytes,
  maximumTotalBytes = contentEngineLimits.hydratedTotalBytes,
  maximumDocuments = contentEngineLimits.hydratedFileCount,
  signal,
  onEvent,
  allowUnresolvedReferences = false,
  load,
}: ResolveDocumentGraphInput & {
  concurrency: number;
  maximumBytes: number;
  signal?: AbortSignal;
  load: (
    node: DocumentGraphNode,
    options: { signal?: AbortSignal }
  ) => Promise<SessionDocumentSource>;
}): Promise<ResolvedDocumentGraph<AdaptedDocument>> => {
  const documentCount = getDocumentGraphClosure({ graph, rootIds }).length;
  const resolutionEvent = { rootCount: rootIds.length, documentCount };
  emitDocumentGraphRuntimeEvent(onEvent, {
    type: "resolution-started",
    ...resolutionEvent,
  });
  try {
    if (documentCount > maximumDocuments) {
      throw new DocumentResolutionLimitError({
        code: "DOCUMENT_COUNT_EXCEEDED",
        message: "Document graph resolution exceeds the document limit",
        documentCount,
        documentLimit: maximumDocuments,
      });
    }
    let totalBytes = 0;
    // Source reads stay concurrent, while budgets and parsing follow graph order.
    let previousDocument = Promise.resolve();
    const resolved = await resolveDocumentGraph<
      AdaptedDocument,
      AdaptedDocument
    >({
      graph,
      rootIds,
      concurrency,
      signal,
      load: async (node, options) => {
        const turn = previousDocument;
        let releaseTurn = () => {};
        previousDocument = new Promise<void>((resolve) => {
          releaseTurn = resolve;
        });
        let loaded: PromiseSettledResult<SessionDocumentSource>;
        try {
          loaded = { status: "fulfilled", value: await load(node, options) };
        } catch (reason) {
          loaded = { status: "rejected", reason };
        }
        await turn;
        try {
          if (loaded.status === "rejected") {
            throw loaded.reason;
          }
          if (loaded.value.byteLength > maximumBytes) {
            throw new DocumentResolutionLimitError({
              code: "CONTENT_LIMIT_EXCEEDED",
              message: `Document ${node.id} exceeds the byte limit`,
              documentId: node.id,
              contentByteLimit: maximumBytes,
              cause: new ByteLimitExceededError(),
            });
          }
          const nextTotalBytes = totalBytes + loaded.value.byteLength;
          if (nextTotalBytes > maximumTotalBytes) {
            throw new DocumentResolutionLimitError({
              code: "TOTAL_BYTES_EXCEEDED",
              message: "Document graph resolution exceeds the total byte limit",
              documentId: node.id,
              totalBytes: nextTotalBytes,
              totalByteLimit: maximumTotalBytes,
            });
          }
          totalBytes = nextTotalBytes;
          return await loaded.value.parse();
        } finally {
          releaseTurn();
        }
      },
      select: ({ reference, value }) =>
        selectDocumentRepresentation({
          document: value,
          representation: reference.representation,
        }),
      assemble: ({ source, references }) =>
        assembleDocument({
          document: source,
          references,
          allowUnresolvedReferences,
        }),
    });
    emitDocumentGraphRuntimeEvent(onEvent, {
      type: "resolution-completed",
      ...resolutionEvent,
    });
    return resolved;
  } catch (error) {
    emitDocumentGraphRuntimeEvent(onEvent, {
      type: "resolution-failed",
      ...resolutionEvent,
      errorCode: getDocumentGraphErrorCode(error),
    });
    throw error;
  }
};

export const createDocumentResolutionSession = ({
  load,
  concurrency,
  signal,
  maximumDocumentBytes = contentEngineLimits.hydratedFileBytes,
  maximumCacheBytes = contentEngineLimits.hydratedTotalBytes * 4,
}: {
  load: DocumentSourceLoader;
  concurrency: number;
  signal?: AbortSignal;
  maximumDocumentBytes?: number;
  maximumCacheBytes?: number;
}): DocumentResolutionSession => {
  if (Number.isSafeInteger(concurrency) === false || concurrency <= 0) {
    throw new TypeError("Document resolution concurrency must be positive");
  }
  if (
    Number.isSafeInteger(maximumDocumentBytes) === false ||
    maximumDocumentBytes <= 0
  ) {
    throw new TypeError("Document resolution byte limit must be positive");
  }
  if (
    Number.isSafeInteger(maximumCacheBytes) === false ||
    maximumCacheBytes <= 0
  ) {
    throw new TypeError(
      "Document resolution cache byte limit must be positive"
    );
  }
  const cached = new LRUCache<string, SessionDocumentSource>({
    maxSize: maximumCacheBytes,
    sizeCalculation: ({ byteLength }) => Math.max(1, byteLength),
  });
  const pending = new Map<string, Promise<SessionDocumentSource>>();
  const limit = createConcurrencyLimiter(concurrency, signal);

  const assertSessionSignal = (requestedSignal?: AbortSignal) => {
    if (requestedSignal !== undefined && requestedSignal !== signal) {
      throw new TypeError("Document resolution session signal does not match");
    }
    signal?.throwIfAborted();
  };

  const waitForSessionTask = async <Result>(task: Promise<Result>) => {
    assertSessionSignal();
    if (signal === undefined) {
      return await task;
    }
    return await new Promise<Result>((resolve, reject) => {
      const cleanup = () => signal.removeEventListener("abort", onAbort);
      const onAbort = () => {
        cleanup();
        try {
          signal.throwIfAborted();
        } catch (error) {
          reject(error);
        }
      };
      signal.addEventListener("abort", onAbort, { once: true });
      task.then(
        (value) => {
          cleanup();
          resolve(value);
        },
        (error) => {
          cleanup();
          reject(error);
        }
      );
      if (signal.aborted) {
        onAbort();
      }
    });
  };

  const loadSessionDocument = async (
    node: DocumentGraphNode,
    options: { signal?: AbortSignal }
  ) => {
    assertSessionSignal(options.signal);
    const key = getDocumentSourceCacheKey(node);
    const cachedDocument = cached.get(key);
    if (cachedDocument !== undefined) {
      return cachedDocument;
    }
    const previous = pending.get(key);
    if (previous !== undefined) {
      return await waitForSessionTask(previous);
    }
    const request = limit(async () => {
      assertSessionSignal(options.signal);
      const source = assertDocumentSourceIdentity({
        node,
        source: await load(node, { signal }),
      });
      assertSessionSignal(options.signal);
      const bytes = await readBytePrefix(
        source.source,
        maximumDocumentBytes + 1
      );
      assertSessionSignal(options.signal);
      let parsed: Promise<AdaptedDocument> | undefined;
      const entry = Object.freeze({
        format: source.format,
        revision: source.revision,
        bytes,
        byteLength: bytes.byteLength,
        parse: () => {
          parsed ??= parseDocumentSource({
            format: source.format,
            source: bytes,
            maximumBytes: maximumDocumentBytes,
          });
          return parsed;
        },
      });
      if (entry.byteLength <= maximumCacheBytes) {
        cached.set(key, entry);
      }
      return entry;
    });
    pending.set(key, request);
    try {
      return await waitForSessionTask(request);
    } finally {
      pending.delete(key);
    }
  };

  const getCached = (node: DocumentGraphNode): DocumentSource | undefined => {
    assertSessionSignal();
    const entry = cached.get(getDocumentSourceCacheKey(node));
    if (entry === undefined || entry.byteLength > maximumDocumentBytes) {
      return;
    }
    return Object.freeze({
      format: entry.format,
      revision: entry.revision,
      source: entry.bytes.slice(),
    });
  };

  return Object.freeze({
    getCached,
    resolve: async (input: ResolveDocumentGraphInput) => {
      return await resolveWithSessionDocumentLoader({
        ...input,
        concurrency,
        maximumBytes: maximumDocumentBytes,
        signal,
        load: loadSessionDocument,
      });
    },
  });
};

/** Resolves parsed JSON and Markdown values without depending on storage. */
export const resolveAdaptedDocumentGraph = async ({
  graph,
  rootIds,
  concurrency,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
  maximumTotalBytes = contentEngineLimits.hydratedTotalBytes,
  maximumDocuments = contentEngineLimits.hydratedFileCount,
  signal,
  load,
  onEvent,
  allowUnresolvedReferences = false,
}: {
  graph: DocumentGraph;
  rootIds: readonly string[];
  concurrency: number;
  maximumBytes?: number;
  maximumTotalBytes?: number;
  maximumDocuments?: number;
  signal?: AbortSignal;
  load: (
    node: DocumentGraphNode,
    options: { signal?: AbortSignal }
  ) => Promise<DocumentSource>;
  onEvent?: DocumentGraphRuntimeObserver;
  allowUnresolvedReferences?: boolean;
}): Promise<ResolvedDocumentGraph<AdaptedDocument>> => {
  const session = createDocumentResolutionSession({
    load,
    concurrency,
    signal,
    maximumDocumentBytes: maximumBytes,
    maximumCacheBytes: Math.max(maximumBytes, maximumTotalBytes),
  });
  return await session.resolve({
    graph,
    rootIds,
    maximumTotalBytes,
    maximumDocuments,
    onEvent,
    allowUnresolvedReferences,
  });
};
