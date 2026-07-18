import { parse, type ExprNode } from "groq-js/1";
import { assetResourceLimits } from "@webstudio-is/sdk";
import { getAssetResourceParameterNames } from "./candidate-selection";

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

type AstNode = { type: string };

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";

const measureAst = (tree: ExprNode) => {
  let nodes = 0;
  let maxDepth = 0;
  const visit = (node: AstNode, depth: number) => {
    nodes += 1;
    maxDepth = Math.max(maxDepth, depth);
    if (
      nodes > assetResourceLimits.queryAstNodes ||
      maxDepth > assetResourceLimits.queryAstDepth ||
      node.type === "Value"
    ) {
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isAstNode(item)) {
            visit(item, depth + 1);
          }
        }
        continue;
      }
      if (isAstNode(value)) {
        visit(value, depth + 1);
      }
    }
  };
  visit(tree, 1);
  return { nodes, depth: maxDepth };
};

export type ValidatedAssetResourceQuery = {
  tree: ExprNode;
  parameterNames: string[];
  queryMode: "static" | "parameterized";
  astNodes: number;
  astDepth: number;
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
    ast.depth > assetResourceLimits.queryAstDepth
  ) {
    throw new AssetResourceQueryValidationError({
      code: "QUERY_COMPLEXITY_EXCEEDED",
      message: "Asset resource query exceeds the syntax-tree limits",
      details: {
        astNodes: ast.nodes,
        astNodeLimit: assetResourceLimits.queryAstNodes,
        astDepth: ast.depth,
        astDepthLimit: assetResourceLimits.queryAstDepth,
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
    : `${basePath}.${attribute.name}`;
};

export const getAssetResourceReferencedFieldPaths = (query: string) => {
  const { tree } = validateAssetResourceQuery(query);
  const paths = new Set<string>();
  const visited = new Set<object>();
  const visit = (value: unknown) => {
    if (typeof value !== "object" || value === null || visited.has(value)) {
      return;
    }
    visited.add(value);
    const path = getAttributePath(value);
    if (path !== undefined) {
      paths.add(path);
    }
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) {
        child.forEach(visit);
      } else {
        visit(child);
      }
    }
  };
  visit(tree);
  return Array.from(paths).sort();
};
