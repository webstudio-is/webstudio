import { DocumentSourceCompilationError } from "./document-graph/source-compiler";
import { MdxDocumentError } from "./mdx";
import { MarkdownMetadataError } from "./markdown-errors";
import {
  getAssetResourceQueryError,
  type AssetResourceQueryError,
} from "./query-error";
import { AssetQueryRequestError } from "./request";

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
    if (current instanceof Error) {
      documentError ??= current;
    }
    visited.add(current);
    current = current instanceof Error ? current.cause : undefined;
  }
  return documentError;
};

const getRequestError = (
  error: AssetQueryRequestError
): AssetResourceQueryError => {
  let message = error.message;
  const visited = new Set<unknown>();
  let cause = error.cause;
  while (cause instanceof Error && visited.has(cause) === false) {
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

export const getDetailedAssetResourceQueryError = (
  error: unknown
): AssetResourceQueryError | undefined => {
  if (error instanceof AssetQueryRequestError) {
    return getRequestError(error);
  }
  const visited = new Set<unknown>();
  let cause = error;
  while (cause !== undefined && visited.has(cause) === false) {
    if (cause instanceof MdxDocumentError) {
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
      }
      if (sourceError instanceof MarkdownMetadataError) {
        if (sourceError.line !== undefined) {
          details.line = sourceError.line;
        }
        if (sourceError.column !== undefined) {
          details.column = sourceError.column;
        }
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
    visited.add(cause);
    cause = cause instanceof Error ? cause.cause : undefined;
  }
  return getAssetResourceQueryError(error);
};
