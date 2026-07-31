import type { ByteSource } from "../byte-stream";
import type { DocumentFormat } from "./document-adapter";
import type { DocumentGraphNode } from "./graph";

export type DocumentSource = Readonly<{
  format: DocumentFormat;
  revision: string;
  source: ByteSource;
}>;

export class DocumentSourceError extends Error {
  readonly code = "REVISION_MISMATCH";
  readonly documentId: string;
  readonly expectedRevision: string;
  readonly actualRevision: string;

  constructor({
    documentId,
    expectedRevision,
    actualRevision,
  }: {
    documentId: string;
    expectedRevision: string;
    actualRevision: string;
  }) {
    super(`Document ${documentId} source revision does not match its graph`);
    this.name = "DocumentSourceError";
    this.documentId = documentId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

/** Prevents graph metadata and loaded source bytes from different revisions mixing. */
export const assertDocumentSourceRevision = ({
  node,
  source,
}: {
  node: DocumentGraphNode;
  source: DocumentSource;
}) => {
  if (source.revision !== node.revision) {
    throw new DocumentSourceError({
      documentId: node.id,
      expectedRevision: node.revision,
      actualRevision: source.revision,
    });
  }
  return source;
};
