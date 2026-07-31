import { ByteLimitExceededError, readBoundedBytes } from "../byte-stream";
import { contentEngineLimits } from "../limits";
import {
  assembleDocument,
  parseDocumentSource,
  selectDocumentRepresentation,
  type AdaptedDocument,
} from "./document-adapter";
import {
  getDocumentGraphClosure,
  type DocumentGraph,
  type DocumentGraphNode,
} from "./graph";
import {
  assertDocumentSourceRevision,
  type DocumentSource,
} from "./document-source";
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
    const resolved = await resolveDocumentGraph<
      AdaptedDocument,
      AdaptedDocument
    >({
      graph,
      rootIds,
      concurrency,
      signal,
      load: async (node, options) => {
        const loaded = assertDocumentSourceRevision({
          node,
          source: await load(node, options),
        });
        let bytes: Uint8Array;
        try {
          bytes = await readBoundedBytes(loaded.source, maximumBytes);
        } catch (cause) {
          if (cause instanceof ByteLimitExceededError) {
            throw new DocumentResolutionLimitError({
              code: "CONTENT_LIMIT_EXCEEDED",
              message: `Document ${node.id} exceeds the byte limit`,
              documentId: node.id,
              contentByteLimit: maximumBytes,
              cause,
            });
          }
          throw cause;
        }
        const nextTotalBytes = totalBytes + bytes.byteLength;
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
        return await parseDocumentSource({
          format: loaded.format,
          source: bytes,
          maximumBytes,
        });
      },
      select: ({ reference, value }) =>
        selectDocumentRepresentation({
          document: value,
          representation: reference.representation,
        }),
      assemble: ({ source, references }) =>
        assembleDocument({ document: source, references }),
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
