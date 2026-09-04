import { mapBounded } from "../async-utils";
import type { ByteSource } from "../byte-stream";
import { contentEngineLimits } from "../limits";
import { compareStrings } from "../canonical-json";
import {
  compileDocumentGraph,
  DocumentGraphCompilationError,
  type DocumentDescriptor,
} from "./compiler";
import {
  analyzeDocumentSource,
  getAdaptedDocumentProperties,
} from "./document-adapter";
import type { DocumentFormat } from "./document-format";
import type { DocumentGraph } from "./graph";
import type { SourceReferenceOccurrence } from "./reference-codec";

export type DocumentSourceDescriptor = DocumentDescriptor &
  Readonly<{
    format: DocumentFormat;
    source: ByteSource;
  }>;

export const createDocumentSourceUrl = (path: string) =>
  new URL(
    path.split("/").map(encodeURIComponent).join("/"),
    "https://content.webstudio.local/"
  ).href;

export type DocumentSourceCompilationErrorCode =
  | "REQUEST_CANCELLED"
  | "ROOT_NOT_FOUND"
  | "DOCUMENT_ANALYSIS_FAILED";

export class DocumentSourceCompilationError extends Error {
  readonly code: DocumentSourceCompilationErrorCode;
  readonly documentId?: string;
  readonly documentPath?: string;

  constructor({
    code,
    message,
    documentId,
    documentPath,
    cause,
  }: {
    code: DocumentSourceCompilationErrorCode;
    message: string;
    documentId?: string;
    documentPath?: string;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "DocumentSourceCompilationError";
    this.code = code;
    this.documentId = documentId;
    this.documentPath = documentPath;
  }
}

export class DocumentSourceCompilationAggregateError extends Error {
  readonly errors: readonly (
    | DocumentSourceCompilationError
    | DocumentGraphCompilationError
  )[];

  constructor(
    errors: readonly (
      | DocumentSourceCompilationError
      | DocumentGraphCompilationError
    )[]
  ) {
    super(
      `${errors.length} document source ${
        errors.length === 1 ? "error" : "errors"
      } found`
    );
    this.name = "DocumentSourceCompilationAggregateError";
    this.errors = Object.freeze([...errors]);
  }
}

const assertActive = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) {
    throw new DocumentSourceCompilationError({
      code: "REQUEST_CANCELLED",
      message: "Document source graph compilation was cancelled",
      cause: signal.reason,
    });
  }
};

