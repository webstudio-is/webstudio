import type { ByteSource } from "../byte-stream";
import type { DocumentFormat } from "./document-format";
import type { DocumentGraphNode } from "./graph";

export type DocumentSource = Readonly<{
  format: DocumentFormat;
  revision: string;
  source: ByteSource;
}>;

export type DocumentSourceLoader = (
  node: DocumentGraphNode,
  options: { signal?: AbortSignal }
) => Promise<DocumentSource>;

export class DocumentSourceError extends Error {
  readonly code: "REVISION_MISMATCH" | "FORMAT_MISMATCH";
  readonly documentId: string;
  readonly expectedRevision?: string;
  readonly actualRevision?: string;
  readonly expectedFormat?: DocumentFormat;
  readonly actualFormat?: DocumentFormat;

  constructor({
    code,
    documentId,
    expectedRevision,
    actualRevision,
    expectedFormat,
    actualFormat,
  }: {
    code: "REVISION_MISMATCH" | "FORMAT_MISMATCH";
    documentId: string;
    expectedRevision?: string;
    actualRevision?: string;
    expectedFormat?: DocumentFormat;
    actualFormat?: DocumentFormat;
  }) {
    super(
      `Document ${documentId} source ${code === "REVISION_MISMATCH" ? "revision" : "format"} does not match its graph`
    );
    this.name = "DocumentSourceError";
    this.code = code;
    this.documentId = documentId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
    this.expectedFormat = expectedFormat;
    this.actualFormat = actualFormat;
  }
}

/** Prevents graph metadata and a loaded source with another identity from mixing. */
export const assertDocumentSourceIdentity = ({
  node,
  source,
}: {
  node: DocumentGraphNode;
  source: DocumentSource;
}) => {
  if (source.revision !== node.revision) {
    throw new DocumentSourceError({
      code: "REVISION_MISMATCH",
      documentId: node.id,
      expectedRevision: node.revision,
      actualRevision: source.revision,
    });
  }
  if (node.format !== undefined && source.format !== node.format) {
    throw new DocumentSourceError({
      code: "FORMAT_MISMATCH",
      documentId: node.id,
      expectedFormat: node.format,
      actualFormat: source.format,
    });
  }
  return source;
};
