import { serializeJsonDeterministically } from "./canonical-json";
import type {
  ContentArtifactV1,
  ContentDatabaseDocument,
  MaterializedAssetQuery,
} from "./schema";
import {
  createDocumentGraph,
  type DocumentGraph,
  type DocumentGraphNode,
  type DocumentRepresentation,
} from "./document-graph";
import type { MarkdownAssetReferences } from "./markdown-references";

type RuntimeDocumentGraphEdge = Readonly<{
  sourceId: string;
  referenceId: string;
  documentId: string;
  representation: DocumentRepresentation;
}>;

export type ContentRuntimeArtifact = Readonly<{
  revision: string;
  documents: readonly ContentDatabaseDocument[];
  documentGraph?: Readonly<{
    nodes: readonly DocumentGraphNode[];
    edges: readonly RuntimeDocumentGraphEdge[];
  }>;
  contents?: Readonly<Record<string, string>>;
  assetReferences?: MarkdownAssetReferences;
  queries?: Readonly<Record<string, MaterializedAssetQuery>>;
}>;

const getInlineDocumentIds = (artifact: ContentArtifactV1) => {
  const documentIds = new Set(
    artifact.documents
      .filter(({ properties }) => properties !== undefined)
      .map(({ _id }) => _id)
  );
  const targetIds = new Set(
    artifact.documentGraph?.edges.map(({ reference }) => reference.documentId)
  );
  return new Set(
    artifact.documentGraph?.nodes.flatMap((node) =>
      node.format === "json" &&
      documentIds.has(node.id) &&
      targetIds.has(node.id) === false
        ? [node.id]
        : []
    )
  );
};

/** Projects the verified build artifact to the data executed in a Worker. */
export const createContentRuntimeArtifact = (
  artifact: ContentArtifactV1
): ContentRuntimeArtifact => {
  const inlineDocumentIds = getInlineDocumentIds(artifact);
  const documentGraph =
    artifact.documentGraph === undefined
      ? undefined
      : {
          nodes: artifact.documentGraph.nodes.filter(
            ({ id }) => inlineDocumentIds.has(id) === false
          ),
          edges: artifact.documentGraph.edges.map(
            ({ sourceId, referenceId, reference }) => ({
              sourceId,
              referenceId,
              documentId: reference.documentId,
              representation: reference.representation,
            })
          ),
        };
  return {
    revision: artifact.integrity.checksum,
    documents: artifact.documents,
    ...(documentGraph === undefined ? {} : { documentGraph }),
    ...(artifact.contents === undefined ? {} : { contents: artifact.contents }),
    ...(artifact.assetReferences === undefined
      ? {}
      : { assetReferences: artifact.assetReferences }),
    ...(artifact.queries === undefined ? {} : { queries: artifact.queries }),
  };
};

export const serializeContentRuntimeArtifact = (
  artifact: ContentRuntimeArtifact
) => serializeJsonDeterministically(artifact);

export const getContentRuntimeArtifactRuntimeAssetIds = ({
  artifact,
  includeDocuments,
}: {
  artifact: ContentRuntimeArtifact;
  includeDocuments: boolean;
}) => {
  const ids = new Set(
    Object.values(artifact.assetReferences ?? {})
      .flat()
      .map(({ assetId }) => assetId)
  );
  if (includeDocuments) {
    for (const { _id } of artifact.documents) {
      ids.add(_id);
    }
  }
  for (const { id } of artifact.documentGraph?.nodes ?? []) {
    ids.add(id);
  }
  return [...ids].sort();
};

export const restoreContentRuntimeDocumentGraph = ({
  artifact,
}: {
  artifact: ContentRuntimeArtifact;
}):
  | Readonly<{
      graph: DocumentGraph;
      inlineDocuments: ReadonlyMap<string, ContentDatabaseDocument>;
    }>
  | undefined => {
  if (artifact.documentGraph === undefined) {
    return;
  }
  const documentsById = new Map(
    artifact.documents.map((document) => [document._id, document])
  );
  const nodesById = new Map(
    artifact.documentGraph.nodes.map((node) => [node.id, node])
  );
  const inlineDocuments = new Map<string, ContentDatabaseDocument>();
  for (const { sourceId } of artifact.documentGraph.edges) {
    if (nodesById.has(sourceId)) {
      continue;
    }
    const document = documentsById.get(sourceId);
    if (document?.properties === undefined) {
      throw new Error(
        `Runtime document graph source ${sourceId} is unavailable`
      );
    }
    inlineDocuments.set(sourceId, document);
    nodesById.set(sourceId, {
      id: sourceId,
      revision: sourceId,
      contentRef: sourceId,
      format: "json",
    });
  }
  const graph = createDocumentGraph({
    nodes: [...nodesById.values()],
    edges: artifact.documentGraph.edges.map(
      ({ sourceId, referenceId, documentId, representation }) => {
        const target = nodesById.get(documentId);
        if (target === undefined) {
          throw new Error(
            `Runtime document graph target ${documentId} is unavailable`
          );
        }
        return {
          sourceId,
          referenceId,
          reference: {
            documentId,
            revision: target.revision,
            representation,
          },
        };
      }
    ),
  });
  return { graph, inlineDocuments };
};
