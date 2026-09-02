import type { AssetResourceQueryFailure } from "./schema";
import { AssetResourceHydrationError } from "./hydration";
import {
  AssetIndexRevisionError,
  AssetQueryExecutionError,
  AssetQueryMultipleResultsError,
} from "./structured-query";
import { DocumentResolutionLimitError } from "./document-graph/document-resolution";
import { CachedDocumentLoaderError } from "./document-graph/cached-document-loader";
import { DocumentSourceCompilationError } from "./document-graph/source-compiler";
import { MdxDocumentError } from "./mdx";
import { MarkdownMetadataError } from "./markdown-errors";
import { MarkdownDocumentError } from "./document-graph/markdown-document";

const findNestedSourceError = (error: unknown) => {
  const visited = new Set<unknown>();
  let current = error;
  let documentError: Error | undefined;
  while (current !== undefined && visited.has(current) === false) {
    if (current instanceof MdxDocumentError) {
      return current;
    }
    if (current instanceof MarkdownMetadataError) {
      return current;
    }
    if (current instanceof MarkdownDocumentError) {
      documentError ??= current;
    }
    visited.add(current);
    current = current instanceof Error ? current.cause : undefined;
  }
  return documentError;
};

export type AssetResourceQueryError = Omit<
  AssetResourceQueryFailure["error"],
  "details"
> & {
  details?: Record<string, string | number>;
  status: 400 | 409;
};

/** Classifies content-query failures independently of an HTTP or RPC transport. */
export const getAssetResourceQueryError = (
  error: unknown,
  { includeSourceDetails = false }: { includeSourceDetails?: boolean } = {}
): AssetResourceQueryError | undefined => {
  if (error instanceof AssetIndexRevisionError) {
    return {
      code: "STALE_INDEX",
      message: error.message,
      retryable: false,
      status: 409,
    };
  }
  if (error instanceof AssetQueryMultipleResultsError) {
    return {
      code: error.code,
      message: error.message,
      retryable: false,
      details: { matchedCount: error.matchedCount },
      status: 409,
    };
  }
  if (error instanceof AssetQueryExecutionError) {
    return {
      code: "INVALID_REQUEST",
      message: error.message,
      retryable: false,
      status: 400,
    };
  }
  if (error instanceof AssetResourceHydrationError) {
    return {
      code: error.code,
      message: error.message,
      retryable: false,
      details: error.details,
      status: 400,
    };
  }
  const visited = new Set<unknown>();
  let cause = error;
  while (cause !== undefined && visited.has(cause) === false) {
    if (includeSourceDetails && cause instanceof MdxDocumentError) {
      const details: Record<string, string | number> = {};
      const position = cause.sourceRange?.start;
      if (position !== undefined) {
        details.line = position.line;
        details.column = position.column;
      }
      if (cause.reason !== undefined) {
        details.reason = cause.reason;
      }
      return {
        code: "INVALID_REQUEST",
        message: cause.message,
        retryable: false,
        details,
        status: 400,
      };
    }
    if (
      includeSourceDetails &&
      cause instanceof DocumentSourceCompilationError &&
      cause.code === "DOCUMENT_ANALYSIS_FAILED"
    ) {
      const sourceError = findNestedSourceError(cause.cause);
      const details: Record<string, string | number> = {};
      if (cause.documentId !== undefined) {
        details.assetId = cause.documentId;
      }
      if (cause.documentPath !== undefined) {
        details.path = cause.documentPath;
      }
      if (sourceError instanceof MdxDocumentError) {
        const position = sourceError.sourceRange?.start;
        if (position !== undefined) {
          details.line = position.line;
          details.column = position.column;
        }
        if (sourceError.reason !== undefined) {
          details.reason = sourceError.reason;
        }
        return {
          code: "INVALID_REQUEST",
          message: sourceError.message,
          retryable: false,
          details,
          status: 400,
        };
      }
      if (sourceError instanceof MarkdownMetadataError) {
        if (sourceError.line !== undefined) {
          details.line = sourceError.line;
        }
        if (sourceError.column !== undefined) {
          details.column = sourceError.column;
        }
        return {
          code: "INVALID_REQUEST",
          message: sourceError.message,
          retryable: false,
          details,
          status: 400,
        };
      }
      if (sourceError instanceof Error) {
        return {
          code: "INVALID_REQUEST",
          message: sourceError.message,
          retryable: false,
          details,
          status: 400,
        };
      }
    }
    if (cause instanceof DocumentResolutionLimitError) {
      const details: Record<string, string | number> = {};
      for (const [key, value] of Object.entries({
        assetId: cause.documentId,
        documentCount: cause.documentCount,
        documentLimit: cause.documentLimit,
        contentByteLimit: cause.contentByteLimit,
        totalBytes: cause.totalBytes,
        totalByteLimit: cause.totalByteLimit,
      })) {
        if (value !== undefined) {
          details[key] = value;
        }
      }
      return {
        code: "CONTENT_LIMIT_EXCEEDED",
        message: cause.message,
        retryable: false,
        details,
        status: 400,
      };
    }
    if (cause instanceof CachedDocumentLoaderError) {
      return {
        code: "CONTENT_LIMIT_EXCEEDED",
        message: cause.message,
        retryable: false,
        details: {
          assetId: cause.documentId,
          contentByteLimit: cause.contentByteLimit,
        },
        status: 400,
      };
    }
    visited.add(cause);
    cause = cause instanceof Error ? cause.cause : undefined;
  }
};
