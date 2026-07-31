import { compareStrings } from "../canonical-json";
import { createDocumentReference, type DocumentReference } from "./reference";
import {
  documentGraphEdgeSchema,
  documentGraphNodeSchema,
} from "./graph-schema";
import { getDocumentGraphEdgesBySourceId } from "./graph-utils";

export type DocumentGraphNode = Readonly<{
  id: string;
  revision: string;
  contentRef: string;
  format?: "json" | "markdown";
}>;

export type DocumentGraphEdge = Readonly<{
  sourceId: string;
  referenceId: string;
  reference: DocumentReference;
}>;

export type DocumentGraph = Readonly<{
  nodes: readonly DocumentGraphNode[];
  edges: readonly DocumentGraphEdge[];
}>;

export type DocumentGraphErrorCode =
  | "DUPLICATE_NODE"
  | "CONTENT_IDENTITY_CONFLICT"
  | "DUPLICATE_REFERENCE"
  | "SOURCE_NOT_FOUND"
  | "TARGET_NOT_FOUND"
  | "TARGET_REVISION_MISMATCH"
  | "ROOT_NOT_FOUND"
  | "CYCLE";

export class DocumentGraphError extends Error {
  readonly code: DocumentGraphErrorCode;
  readonly documentIds: readonly string[];

  constructor({
    code,
    message,
    documentIds = [],
  }: {
    code: DocumentGraphErrorCode;
    message: string;
    documentIds?: readonly string[];
  }) {
    super(message);
    this.name = "DocumentGraphError";
    this.code = code;
    this.documentIds = Object.freeze([...documentIds]);
  }
}

const compareEdges = (left: DocumentGraphEdge, right: DocumentGraphEdge) =>
  compareStrings(left.sourceId, right.sourceId) ||
  compareStrings(left.referenceId, right.referenceId);

export const createDocumentGraph = ({
  nodes: nodeInputs,
  edges: edgeInputs,
}: {
  nodes: readonly unknown[];
  edges: readonly unknown[];
}): DocumentGraph => {
  const nodes = nodeInputs
    .map((input) => Object.freeze(documentGraphNodeSchema.parse(input)))
    .sort((left, right) => compareStrings(left.id, right.id));
  const nodesById = new Map<string, DocumentGraphNode>();
  const nodesByContentRef = new Map<string, DocumentGraphNode>();
  for (const node of nodes) {
    if (nodesById.has(node.id)) {
      throw new DocumentGraphError({
        code: "DUPLICATE_NODE",
        message: `Document graph contains duplicate node ${node.id}`,
        documentIds: [node.id],
      });
    }
    nodesById.set(node.id, node);
    const previousContent = nodesByContentRef.get(node.contentRef);
    if (
      previousContent !== undefined &&
      (previousContent.revision !== node.revision ||
        previousContent.format !== node.format)
    ) {
      throw new DocumentGraphError({
        code: "CONTENT_IDENTITY_CONFLICT",
        message: `Document graph content reference ${node.contentRef} has conflicting identities`,
        documentIds: [previousContent.id, node.id],
      });
    }
    nodesByContentRef.set(node.contentRef, node);
  }

  const edges = edgeInputs
    .map((input) => {
      const edge = documentGraphEdgeSchema.parse(input);
      return Object.freeze({
        ...edge,
        reference: createDocumentReference(edge.reference),
      });
    })
    .sort(compareEdges);
  const referenceKeys = new Set<string>();
  for (const edge of edges) {
    const source = nodesById.get(edge.sourceId);
    if (source === undefined) {
      throw new DocumentGraphError({
        code: "SOURCE_NOT_FOUND",
        message: `Document graph source ${edge.sourceId} does not exist`,
        documentIds: [edge.sourceId],
      });
    }
    const target = nodesById.get(edge.reference.documentId);
    if (target === undefined) {
      throw new DocumentGraphError({
        code: "TARGET_NOT_FOUND",
        message: `Document graph target ${edge.reference.documentId} does not exist`,
        documentIds: [edge.sourceId, edge.reference.documentId],
      });
    }
    if (target.revision !== edge.reference.revision) {
      throw new DocumentGraphError({
        code: "TARGET_REVISION_MISMATCH",
        message: `Document graph target ${target.id} revision does not match its reference`,
        documentIds: [edge.sourceId, target.id],
      });
    }
    const referenceKey = `${edge.sourceId}\0${edge.referenceId}`;
    if (referenceKeys.has(referenceKey)) {
      throw new DocumentGraphError({
        code: "DUPLICATE_REFERENCE",
        message: `Document ${edge.sourceId} contains duplicate reference ID ${edge.referenceId}`,
        documentIds: [edge.sourceId],
      });
    }
    referenceKeys.add(referenceKey);
  }

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
};

const getNodesById = (graph: DocumentGraph) =>
  new Map(graph.nodes.map((node) => [node.id, node]));

export const getDocumentGraphDependencies = (
  graph: DocumentGraph,
  documentId: string
): readonly DocumentGraphNode[] => {
  const nodesById = getNodesById(graph);
  if (nodesById.has(documentId) === false) {
    throw new DocumentGraphError({
      code: "ROOT_NOT_FOUND",
      message: `Document graph node ${documentId} does not exist`,
      documentIds: [documentId],
    });
  }
  const dependencies = new Map<string, DocumentGraphNode>();
  for (const edge of graph.edges) {
    if (edge.sourceId === documentId) {
      const target = nodesById.get(edge.reference.documentId);
      if (target !== undefined) {
        dependencies.set(target.id, target);
      }
    }
  }
  return Object.freeze([...dependencies.values()]);
};

/** Returns each reachable node once, with dependencies before their consumers. */
export const getDocumentGraphClosure = ({
  graph,
  rootIds,
}: {
  graph: DocumentGraph;
  rootIds: readonly string[];
}): readonly DocumentGraphNode[] => {
  const nodesById = getNodesById(graph);
  const edgesBySourceId = getDocumentGraphEdgesBySourceId(graph.edges);
  const state = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const ordered: DocumentGraphNode[] = [];

  const visit = (documentId: string) => {
    const node = nodesById.get(documentId);
    if (node === undefined) {
      throw new DocumentGraphError({
        code: "ROOT_NOT_FOUND",
        message: `Document graph root ${documentId} does not exist`,
        documentIds: [documentId],
      });
    }
    const nodeState = state.get(documentId);
    if (nodeState === "visited") {
      return;
    }
    if (nodeState === "visiting") {
      const cycleStart = stack.indexOf(documentId);
      const cycle = [...stack.slice(cycleStart), documentId];
      throw new DocumentGraphError({
        code: "CYCLE",
        message: `Document graph contains a cycle: ${cycle.join(" -> ")}`,
        documentIds: cycle,
      });
    }
    state.set(documentId, "visiting");
    stack.push(documentId);
    for (const edge of edgesBySourceId.get(documentId) ?? []) {
      visit(edge.reference.documentId);
    }
    stack.pop();
    state.set(documentId, "visited");
    ordered.push(node);
  };

  for (const rootId of [...new Set(rootIds)].sort(compareStrings)) {
    visit(rootId);
  }
  return Object.freeze(ordered);
};
