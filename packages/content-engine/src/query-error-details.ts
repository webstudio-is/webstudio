import { DocumentSourceCompilationError } from "./document-graph/source-compiler";
import { DocumentSourceCompilationAggregateError } from "./document-graph/source-compiler";
import { MdxDocumentError, type MdxSourceRange } from "./mdx";
import { MarkdownMetadataError } from "./markdown-errors";
import {
  DocumentGraphCompilationError,
  DocumentGraphError,
  DocumentGraphResolutionError,
  DocumentReferenceSyntaxError,
  DocumentResolutionLimitError,
  DocumentSourceError,
  HttpDocumentLoaderError,
  JsonDocumentError,
  MarkdownDocumentError,
} from "./document-graph";
import {
  getAssetQueryRequestError,
  getAssetResourceQueryError,
  type AssetResourceQueryError,
} from "./query-error";
import { DocumentSourceDiagnosticsError } from "./content-source";
import type { AssetQueryDiagnosticIssue } from "./schema";

const createInvalidRequestError = (
  message: string,
  details?: AssetResourceQueryError["details"]
): AssetResourceQueryError => ({
  code: "INVALID_REQUEST",
  message,
  retryable: false,
  ...(details === undefined ? {} : { details }),
  status: 400,
});

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

type AssetQueryErrorDiagnosticContext = Readonly<{
  code: string;
  message: string;
  assetId?: string;
  path?: string;
  line?: number;
  column?: number;
  reference?: string;
  nodeType?: string;
  reason?: string;
  sourceRange?: MdxSourceRange;
}>;

const isReferenceErrorCode = (code: string) =>
  code.includes("REFERENCE") ||
  code.includes("TARGET") ||
  code.includes("CYCLE") ||
  code.includes("SELECTION") ||
  code.includes("ASSEMBLY") ||
  code.includes("REPRESENTATION") ||
  code.includes("FRAGMENT") ||
  code.includes("JSON_PATH") ||
  code.includes("JSON_POINTER") ||
  code.includes("RESOLVED_VALUE") ||
  code === "UNUSED_REFERENCE";

