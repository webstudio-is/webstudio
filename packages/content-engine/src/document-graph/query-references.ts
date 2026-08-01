import { pointerSegments } from "@hyperjump/json-pointer";
import { getQueryConditions } from "@webstudio-is/query-builder/runtime";
import type { ContentCompilationQuery } from "../compilation-plan";
import type { AssetQuery, AssetQueryFieldPath } from "../schema";
import { createDocumentGraph, type DocumentGraph } from "./graph";
import { getDocumentGraphEdgesBySourceId } from "./graph-utils";

type QueryWithFields =
  | Pick<AssetQuery, "where" | "sort" | "output">
  | Pick<ContentCompilationQuery, "where" | "sort" | "output">;

const getQueryPropertyPaths = (query: QueryWithFields) => {
  if (query.output.mode === "all") {
    return "all" as const;
  }
  const paths: AssetQueryFieldPath[] = [];
  for (const { field } of getQueryConditions(query.where)) {
    if (field[0] === "properties") {
      paths.push(field);
    }
  }
  for (const { field } of query.sort) {
    if (field[0] === "properties") {
      paths.push(field);
    }
  }
  if (query.output.mode === "fields") {
    for (const field of query.output.fields) {
      if (field[0] === "properties") {
        paths.push(field);
      }
    }
  }
  return paths;
};

const getReferencePropertyPath = (
  referenceId: string
): AssetQueryFieldPath | undefined => {
  let pointer: string;
  if (referenceId === "#frontmatter") {
    pointer = "";
  } else if (referenceId.startsWith("#frontmatter/")) {
    pointer = referenceId.slice("#frontmatter".length);
  } else if (referenceId === "#") {
    pointer = "";
  } else if (referenceId.startsWith("#/")) {
    pointer = referenceId.slice(1);
  } else {
    return;
  }
  try {
    return ["properties", ...pointerSegments(pointer)];
  } catch {
    return;
  }
};

const pathsOverlap = (
  left: AssetQueryFieldPath,
  right: AssetQueryFieldPath
) => {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
};

const queryPathMatchesReference = ({
  queryPaths,
  referenceId,
}: {
  queryPaths: "all" | readonly AssetQueryFieldPath[];
  referenceId: string;
}) => {
  const referencePath = getReferencePropertyPath(referenceId);
  return (
    referencePath !== undefined &&
    (queryPaths === "all" ||
      queryPaths.some((queryPath) => pathsOverlap(queryPath, referencePath)))
  );
};

export const isDocumentGraphFieldAffected = ({
  graph,
  sourceId,
  field,
}: {
  graph: DocumentGraph;
  sourceId: string;
  field: AssetQueryFieldPath;
}) => {
  if (field[0] !== "properties") {
    return false;
  }
  return graph.edges.some((edge) => {
    if (edge.sourceId !== sourceId) {
      return false;
    }
    const referencePath = getReferencePropertyPath(edge.referenceId);
    return referencePath !== undefined && pathsOverlap(field, referencePath);
  });
};

/** Finds graph sources whose reference locations can affect a query. */
export const getDocumentGraphQueryRootIds = ({
  graph,
  query,
}: {
  graph: DocumentGraph;
  query: QueryWithFields;
}) => {
  const queryPaths = getQueryPropertyPaths(query);
  const rootIds = new Set<string>();
  for (const edge of graph.edges) {
    if (
      queryPathMatchesReference({ queryPaths, referenceId: edge.referenceId })
    ) {
      rootIds.add(edge.sourceId);
    }
  }
  return [...rootIds];
};

/** Keeps query-intersecting root edges and complete downstream dependencies. */
export const selectDocumentGraphForQuery = ({
  graph,
  query,
  rootIds,
}: {
  graph: DocumentGraph;
  query: QueryWithFields;
  rootIds: readonly string[];
}) => {
  const queryPaths = getQueryPropertyPaths(query);
  const rootIdSet = new Set(rootIds);
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgesBySourceId = getDocumentGraphEdgesBySourceId(graph.edges);
  const selectedNodeIds = new Set(rootIds);
  const selectedEdges = new Set<(typeof graph.edges)[number]>();
  const expandedDependencyIds = new Set<string>();

  const selectDependencies = (documentId: string) => {
    selectedNodeIds.add(documentId);
    if (expandedDependencyIds.has(documentId)) {
      return;
    }
    expandedDependencyIds.add(documentId);
    for (const edge of edgesBySourceId.get(documentId) ?? []) {
      selectedEdges.add(edge);
      selectDependencies(edge.reference.documentId);
    }
  };

  for (const edge of graph.edges) {
    if (
      rootIdSet.has(edge.sourceId) &&
      queryPathMatchesReference({
        queryPaths,
        referenceId: edge.referenceId,
      })
    ) {
      selectedEdges.add(edge);
      selectDependencies(edge.reference.documentId);
    }
  }

  return createDocumentGraph({
    nodes: [...selectedNodeIds].map((id) => {
      const node = nodesById.get(id);
      if (node === undefined) {
        throw new Error(`Document graph query root ${id} does not exist`);
      }
      return node;
    }),
    edges: [...selectedEdges],
  });
};
