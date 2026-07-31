import {
  createDocumentGraph,
  DocumentGraphError,
  getDocumentGraphClosure,
  type DocumentGraph,
} from "./graph";
import type { SourceReferenceOccurrence } from "./reference-codec";

export type DocumentDescriptor = Readonly<{
  id: string;
  documentUrl: string;
  revision: string;
  contentRef: string;
}>;

export type DocumentGraphCompilationErrorCode =
  | "INVALID_DOCUMENT_URL"
  | "INVALID_REFERENCE_URL"
  | "DUPLICATE_DOCUMENT_ID"
  | "DUPLICATE_DOCUMENT_URL"
  | "SOURCE_NOT_FOUND"
  | "TARGET_NOT_FOUND"
  | "INVALID_GRAPH"
  | "CYCLE";

export class DocumentGraphCompilationError extends Error {
  readonly code: DocumentGraphCompilationErrorCode;
  readonly sourceDocumentId?: string;
  readonly referenceId?: string;
  readonly documentUrl?: string;
  readonly documentIds: readonly string[];

  constructor({
    code,
    message,
    sourceDocumentId,
    referenceId,
    documentUrl,
    documentIds = [],
    cause,
  }: {
    code: DocumentGraphCompilationErrorCode;
    message: string;
    sourceDocumentId?: string;
    referenceId?: string;
    documentUrl?: string;
    documentIds?: readonly string[];
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "DocumentGraphCompilationError";
    this.code = code;
    this.sourceDocumentId = sourceDocumentId;
    this.referenceId = referenceId;
    this.documentUrl = documentUrl;
    this.documentIds = Object.freeze([...documentIds]);
  }
}

const compareStrings = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

const getCanonicalDocumentUrl = ({
  documentUrl,
  documentId,
  occurrence,
}: {
  documentUrl: string;
  documentId?: string;
  occurrence?: SourceReferenceOccurrence;
}) => {
  let url: URL;
  try {
    url = new URL(documentUrl);
  } catch (cause) {
    throw new DocumentGraphCompilationError({
      code:
        occurrence === undefined
          ? "INVALID_DOCUMENT_URL"
          : "INVALID_REFERENCE_URL",
      message:
        occurrence === undefined
          ? `Document ${documentId} URL must be absolute`
          : `Document ${occurrence.sourceDocumentId} reference ${occurrence.referenceId} target URL must be absolute`,
      sourceDocumentId: occurrence?.sourceDocumentId,
      referenceId: occurrence?.referenceId,
      documentUrl,
      documentIds: documentId === undefined ? [] : [documentId],
      cause,
    });
  }
  if (url.hash !== "") {
    throw new DocumentGraphCompilationError({
      code:
        occurrence === undefined
          ? "INVALID_DOCUMENT_URL"
          : "INVALID_REFERENCE_URL",
      message:
        occurrence === undefined
          ? `Document ${documentId} URL must not contain a fragment`
          : `Document ${occurrence.sourceDocumentId} reference ${occurrence.referenceId} target URL must not contain a fragment`,
      sourceDocumentId: occurrence?.sourceDocumentId,
      referenceId: occurrence?.referenceId,
      documentUrl,
      documentIds: documentId === undefined ? [] : [documentId],
    });
  }
  return url.href;
};

const compareReferences = (
  left: SourceReferenceOccurrence,
  right: SourceReferenceOccurrence
) =>
  compareStrings(left.sourceDocumentId, right.sourceDocumentId) ||
  compareStrings(left.referenceId, right.referenceId) ||
  compareStrings(left.reference.documentUrl, right.reference.documentUrl);

/** Resolves parsed source references into a validated, storage-independent graph. */
export const compileDocumentGraph = ({
  documents: documentInputs,
  references: referenceInputs,
}: {
  documents: readonly DocumentDescriptor[];
  references: readonly SourceReferenceOccurrence[];
}): DocumentGraph => {
  const documents = [...documentInputs]
    .sort(
      (left, right) =>
        compareStrings(left.id, right.id) ||
        compareStrings(left.documentUrl, right.documentUrl) ||
        compareStrings(left.revision, right.revision) ||
        compareStrings(left.contentRef, right.contentRef)
    )
    .map((document) => ({
      ...document,
      documentUrl: getCanonicalDocumentUrl({
        documentUrl: document.documentUrl,
        documentId: document.id,
      }),
    }));
  const documentsById = new Map<string, DocumentDescriptor>();
  const documentsByUrl = new Map<string, DocumentDescriptor>();
  for (const document of documents) {
    if (documentsById.has(document.id)) {
      throw new DocumentGraphCompilationError({
        code: "DUPLICATE_DOCUMENT_ID",
        message: `Document catalog contains duplicate ID ${document.id}`,
        documentIds: [document.id],
      });
    }
    documentsById.set(document.id, document);
    const previous = documentsByUrl.get(document.documentUrl);
    if (previous !== undefined) {
      throw new DocumentGraphCompilationError({
        code: "DUPLICATE_DOCUMENT_URL",
        message: `Documents ${previous.id} and ${document.id} have the same canonical URL`,
        documentUrl: document.documentUrl,
        documentIds: [previous.id, document.id],
      });
    }
    documentsByUrl.set(document.documentUrl, document);
  }

  const edges = [...referenceInputs]
    .sort(compareReferences)
    .map((occurrence) => {
      if (documentsById.has(occurrence.sourceDocumentId) === false) {
        throw new DocumentGraphCompilationError({
          code: "SOURCE_NOT_FOUND",
          message: `Document graph source ${occurrence.sourceDocumentId} does not exist`,
          sourceDocumentId: occurrence.sourceDocumentId,
          referenceId: occurrence.referenceId,
          documentIds: [occurrence.sourceDocumentId],
        });
      }
      const documentUrl = getCanonicalDocumentUrl({
        documentUrl: occurrence.reference.documentUrl,
        occurrence,
      });
      const target = documentsByUrl.get(documentUrl);
      if (target === undefined) {
        throw new DocumentGraphCompilationError({
          code: "TARGET_NOT_FOUND",
          message: `Document ${occurrence.sourceDocumentId} reference ${occurrence.referenceId} target does not exist`,
          sourceDocumentId: occurrence.sourceDocumentId,
          referenceId: occurrence.referenceId,
          documentUrl,
          documentIds: [occurrence.sourceDocumentId],
        });
      }
      return {
        sourceId: occurrence.sourceDocumentId,
        referenceId: occurrence.referenceId,
        reference: {
          documentId: target.id,
          revision: target.revision,
          representation: occurrence.reference.representation,
        },
      };
    });

  let graph: DocumentGraph;
  try {
    graph = createDocumentGraph({
      nodes: documents.map(({ id, revision, contentRef }) => ({
        id,
        revision,
        contentRef,
      })),
      edges,
    });
  } catch (cause) {
    throw new DocumentGraphCompilationError({
      code: "INVALID_GRAPH",
      message: "Compiled document graph is invalid",
      documentIds: cause instanceof DocumentGraphError ? cause.documentIds : [],
      cause,
    });
  }

  try {
    getDocumentGraphClosure({
      graph,
      rootIds: graph.nodes.map(({ id }) => id),
    });
  } catch (cause) {
    if (cause instanceof DocumentGraphError && cause.code === "CYCLE") {
      throw new DocumentGraphCompilationError({
        code: "CYCLE",
        message: cause.message,
        documentIds: cause.documentIds,
        cause,
      });
    }
    throw cause;
  }
  return graph;
};
