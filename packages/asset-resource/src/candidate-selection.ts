import { evaluate, type ExprNode } from "groq-js/1";
import type { AssetFileDocument } from "@webstudio-is/sdk";

const assetResourceCandidatePolicyV1 = {
  records: "safe-static-filter-superset",
  fields: "complete-lightweight-document",
  content: "reference-only",
} as const;

type AstNode = {
  type: string;
};

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";

const compareStrings = (left: string, right: string) => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

const visitAst = (node: AstNode, visit: (node: AstNode) => void) => {
  visit(node);
  if (node.type === "Value") {
    return;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isAstNode(item)) {
          visitAst(item, visit);
        }
      }
      continue;
    }
    if (isAstNode(value)) {
      visitAst(value, visit);
    }
  }
};

export const getAssetResourceParameterNames = (tree: ExprNode) => {
  const names = new Set<string>();
  visitAst(tree, (node) => {
    if (
      node.type === "Parameter" &&
      "name" in node &&
      typeof node.name === "string"
    ) {
      names.add(node.name);
    }
  });
  return [...names].sort();
};

const stableStaticNodeTypes = new Set([
  "AccessAttribute",
  "AccessElement",
  "And",
  "Array",
  "ArrayCoerce",
  "ArrayElement",
  "Group",
  "InRange",
  "Neg",
  "Not",
  "OpCall",
  "Or",
  "Pos",
  "This",
  "Tuple",
  "Value",
]);

const isStableStaticExpression = (tree: ExprNode) => {
  let stable = true;
  visitAst(tree, (node) => {
    if (stableStaticNodeTypes.has(node.type) === false) {
      stable = false;
    }
  });
  return stable;
};

const combineWithAnd = (
  left: ExprNode | undefined,
  right: ExprNode | undefined
): ExprNode | undefined => {
  if (left === undefined) {
    return right;
  }
  if (right === undefined) {
    return left;
  }
  return { type: "And", left, right };
};

const extractSafeStaticConjuncts = (
  expression: ExprNode
): ExprNode | undefined => {
  if (expression.type === "And") {
    return combineWithAnd(
      extractSafeStaticConjuncts(expression.left),
      extractSafeStaticConjuncts(expression.right)
    );
  }
  if (expression.type === "Group" && expression.base.type === "And") {
    const base = extractSafeStaticConjuncts(expression.base);
    return base === undefined ? undefined : { type: "Group", base };
  }
  if (isStableStaticExpression(expression)) {
    return expression;
  }
};

type DatasetFilterAnalysis = {
  expressions: ExprNode[];
  isUntransformedDataset: boolean;
};

const collectDatasetFilters = (node: ExprNode): DatasetFilterAnalysis => {
  if (node.type === "Everything") {
    return { expressions: [], isUntransformedDataset: true };
  }

  if ("base" in node && isAstNode(node.base)) {
    const analysis = collectDatasetFilters(node.base as ExprNode);
    if (node.type === "Filter" && analysis.isUntransformedDataset) {
      return {
        expressions: [...analysis.expressions, node.expr],
        isUntransformedDataset: true,
      };
    }
    return { ...analysis, isUntransformedDataset: false };
  }

  return { expressions: [], isUntransformedDataset: false };
};

export type AssetResourceCandidateSelection = {
  queryMode: "static" | "parameterized";
  parameterNames: string[];
  documents: AssetFileDocument[];
  appliedStaticPrefilter: boolean;
  policy: typeof assetResourceCandidatePolicyV1;
};

/**
 * Retains a safe superset for runtime evaluation. Only stable,
 * parameter-independent conjuncts on the original dataset may remove records.
 * Every candidate keeps the complete lightweight document; file bodies are
 * represented only by contentRef and are hydrated after query selection.
 */
export const selectAssetResourceCandidates = async ({
  tree,
  documents,
}: {
  tree: ExprNode;
  documents: readonly AssetFileDocument[];
}): Promise<AssetResourceCandidateSelection> => {
  const parameterNames = getAssetResourceParameterNames(tree);
  const { expressions } = collectDatasetFilters(tree);
  const staticExpression = expressions.reduce<ExprNode | undefined>(
    (combined, expression) =>
      combineWithAnd(combined, extractSafeStaticConjuncts(expression)),
    undefined
  );
  let candidates = [...documents];
  if (staticExpression !== undefined) {
    const value = await evaluate(
      {
        type: "Filter",
        base: { type: "Everything" },
        expr: staticExpression,
      },
      { dataset: candidates }
    );
    candidates = await value.get();
  }
  candidates.sort((left, right) => compareStrings(left._id, right._id));
  return {
    queryMode: parameterNames.length === 0 ? "static" : "parameterized",
    parameterNames,
    documents: candidates,
    appliedStaticPrefilter: staticExpression !== undefined,
    policy: assetResourceCandidatePolicyV1,
  };
};
