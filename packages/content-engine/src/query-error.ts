import type { AssetResourceQueryFailure } from "./schema";
import { AssetResourceHydrationError } from "./hydration";
import {
  AssetIndexRevisionError,
  AssetQueryExecutionError,
  AssetQueryMultipleResultsError,
} from "./structured-query";
import { DocumentResolutionLimitError } from "./document-graph/document-resolution";
import { CachedDocumentLoaderError } from "./document-graph/cached-document-loader";
import { AssetQueryRequestError } from "./request";
import { ZodError } from "zod";

export type AssetResourceQueryError = Omit<
  AssetResourceQueryFailure["error"],
  "details"
> & {
  details?: NonNullable<AssetResourceQueryFailure["error"]["details"]>;
  status: 400 | 409;
};

export const getAssetQueryRequestError = (
  error: unknown
): AssetResourceQueryError | undefined => {
  if (error instanceof AssetQueryRequestError === false) {
    return;
  }
  let message = error.message;
  const visited = new Set<unknown>();
  let cause = error.cause;
  while (cause instanceof Error && visited.has(cause) === false) {
    if (cause instanceof ZodError) {
      return {
        code: "INVALID_REQUEST",
        message: error.message,
        retryable: false,
        status: 400,
        details: {
          issues: cause.issues.map((issue) => ({
            code: issue.code,
            path: issue.path.map(String),
            message: issue.message,
          })),
        },
      };
    }
    message = cause.message;
    visited.add(cause);
    cause = cause.cause;
  }
  return {
    code: "INVALID_REQUEST",
    message,
    retryable: false,
    status: 400,
  };
};

/** Classifies content-query failures independently of an HTTP or RPC transport. */
export const getAssetResourceQueryError = (
  error: unknown
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
    const details = {
      ...error.details,
      ...(error.issues === undefined
        ? {}
        : {
            issues: error.issues.map((issue) => ({
              ...issue,
              path: [...issue.path],
            })),
          }),
    };
    return {
      code: error.code,
      message: error.message,
      retryable: false,
      ...(Object.keys(details).length === 0 ? {} : { details }),
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
