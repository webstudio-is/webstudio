import type {
  Literal,
  Node,
  Expression,
  Identifier,
  SpreadElement,
} from "acorn";
import { Parser } from "acorn";
import jsx from "acorn-jsx";

// https://github.com/facebook/jsx/blob/main/AST.md
// JSXSpreadChild is not implemented in acorn-jsx

// JSX Names

export type JSXIdentifier = Omit<Identifier, "type"> & {
  type: "JSXIdentifier";
};

export type JSXMemberExpression = Omit<Node, "type"> & {
  type: "JSXMemberExpression";
  object: JSXMemberExpression | JSXIdentifier;
  property: JSXIdentifier;
};

export type JSXNamespacedName = Omit<Node, "type"> & {
  type: "JSXNamespacedName";
  namespace: JSXIdentifier;
  name: JSXIdentifier;
};

// JSX Expression Container

export type JSXEmptyExpression = Omit<Node, "type"> & {
  type: "JSXEmptyExpression";
};

export type JSXExpressionContainer = Omit<Node, "type"> & {
  type: "JSXExpressionContainer";
  expression: Expression | JSXEmptyExpression;
};

// JSX Attributes

export type JSXAttribute = Omit<Node, "type"> & {
  type: "JSXAttribute";
  name: JSXIdentifier | JSXNamespacedName;
  value: Literal | JSXExpressionContainer | JSXElement | JSXFragment | null;
};

export type JSXSpreadAttribute = Omit<SpreadElement, "type"> & {
  type: "JSXSpreadAttribute";
};

// JSX Text

export type JSXText = Omit<Node, "type"> & {
  type: "JSXText";
  value: string;
  raw: string;
};

// JSX Element

export type JSXOpeningElement = Omit<Node, "type"> & {
  type: "JSXOpeningElement";
  name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName;
  attributes: Array<JSXAttribute | JSXSpreadAttribute>;
  selfClosing: boolean;
};

export type JSXClosingElement = Omit<Node, "type"> & {
  type: "JSXClosingElement";
  name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName;
};

export type JSXElement = Omit<Node, "type"> & {
  type: "JSXElement";
  openingElement: JSXOpeningElement;
  closingElement: JSXClosingElement | null;
  children: [JSXText | JSXExpressionContainer | JSXElement | JSXFragment];
};

// JSX Fragment

export type JSXOpeningFragment = Omit<Node, "type"> & {
  type: "JSXOpeningFragment";
};

export type JSXClosingFragment = Omit<Node, "type"> & {
  type: "JSXClosingFragment";
};

export type JSXFragment = Omit<Node, "type"> & {
  type: "JSXFragment";
  openingFragment: JSXOpeningFragment;
  closingFragment: JSXClosingFragment;
  children: Array<JSXText | JSXExpressionContainer | JSXElement | JSXFragment>;
};

const JsxParser = Parser.extend(jsx());

export const parseExpression = (
  code: string
): Expression | JSXElement | JSXFragment => {
  return JsxParser.parseExpressionAt(code, 0, { ecmaVersion: "latest" });
};
