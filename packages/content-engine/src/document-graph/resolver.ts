import { awaitWithSignal, mapBounded } from "../async-utils";
import {
  getDocumentGraphClosure,
  type DocumentGraph,
  type DocumentGraphNode,
} from "./graph";
import { getDocumentGraphEdgesBySourceId } from "./graph-utils";
import type { DocumentReference } from "./reference";
import {
  ResourceResolutionError,
  resolveResources,
  type Resource,
} from "./resource-resolver";

export type DocumentGraphResolutionErrorCode =
  | "REQUEST_CANCELLED"
  | "DOCUMENT_LOAD_FAILED"
  | "REPRESENTATION_SELECTOR_REQUIRED"
  | "DOCUMENT_SELECTION_FAILED"
  | "DOCUMENT_ASSEMBLY_FAILED";

export class DocumentGraphResolutionError extends Error {
  readonly code: DocumentGraphResolutionErrorCode;
  readonly documentId?: string;
  readonly referenceId?: string;

  constructor({
    code,
    message,
    documentId,
    referenceId,
    cause,
  }: {
    code: DocumentGraphResolutionErrorCode;
    message: string;
    documentId?: string;
    referenceId?: string;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "DocumentGraphResolutionError";
    this.code = code;
    this.documentId = documentId;
    this.referenceId = referenceId;
  }
}

export type ResolvedDocumentGraph<Value> = Readonly<{
  roots: readonly Value[];
  values: ReadonlyMap<string, Value>;
}>;

const assertActive = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) {
    throw new DocumentGraphResolutionError({
      code: "REQUEST_CANCELLED",
      message: "Document graph resolution was cancelled",
      cause: signal.reason,
    });
  }
};

/**
 * Loads a reachable graph in parallel, then assembles it dependency-first.
 * Parsing and representation semantics stay behind the injected callbacks.
 */
export const resolveDocumentGraph = async <Source, Value>({
  graph,
  rootIds,
  concurrency,
  signal,
  load,
  select,
  assemble,
}: {
  graph: DocumentGraph;
  rootIds: readonly string[];
  concurrency: number;
  signal?: AbortSignal;
  load: (
    node: DocumentGraphNode,
    options: { signal?: AbortSignal }
  ) => Promise<Source>;
  select?: (input: {
    reference: DocumentReference;
    value: NoInfer<Value>;
    sourceNode: DocumentGraphNode;
    targetNode: DocumentGraphNode;
  }) => unknown | Promise<unknown>;
  assemble: (input: {
    node: DocumentGraphNode;
    source: Source;
    references: ReadonlyMap<string, unknown>;
  }) => Value | Promise<Value>;
}): Promise<ResolvedDocumentGraph<Value>> => {
  assertActive(signal);
  const closure = getDocumentGraphClosure({ graph, rootIds });
  const nodesById = new Map(closure.map((node) => [node.id, node]));
  const sources = new Map<string, Source>();
  const loadGroups = new Map<
    string,
    { representative: DocumentGraphNode; nodes: DocumentGraphNode[] }
  >();
  for (const node of closure) {
    const group = loadGroups.get(node.contentRef);
    if (group === undefined) {
      loadGroups.set(node.contentRef, { representative: node, nodes: [node] });
    } else {
      group.nodes.push(node);
    }
  }
  await mapBounded([...loadGroups.values()], concurrency, async (group) => {
    assertActive(signal);
    const node = group.representative;
    try {
      const source = await awaitWithSignal(load(node, { signal }), signal);
      for (const groupedNode of group.nodes) {
        sources.set(groupedNode.id, source);
      }
    } catch (error) {
      if (signal?.aborted) {
        assertActive(signal);
      }
      throw new DocumentGraphResolutionError({
        code: "DOCUMENT_LOAD_FAILED",
        message: `Document ${node.id} could not be loaded`,
        documentId: node.id,
        cause: error,
      });
    }
  });

  const edgesBySourceId = getDocumentGraphEdgesBySourceId(graph.edges);
  const resources: Resource<Value>[] = closure.map((node) => ({
    id: node.id,
    dependencies: (edgesBySourceId.get(node.id) ?? []).map(
      (edge) => edge.reference.documentId
    ),
    resolve: async ({ documents }) => {
      assertActive(signal);
      const references = new Map<string, unknown>();
      for (const edge of edgesBySourceId.get(node.id) ?? []) {
        const targetNode = nodesById.get(edge.reference.documentId);
        if (
          targetNode === undefined ||
          documents.has(edge.reference.documentId) === false
        ) {
          throw new DocumentGraphResolutionError({
            code: "DOCUMENT_ASSEMBLY_FAILED",
            message: `Document ${node.id} dependency ${edge.reference.documentId} is unavailable`,
            documentId: node.id,
            referenceId: edge.referenceId,
          });
        }
        const targetValue = documents.get(edge.reference.documentId) as Value;
        let selected: unknown;
        if (select === undefined) {
          if (edge.reference.representation.type !== "document") {
            throw new DocumentGraphResolutionError({
              code: "REPRESENTATION_SELECTOR_REQUIRED",
              message: `Document ${node.id} reference ${edge.referenceId} requires a representation selector`,
              documentId: node.id,
              referenceId: edge.referenceId,
            });
          }
          selected = targetValue;
        } else {
          try {
            selected = await select({
              reference: edge.reference,
              value: targetValue,
              sourceNode: node,
              targetNode,
            });
          } catch (error) {
            throw new DocumentGraphResolutionError({
              code: "DOCUMENT_SELECTION_FAILED",
              message: `Document ${node.id} reference ${edge.referenceId} could not be selected`,
              documentId: node.id,
              referenceId: edge.referenceId,
              cause: error,
            });
          }
        }
        references.set(edge.referenceId, selected);
      }
      if (sources.has(node.id) === false) {
        throw new DocumentGraphResolutionError({
          code: "DOCUMENT_ASSEMBLY_FAILED",
          message: `Document ${node.id} source is unavailable`,
          documentId: node.id,
        });
      }
      const source = sources.get(node.id) as Source;
      try {
        return await assemble({ node, source, references });
      } catch (error) {
        if (error instanceof DocumentGraphResolutionError) {
          throw error;
        }
        throw new DocumentGraphResolutionError({
          code: "DOCUMENT_ASSEMBLY_FAILED",
          message: `Document ${node.id} could not be assembled`,
          documentId: node.id,
          cause: error,
        });
      }
    },
  }));

  try {
    const resolved = await resolveResources({
      resources,
      rootIds,
      // Preserve deterministic dependency-first document assembly. Source
      // loading above remains bounded and concurrent.
      concurrency: 1,
      signal,
    });
    return Object.freeze({
      roots: resolved.roots,
      values: resolved.documents,
    });
  } catch (error) {
    if (
      error instanceof ResourceResolutionError &&
      error.cause instanceof DocumentGraphResolutionError
    ) {
      throw error.cause;
    }
    if (
      error instanceof ResourceResolutionError &&
      error.code === "REQUEST_CANCELLED"
    ) {
      throw new DocumentGraphResolutionError({
        code: "REQUEST_CANCELLED",
        message: "Document graph resolution was cancelled",
        cause: error.cause,
      });
    }
    throw error;
  }
};
