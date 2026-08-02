import type { DocumentGraphEdge } from "./graph";

export const getDocumentGraphEdgesBySourceId = (
  edges: readonly DocumentGraphEdge[]
) => {
  const result = new Map<string, DocumentGraphEdge[]>();
  for (const edge of edges) {
    const sourceEdges = result.get(edge.sourceId) ?? [];
    sourceEdges.push(edge);
    result.set(edge.sourceId, sourceEdges);
  }
  return result;
};
