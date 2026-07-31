import { mapBounded } from "../async-utils";
import type { ByteSource } from "../byte-stream";
import { contentEngineLimits } from "../limits";
import { compileDocumentGraph, type DocumentDescriptor } from "./compiler";
import { analyzeDocumentSource, type DocumentFormat } from "./document-adapter";
import type { DocumentGraph } from "./graph";

export type DocumentSourceDescriptor = DocumentDescriptor &
  Readonly<{
    format: DocumentFormat;
    source: ByteSource;
  }>;

export type DocumentSourceCompilationErrorCode =
  | "REQUEST_CANCELLED"
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
  concurrency = contentEngineLimits.concurrentContentReads,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
  signal,
}: {
  documents: readonly DocumentSourceDescriptor[];
  concurrency?: number;
  maximumBytes?: number;
  signal?: AbortSignal;
}): Promise<DocumentGraph> => {
  assertActive(signal);
  const analyzed = await mapBounded(
    documents,
    concurrency,
    async (document) => {
      assertActive(signal);
      try {
        return await analyzeDocumentSource({
          format: document.format,
          source: document.source,
          sourceDocumentId: document.id,
          documentUrl: document.documentUrl,
          maximumBytes,
        });
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
  assertActive(signal);
  return compileDocumentGraph({
    documents,
    references: analyzed.flatMap(({ references }) => references),
  });
};
