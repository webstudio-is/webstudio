import { ByteLimitExceededError, readBoundedBytes } from "../byte-stream";
import { serializeJsonDeterministically } from "../canonical-json";
import { contentEngineLimits } from "../limits";
import type { DocumentFormat } from "./document-adapter";
import type { DocumentGraphNode } from "./graph";
import {
  assertDocumentSourceIdentity,
  type DocumentSource,
  type DocumentSourceLoader,
} from "./document-source";
import {
  emitDocumentGraphRuntimeEvent,
  getDocumentGraphErrorCode,
  type DocumentGraphRuntimeObserver,
} from "./observability";

export type CachedDocumentSource = Readonly<{
  format: DocumentFormat;
  revision: string;
  bytes: Uint8Array;
}>;

export interface DocumentSourceCache {
  get(key: string): Promise<CachedDocumentSource | undefined>;
  set(key: string, source: CachedDocumentSource): Promise<void>;
}

export class CachedDocumentLoaderError extends Error {
  readonly code = "CONTENT_LIMIT_EXCEEDED";
  readonly documentId: string;
  readonly contentByteLimit: number;

  constructor({
    message,
    documentId,
    contentByteLimit,
    cause,
  }: {
    message: string;
    documentId: string;
    contentByteLimit: number;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "CachedDocumentLoaderError";
    this.documentId = documentId;
    this.contentByteLimit = contentByteLimit;
  }
}

export const getDocumentSourceCacheKey = ({
  contentRef,
  revision,
  format,
}: Pick<DocumentGraphNode, "contentRef" | "revision" | "format">) =>
  serializeJsonDeterministically([contentRef, revision, format ?? null]);

const isCachedDocumentSource = (
  input: unknown
): input is CachedDocumentSource => {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  const value = input as Partial<CachedDocumentSource>;
  return (
    (value.format === "json" || value.format === "markdown") &&
    typeof value.revision === "string" &&
    value.revision.length > 0 &&
    value.bytes instanceof Uint8Array
  );
};

const toDocumentSource = (source: CachedDocumentSource): DocumentSource =>
  Object.freeze({
    format: source.format,
    revision: source.revision,
    source: source.bytes,
  });

/** Adds revision-keyed bounded caching around any document source loader. */
export const createCachedDocumentSourceLoader = ({
  load,
  cache,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
  onEvent,
}: {
  load: DocumentSourceLoader;
  cache: DocumentSourceCache;
  maximumBytes?: number;
  onEvent?: DocumentGraphRuntimeObserver;
}): DocumentSourceLoader => {
  const pending = new Map<
    string,
    Map<AbortSignal | undefined, Promise<DocumentSource>>
  >();

  return async (node, options) => {
    const key = getDocumentSourceCacheKey(node);
    const pendingBySignal = pending.get(key) ?? new Map();
    pending.set(key, pendingBySignal);
    const previous = pendingBySignal.get(options.signal);
    if (previous !== undefined) {
      return await previous;
    }
    const request = (async () => {
      let cached: CachedDocumentSource | undefined;
      try {
        cached = await cache.get(key);
      } catch (error) {
        emitDocumentGraphRuntimeEvent(onEvent, {
          type: "document-cache-read-failed",
          documentId: node.id,
          revision: node.revision,
          errorCode: getDocumentGraphErrorCode(error),
        });
        // Cache availability must not prevent an origin read.
      }
      if (
        isCachedDocumentSource(cached) &&
        cached.revision === node.revision &&
        cached.bytes.byteLength <= maximumBytes &&
        (node.format === undefined || cached.format === node.format)
      ) {
        emitDocumentGraphRuntimeEvent(onEvent, {
          type: "document-cache-hit",
          documentId: node.id,
          revision: node.revision,
        });
        return toDocumentSource(cached);
      }
      emitDocumentGraphRuntimeEvent(onEvent, {
        type: "document-cache-miss",
        documentId: node.id,
        revision: node.revision,
      });

      const loaded = assertDocumentSourceIdentity({
        node,
        source: await load(node, options),
      });
      let bytes: Uint8Array;
      try {
        bytes = await readBoundedBytes(loaded.source, maximumBytes);
      } catch (cause) {
        if (cause instanceof ByteLimitExceededError) {
          throw new CachedDocumentLoaderError({
            message: `Document ${node.id} exceeds the cache byte limit`,
            documentId: node.id,
            contentByteLimit: maximumBytes,
            cause,
          });
        }
        throw cause;
      }
      const entry = Object.freeze({
        format: loaded.format,
        revision: loaded.revision,
        bytes,
      });
      try {
        await cache.set(key, entry);
        emitDocumentGraphRuntimeEvent(onEvent, {
          type: "document-cache-stored",
          documentId: node.id,
          revision: node.revision,
        });
      } catch (error) {
        emitDocumentGraphRuntimeEvent(onEvent, {
          type: "document-cache-write-failed",
          documentId: node.id,
          revision: node.revision,
          errorCode: getDocumentGraphErrorCode(error),
        });
      }
      return toDocumentSource(entry);
    })();
    pendingBySignal.set(options.signal, request);
    try {
      return await request;
    } finally {
      pendingBySignal.delete(options.signal);
      if (pendingBySignal.size === 0) {
        pending.delete(key);
      }
    }
  };
};
