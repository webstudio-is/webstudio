import { mapBounded } from "../async-utils";
import type { ByteSource } from "../byte-stream";
import { contentEngineLimits } from "../limits";
import { compareStrings } from "../canonical-json";
import { compileDocumentGraph, type DocumentDescriptor } from "./compiler";
import { analyzeDocumentSource, type DocumentFormat } from "./document-adapter";
import type { DocumentGraph } from "./graph";
import type { SourceReferenceOccurrence } from "./reference-codec";

export type DocumentSourceDescriptor = DocumentDescriptor &
  Readonly<{
    format: DocumentFormat;
    source: ByteSource;
  }>;

export type DocumentSourceCompilationErrorCode =
  | "REQUEST_CANCELLED"
  | "ROOT_NOT_FOUND"
  | "DOCUMENT_ANALYSIS_FAILED";

export class DocumentSourceCompilationError extends Error {
  readonly code: DocumentSourceCompilationErrorCode;
  readonly documentId?: string;

  constructor({
    code,
    message,
    documentId,
    cause,
  }: {
    code: DocumentSourceCompilationErrorCode;
    message: string;
    documentId?: string;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "DocumentSourceCompilationError";
    this.code = code;
    this.documentId = documentId;
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
  signal,
}: {
  documents: readonly DocumentSourceDescriptor[];
  rootIds?: readonly string[];
  concurrency?: number;
  maximumBytes?: number;
  signal?: AbortSignal;
}): Promise<DocumentGraph> => {
  assertActive(signal);
  // Validate the complete catalog without reading document payloads.
  compileDocumentGraph({ documents, references: [] });
  const documentsById = new Map(
    documents.map((document) => [document.id, document])
  );
  const documentsByUrl = new Map(
    documents.map((document) => [new URL(document.documentUrl).href, document])
  );
  const pendingIds = new Set(rootIds ?? documents.map(({ id }) => id));
  const analyzedIds = new Set<string>();
  const references: SourceReferenceOccurrence[] = [];

  while (pendingIds.size > 0) {
    const frontier = [...pendingIds].sort(compareStrings);
    pendingIds.clear();
    const analyzed = await mapBounded(
      frontier,
      concurrency,
      async (documentId) => {
        const document = documentsById.get(documentId);
        if (document === undefined) {
          throw new DocumentSourceCompilationError({
            code: "ROOT_NOT_FOUND",
            message: `Document source graph root ${documentId} does not exist`,
            documentId,
          });
        }
        assertActive(signal);
        try {
          const result = await analyzeDocumentSource({
            format: document.format,
            source: document.source,
            sourceDocumentId: document.id,
            documentUrl: document.documentUrl,
            maximumBytes,
          });
          return { document, references: result.references };
        } catch (cause) {
          assertActive(signal);
          throw new DocumentSourceCompilationError({
            code: "DOCUMENT_ANALYSIS_FAILED",
            message: `Document ${document.id} could not be analyzed`,
            documentId: document.id,
            cause,
          });
        }
      }
    );
    for (const { document } of analyzed) {
      analyzedIds.add(document.id);
    }
    for (const result of analyzed) {
      references.push(...result.references);
      for (const occurrence of result.references) {
        const target = documentsByUrl.get(occurrence.reference.documentUrl);
        if (target !== undefined && analyzedIds.has(target.id) === false) {
          pendingIds.add(target.id);
        }
      }
    }
  }
  assertActive(signal);
  return compileDocumentGraph({
    documents: documents.filter(({ id }) => analyzedIds.has(id)),
    references,
  });
};