const getAssetQueryErrorDiagnosticContext = (
  error: unknown
): AssetQueryErrorDiagnosticContext | undefined => {
  const mapped = getAssetResourceQueryError(error);
  if (mapped !== undefined && mapped.code !== "INVALID_REQUEST") {
    return;
  }
  let code: string | undefined;
  let message: string | undefined;
  let assetId: string | undefined;
  let path: string | undefined;
  let line: number | undefined;
  let column: number | undefined;
  let reference: string | undefined;
  let nodeType: string | undefined;
  let reason: string | undefined;
  let sourceRange: MdxSourceRange | undefined;
  let recognized = false;
  const visited = new Set<unknown>();
  let current = error;
  while (current !== undefined && visited.has(current) === false) {
    if (current instanceof DocumentResolutionLimitError) {
      return;
    }
    if (current instanceof DocumentSourceCompilationError) {
      if (current.code === "REQUEST_CANCELLED") {
        return;
      }
      recognized = true;
      code = current.code;
      message = current.message;
      assetId ??= current.documentId;
      path ??= current.documentPath;
    } else if (current instanceof DocumentGraphCompilationError) {
      recognized = true;
      code = current.code;
      message = current.message;
      assetId ??= current.sourceDocumentId ?? current.documentIds[0];
      path ??= current.documentPath;
      reference ??= current.referenceId ?? current.documentUrl;
    } else if (current instanceof DocumentGraphResolutionError) {
      if (current.code === "REQUEST_CANCELLED") {
        return;
      }
      recognized = true;
      code = current.code;
      message = current.message;
      assetId ??= current.documentId;
      reference ??= current.referenceId;
    } else if (current instanceof DocumentGraphError) {
      recognized = true;
      code = current.code;
      message = current.message;
      assetId ??= current.documentIds[0];
    } else if (
      current instanceof JsonDocumentError ||
      current instanceof MarkdownDocumentError
    ) {
      recognized = true;
      code = current.code;
      message = current.message;
      reference ??= current.referenceId;
    } else if (current instanceof DocumentReferenceSyntaxError) {
      recognized = true;
      code = current.code;
      message = current.message;
      if (typeof current.value === "string" && current.value.length > 0) {
        reference ??= current.value;
      }
    } else if (current instanceof DocumentSourceError) {
      recognized = true;
      code = current.code;
      message = current.message;
      assetId ??= current.documentId;
    } else if (current instanceof HttpDocumentLoaderError) {
      recognized = true;
      code = current.code;
      message = current.message;
      assetId ??= current.documentId;
    } else if (current instanceof MdxDocumentError) {
      recognized = true;
      code = current.code;
      message = current.message;
      line ??= current.sourceRange?.start.line;
      column ??= current.sourceRange?.start.column;
      nodeType ??= current.nodeType;
      reason ??= current.reason;
      sourceRange ??= current.sourceRange;
    } else if (current instanceof MarkdownMetadataError) {
      recognized = true;
      code = current.code;
      message = current.message;
      line ??= current.line;
      column ??= current.column;
    } else if (recognized && current instanceof Error) {
      // Authenticated diagnostics should preserve the deepest concrete cause.
      message = current.message || message;
    }
    visited.add(current);
    current = current instanceof Error ? current.cause : undefined;
  }
  if (recognized === false || code === undefined || message === undefined) {
    return;
  }
  return {
    code,
    message,
    ...(assetId === undefined ? {} : { assetId }),
    ...(path === undefined ? {} : { path }),
    ...(line === undefined ? {} : { line }),
    ...(column === undefined ? {} : { column }),
    ...(reference === undefined ? {} : { reference }),
    ...(nodeType === undefined ? {} : { nodeType }),
    ...(reason === undefined ? {} : { reason }),
    ...(sourceRange === undefined ? {} : { sourceRange }),
  };
};

export const getAssetQueryErrorDiagnosticIssue = ({
  error,
  pathsByAssetId,
}: {
  error: unknown;
  pathsByAssetId?: ReadonlyMap<string, string>;
}): AssetQueryDiagnosticIssue | undefined => {
  const context = getAssetQueryErrorDiagnosticContext(error);
  const path =
    context?.path ??
    (context?.assetId === undefined
      ? undefined
      : pathsByAssetId?.get(context.assetId));
  if (
    context === undefined ||
    context.assetId === undefined ||
    path === undefined
  ) {
    return;
  }
  return {
    severity: "error",
    scope: "query",
    phase: isReferenceErrorCode(context.code) ? "reference" : "source",
    code: context.code,
    message: context.message,
    assetId: context.assetId,
    path,
    ...(context.line === undefined ? {} : { line: context.line }),
    ...(context.column === undefined ? {} : { column: context.column }),
    ...(context.reference === undefined
      ? {}
      : { reference: context.reference }),
    ...(context.nodeType === undefined ? {} : { nodeType: context.nodeType }),
    ...(context.reason === undefined ? {} : { reason: context.reason }),
    ...(context.sourceRange === undefined
      ? {}
      : { sourceRange: context.sourceRange }),
  };
};

