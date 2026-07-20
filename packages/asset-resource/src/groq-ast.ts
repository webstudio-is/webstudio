import type { ExprNode } from "groq-js/1";

export type GroqAstNode = { type: string };

export const isGroqAstNode = (value: unknown): value is GroqAstNode =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";

export const visitGroqAst = (
  tree: ExprNode,
  visit: (node: GroqAstNode, depth: number) => boolean | void
) => {
  const walk = (node: GroqAstNode, depth: number) => {
    if (visit(node, depth) === false || node.type === "Value") {
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isGroqAstNode(item)) {
            walk(item, depth + 1);
          }
        }
      } else if (isGroqAstNode(value)) {
        walk(value, depth + 1);
      }
    }
  };
  walk(tree, 1);
};
