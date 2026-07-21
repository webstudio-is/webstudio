import { parse, type ExprNode } from "groq-js/1";
import { assetResourceLimits } from "@webstudio-is/sdk";
import { getAssetResourceParameterNames } from "./candidate-selection";
import { visitGroqAst } from "./groq-ast";
import { appendAssetFieldPath } from "./canonical";

export class AssetResourceQueryValidationError extends Error {
  readonly code: "INVALID_QUERY" | "QUERY_COMPLEXITY_EXCEEDED";
  readonly details?: Record<string, number>;

  constructor({
    code,
    message,
    details,
  }: {
    code: AssetResourceQueryValidationError["code"];
    message: string;
    details?: Record<string, number>;
  }) {
    super(message);
    this.name = "AssetResourceQueryValidationError";
    this.code = code;
    this.details = details;
  }
}

const measureAst = (tree: ExprNode) => {
  let nodes = 0;
  let maxDepth = 0;
  let datasetScans = 0;
  visitGroqAst(tree, (node, depth) => {
    nodes += 1;
    maxDepth = Math.max(maxDepth, depth);
    if (node.type === "Everything") {
      datasetScans += 1;
    }
    if (
      nodes > assetResourceLimits.queryAstNodes ||
      maxDepth > assetResourceLimits.queryAstDepth
    ) {
      return false;
    }
  });
  return { nodes, depth: maxDepth, datasetScans };
};

export type ValidatedAssetResourceQuery = {
  tree: ExprNode;
  parameterNames: string[];
  queryMode: "static" | "parameterized";
  astNodes: number;
  astDepth: number;
  datasetScans: number;
};

export const validateAssetResourceQuery = (
  query: string
): ValidatedAssetResourceQuery => {
  const queryBytes = new TextEncoder().encode(query).byteLength;
  if (
    query.trim().length === 0 ||
    queryBytes > assetResourceLimits.queryBytes
  ) {
    throw new AssetResourceQueryValidationError({
      code: "INVALID_QUERY",
      message:
        query.trim().length === 0
          ? "Asset resource query cannot be empty"
          : "Asset resource query exceeds the UTF-8 byte limit",
      details: {
        queryBytes,
        queryByteLimit: assetResourceLimits.queryBytes,
      },
    });
  }

  let tree: ExprNode;
  try {
    tree = parse(query);
  } catch {
    throw new AssetResourceQueryValidationError({
      code: "INVALID_QUERY",
      message: "Asset resource query contains invalid GROQ syntax",
    });
  }
  const ast = measureAst(tree);
  if (
    ast.nodes > assetResourceLimits.queryAstNodes ||
    ast.depth > assetResourceLimits.queryAstDepth ||
    ast.datasetScans > assetResourceLimits.queryDatasetScans
  ) {
    throw new AssetResourceQueryValidationError({
      code: "QUERY_COMPLEXITY_EXCEEDED",
      message: "Asset resource query exceeds the syntax-tree limits",
      details: {
        astNodes: ast.nodes,
        astNodeLimit: assetResourceLimits.queryAstNodes,
        astDepth: ast.depth,
        astDepthLimit: assetResourceLimits.queryAstDepth,
        datasetScans: ast.datasetScans,
        datasetScanLimit: assetResourceLimits.queryDatasetScans,
      },
    });
  }
  const parameterNames = getAssetResourceParameterNames(tree);
  if (parameterNames.length > assetResourceLimits.parameterCount) {
    throw new AssetResourceQueryValidationError({
      code: "QUERY_COMPLEXITY_EXCEEDED",
      message: "Asset resource query references too many parameters",
      details: {
        parameterCount: parameterNames.length,
        parameterLimit: assetResourceLimits.parameterCount,
      },
    });
  }
  return {
    tree,
    parameterNames,
    queryMode: parameterNames.length === 0 ? "static" : "parameterized",
    astNodes: ast.nodes,
    astDepth: ast.depth,
    datasetScans: ast.datasetScans,
  };
};

type AttributeNode = {
  type: "AccessAttribute";
  name: string;
  base?: unknown;
};

const getAttributePath = (node: unknown): string | undefined => {
  if (
    typeof node !== "object" ||
    node === null ||
    "type" in node === false ||
    node.type !== "AccessAttribute" ||
    "name" in node === false ||
    typeof node.name !== "string"
  ) {
    return;
  }
  const attribute = node as AttributeNode;
  const basePath = getAttributePath(attribute.base);
  return basePath === undefined
    ? attribute.name
    : appendAssetFieldPath(basePath, attribute.name);
};

export const getAssetResourceReferencedFieldPathsFromTree = (
  tree: ExprNode
) => {
  const paths = new Set<string>();
  visitGroqAst(tree, (node) => {
    const path = getAttributePath(node);
    if (path !== undefined) {
      paths.add(path);
    }
  });
  return Array.from(paths).sort();
};

export const getAssetResourceReferencedFieldPaths = (query: string) =>
  getAssetResourceReferencedFieldPathsFromTree(
    validateAssetResourceQuery(query).tree
  );