export const getDetailedAssetResourceQueryError = (
  error: unknown
): AssetResourceQueryError | undefined => {
  const requestError = getAssetQueryRequestError(error);
  if (requestError !== undefined) {
    return requestError;
  }
  if (error instanceof DocumentSourceDiagnosticsError) {
    return createInvalidRequestError(error.message, {
      diagnostics: error.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        scope: diagnostic.scope ?? error.scope,
        phase: diagnostic.phase ?? "source",
      })),
    });
  }
  if (error instanceof DocumentSourceCompilationAggregateError) {
    const diagnostics = error.errors.flatMap((nestedError) => {
      const diagnostic = getAssetQueryErrorDiagnosticIssue({
        error: nestedError,
      });
      return diagnostic === undefined ? [] : [diagnostic];
    });
    if (diagnostics.length === error.errors.length) {
      return createInvalidRequestError(error.message, { diagnostics });
    }
    return createInvalidRequestError(error.message, {
      errors: error.errors.map((nestedError) => {
        const context = getAssetQueryErrorDiagnosticContext(nestedError);
        return (
          context ?? {
            code: "DOCUMENT_SOURCE_ERROR",
            message:
              nestedError.message || "Document source compilation failed",
          }
        );
      }),
    });
  }
  const exactDiagnostic = getAssetQueryErrorDiagnosticIssue({ error });
  if (exactDiagnostic !== undefined) {
    return createInvalidRequestError(exactDiagnostic.message, {
      diagnostics: [exactDiagnostic],
    });
  }
  const visited = new Set<unknown>();
  let cause = error;
  while (cause !== undefined && visited.has(cause) === false) {
    if (cause instanceof MdxDocumentError) {
      const details: NonNullable<AssetResourceQueryError["details"]> = {};
      const position = cause.sourceRange?.start;
      if (position !== undefined) {
        details.line = position.line;
        details.column = position.column;
      }
      if (cause.reason !== undefined) {
        details.reason = cause.reason;
      }
      if (cause.nodeType !== undefined) {
        details.nodeType = cause.nodeType;
      }
      if (cause.sourceRange !== undefined) {
        details.sourceRange = cause.sourceRange;
      }
      return createInvalidRequestError(cause.message, details);
    }
    if (
      cause instanceof DocumentSourceCompilationError &&
      cause.code !== "REQUEST_CANCELLED"
    ) {
      const details: NonNullable<AssetResourceQueryError["details"]> = {};
      if (cause.documentId !== undefined) {
        details.assetId = cause.documentId;
      }
      if (cause.documentPath !== undefined) {
        details.path = cause.documentPath;
      }
      if (cause.code !== "DOCUMENT_ANALYSIS_FAILED") {
        return createInvalidRequestError(cause.message, details);
      }
      const sourceError = findNestedSourceError(cause.cause);
      if (sourceError instanceof MdxDocumentError) {
        const position = sourceError.sourceRange?.start;
        if (position !== undefined) {
          details.line = position.line;
          details.column = position.column;
        }
        if (sourceError.reason !== undefined) {
          details.reason = sourceError.reason;
        }
        if (sourceError.nodeType !== undefined) {
          details.nodeType = sourceError.nodeType;
        }
        if (sourceError.sourceRange !== undefined) {
          details.sourceRange = sourceError.sourceRange;
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
        return createInvalidRequestError(sourceError.message, details);
      }
      return createInvalidRequestError(cause.message, details);
    }
    visited.add(cause);
    cause = cause instanceof Error ? cause.cause : undefined;
  }
  const graphContext = getAssetQueryErrorDiagnosticContext(error);
  if (graphContext !== undefined) {
    const diagnostic = getAssetQueryErrorDiagnosticIssue({ error });
    if (diagnostic !== undefined) {
      return createInvalidRequestError(graphContext.message, {
        diagnostics: [diagnostic],
      });
    }
    return createInvalidRequestError(graphContext.message, {
      code: graphContext.code,
      ...(graphContext.assetId === undefined
        ? {}
        : { assetId: graphContext.assetId }),
      ...(graphContext.reference === undefined
        ? {}
        : { reference: graphContext.reference }),
      ...(graphContext.nodeType === undefined
        ? {}
        : { nodeType: graphContext.nodeType }),
      ...(graphContext.reason === undefined
        ? {}
        : { reason: graphContext.reason }),
      ...(graphContext.sourceRange === undefined
        ? {}
        : { sourceRange: graphContext.sourceRange }),
    });
  }
  return getAssetResourceQueryError(error);
};
