import type { AssetQueryResult, ContentDatabaseDocument } from "../schema";
import type { DocumentGraph } from "./graph";

export type DocumentGraphRootSelectionErrorCode =
  | "DOCUMENT_IDENTITY_UNAVAILABLE"
  | "DOCUMENT_IDENTITY_STALE";

export class DocumentGraphRootSelectionError extends Error {
  readonly code: DocumentGraphRootSelectionErrorCode;
  readonly documentId: string;

  constructor({
    code,
    message,
    documentId,
  }: {
    code: DocumentGraphRootSelectionErrorCode;
    message: string;
    documentId: string;
  }) {
    super(message);
    this.name = "DocumentGraphRootSelectionError";
    this.code = code;
    this.documentId = documentId;
  }
}

/** Maps public Assets query items back to revisioned graph roots. */
export const selectAssetQueryDocumentGraphRoots = ({
  graph,
  documents,
  result,
}: {
  graph: DocumentGraph;
  documents: readonly ContentDatabaseDocument[];
  result: AssetQueryResult;
}): readonly string[] => {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const documentsById = new Map(
    documents.map((document) => [document._id, document])
  );
  const rootIds = new Set<string>();
  for (const item of result.items) {
    const node = nodesById.get(item.id);
    if (node === undefined || rootIds.has(item.id)) {
      continue;
    }
    const document = documentsById.get(item.id);
    if (
      document === undefined ||
      typeof document.revision !== "string" ||
      typeof document.contentRef !== "string"
    ) {
      throw new DocumentGraphRootSelectionError({
        code: "DOCUMENT_IDENTITY_UNAVAILABLE",
        message: `Selected document ${item.id} has no query identity`,
        documentId: item.id,
      });
    }
    if (
      document.revision !== node.revision ||
      document.contentRef !== node.contentRef
    ) {
      throw new DocumentGraphRootSelectionError({
        code: "DOCUMENT_IDENTITY_STALE",
        message: `Selected document ${item.id} identity does not match its graph`,
        documentId: item.id,
      });
    }
    rootIds.add(item.id);
  }
  return Object.freeze([...rootIds]);
};