/** Discovers references from bounded sources, then compiles graph metadata only. */
export const compileDocumentSourceGraph = async ({
  documents,
  rootIds,
  concurrency = contentEngineLimits.concurrentContentReads,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
  ignoredReferenceUrls,
  ignoreReference,
  onDocumentProperties,
  signal,
}: {
  documents: readonly DocumentSourceDescriptor[];
  rootIds?: readonly string[];
  concurrency?: number;
  maximumBytes?: number;
  ignoredReferenceUrls?: ReadonlySet<string>;
  ignoreReference?: (occurrence: SourceReferenceOccurrence) => boolean;
  onDocumentProperties?: (input: {
    id: string;
    properties: Readonly<Record<string, unknown>>;
  }) => void;
  signal?: AbortSignal;
}): Promise<DocumentGraph> => {
  assertActive(signal);
  const getDocumentPath = (documentId: string | undefined) => {
    const document =
      documentId === undefined
        ? undefined
        : documents.find(({ id }) => id === documentId);
    if (document === undefined) {
      return;
    }
    if (document.documentPath !== undefined) {
      return document.documentPath;
    }
    try {
      return decodeURIComponent(
        new URL(document.documentUrl).pathname.slice(1)
      );
    } catch {
      return;
    }
  };
  const compileGraph = (
    input: Parameters<typeof compileDocumentGraph>[0]
  ): DocumentGraph => {
    try {
      return compileDocumentGraph(input);
    } catch (error) {
      if (
        error instanceof DocumentGraphCompilationError &&
        error.documentPath === undefined
      ) {
        throw new DocumentGraphCompilationError({
          code: error.code,
          message: error.message,
          sourceDocumentId: error.sourceDocumentId,
          referenceId: error.referenceId,
          documentUrl: error.documentUrl,
          documentPath: getDocumentPath(
            error.sourceDocumentId ?? error.documentIds[0]
          ),
          documentIds: error.documentIds,
          cause: error.cause,
        });
      }
      throw error;
    }
  };
  // A scoped query must not fail because of duplicate or malformed catalog
  // entries that cannot be reached from its roots.
  const selectedRootIds = rootIds === undefined ? undefined : new Set(rootIds);
  compileGraph({
    documents:
      selectedRootIds === undefined
        ? documents
        : documents.filter(({ id }) => selectedRootIds.has(id)),
    references: [],
  });
  const documentsById = new Map(
    documents.map((document) => [document.id, document])
  );
  const documentsByUrl = new Map<string, DocumentSourceDescriptor[]>();
  for (const document of documents) {
    let documentUrl: string;
    try {
      documentUrl = new URL(document.documentUrl).href;
    } catch {
      // Invalid unreachable descriptors are outside a scoped compilation.
      // A selected root is validated above and a referenced target is
      // reported as missing below.
      continue;
    }
    const values = documentsByUrl.get(documentUrl) ?? [];
    values.push(document);
    documentsByUrl.set(documentUrl, values);
  }
  const pendingIds = new Set(rootIds ?? documents.map(({ id }) => id));
  const analyzedIds = new Set<string>();
  const failedIds = new Set<string>();
  const references: SourceReferenceOccurrence[] = [];
  const compilationErrors: Array<
    DocumentSourceCompilationError | DocumentGraphCompilationError
  > = [];

  while (pendingIds.size > 0) {
    const frontier = [...pendingIds].sort(compareStrings);
    pendingIds.clear();
    const settlements = await mapBounded(
      frontier,
      concurrency,
      async (documentId) => {
        try {
          const document = documentsById.get(documentId);
          if (document === undefined) {
            throw new DocumentSourceCompilationError({
              code: "ROOT_NOT_FOUND",
              message: `Document source graph root ${documentId} does not exist`,
              documentId,
            });
          }
          assertActive(signal);
          const result = await analyzeDocumentSource({
            format: document.format,
            source: document.source,
            sourceDocumentId: document.id,
            documentUrl: document.documentUrl,
            maximumBytes,
          });
          return {
            status: "fulfilled" as const,
            value: { document, analyzedDocument: result },
          };
        } catch (cause) {
          assertActive(signal);
          if (cause instanceof DocumentSourceCompilationError) {
            return { status: "rejected" as const, reason: cause, documentId };
          }
          const document = documentsById.get(documentId);
          return {
            status: "rejected" as const,
            reason: new DocumentSourceCompilationError({
              code: "DOCUMENT_ANALYSIS_FAILED",
              message: `Document ${documentId} could not be analyzed`,
              documentId,
              documentPath:
                document === undefined
                  ? undefined
                  : getDocumentPath(document.id),
              cause,
            }),
            documentId,
          };
        }
      }
    );
    const analyzed = settlements.flatMap((settlement) => {
      if (settlement.status === "fulfilled") {
        return [settlement.value];
      }
      failedIds.add(settlement.documentId);
      compilationErrors.push(settlement.reason);
      return [];
    });
    for (const { document, analyzedDocument } of analyzed) {
      analyzedIds.add(document.id);
      const properties = getAdaptedDocumentProperties(analyzedDocument);
      if (properties !== undefined) {
        onDocumentProperties?.({ id: document.id, properties });
      }
    }
    for (const result of analyzed) {
      for (const occurrence of result.analyzedDocument.references) {
        if (
          ignoredReferenceUrls?.has(occurrence.reference.documentUrl) ||
          ignoreReference?.(occurrence) === true
        ) {
          continue;
        }
        const targets = documentsByUrl.get(occurrence.reference.documentUrl);
        if (targets !== undefined && targets.length > 1) {
          compilationErrors.push(
            new DocumentGraphCompilationError({
              code: "DUPLICATE_DOCUMENT_URL",
              message: `Documents ${targets.map(({ id }) => id).join(" and ")} have the same canonical URL`,
              sourceDocumentId: occurrence.sourceDocumentId,
              referenceId: occurrence.referenceId,
              documentUrl: occurrence.reference.documentUrl,
              documentPath: getDocumentPath(occurrence.sourceDocumentId),
              documentIds: targets.map(({ id }) => id),
            })
          );
          continue;
        }
        const target = targets?.[0];
        if (target === undefined) {
          compilationErrors.push(
            new DocumentGraphCompilationError({
              code: "TARGET_NOT_FOUND",
              message: `Document ${occurrence.sourceDocumentId} reference ${occurrence.referenceId} target does not exist`,
              sourceDocumentId: occurrence.sourceDocumentId,
              referenceId: occurrence.referenceId,
              documentUrl: occurrence.reference.documentUrl,
              documentPath: getDocumentPath(occurrence.sourceDocumentId),
              documentIds: [occurrence.sourceDocumentId],
            })
          );
          continue;
        }
        references.push(occurrence);
        if (
          analyzedIds.has(target.id) === false &&
          failedIds.has(target.id) === false
        ) {
          pendingIds.add(target.id);
        }
      }
    }
  }
  assertActive(signal);
  if (compilationErrors.length === 1) {
    throw compilationErrors[0];
  }
  if (compilationErrors.length > 0) {
    throw new DocumentSourceCompilationAggregateError(compilationErrors);
  }
  return compileGraph({
    documents: documents.filter(({ id }) => analyzedIds.has(id)),
    references,
  });
};
