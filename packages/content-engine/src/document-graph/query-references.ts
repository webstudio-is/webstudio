import { pointerSegments } from "@hyperjump/json-pointer";
import { getQueryConditions } from "@webstudio-is/query-builder/runtime";
import type { ContentCompilationQuery } from "../compilation-plan";
import type { AssetQuery, AssetQueryFieldPath } from "../schema";
import type { DocumentGraph } from "./graph";

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
  return ["properties", ...pointerSegments(pointer)];
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
    const referencePath = getReferencePropertyPath(edge.referenceId);
    if (
      referencePath !== undefined &&
      (queryPaths === "all" ||
        queryPaths.some((queryPath) => pathsOverlap(queryPath, referencePath)))
    ) {
      rootIds.add(edge.sourceId);
    }
  }
  return [...rootIds];
};
