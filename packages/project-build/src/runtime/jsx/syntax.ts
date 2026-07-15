import { Parser } from "acorn";
import jsx from "acorn-jsx";
import { webstudioJsxFragmentBuiltInHelpers } from "./bindings";
import { getErrorMessage, throwWebstudioJsxValidationError } from "./errors";

const JsxParser = Parser.extend(jsx());

const restrictedRuntimeIdentifiers = new Set([
  "exports",
  "process",
  "globalThis",
  "Function",
  "eval",
  "module",
  "require",
]);

type AstNode = {
  type?: string;
  [key: string]: unknown;
};

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as AstNode).type === "string";

const getJsxElementName = (node: unknown): string | undefined => {
  if (isAstNode(node) === false) {
    return;
  }
  if (node.type === "JSXIdentifier") {
    return typeof node.name === "string" ? node.name : undefined;
  }
  if (node.type === "JSXMemberExpression") {
    const objectName = getJsxElementName(node.object);
    const propertyName = getJsxElementName(node.property);
    if (objectName !== undefined && propertyName !== undefined) {
      return `${objectName}.${propertyName}`;
    }
  }
};

const parseWebstudioJsxFragmentExpression = (source: string) =>
  JsxParser.parseExpressionAt(`<>${source}</>`, 0, {
    ecmaVersion: "latest",
    sourceType: "module",
  }) as unknown as AstNode;

export const getWebstudioJsxFragmentFirstElementName = (
  source: string
): string | undefined => {
  const ast = parseWebstudioJsxFragmentExpression(source);
  if (ast.type !== "JSXFragment" || Array.isArray(ast.children) === false) {
    return;
  }
  for (const child of ast.children) {
    if (isAstNode(child) === false) {
      continue;
    }
    if (child.type === "JSXText" && String(child.value ?? "").trim() === "") {
      continue;
    }
    if (child.type === "JSXElement" && isAstNode(child.openingElement)) {
      return getJsxElementName(child.openingElement.name);
    }
    return;
  }
};

const getMemberPropertyName = (node: AstNode) => {
  if (
    node.type !== "MemberExpression" &&
    node.type !== "OptionalMemberExpression"
  ) {
    return;
  }
  const property = node.property;
  if (isAstNode(property) === false) {
    return;
  }
  if (property.type === "Identifier") {
    return typeof property.name === "string" ? property.name : undefined;
  }
  if (
    node.computed === true &&
    property.type === "Literal" &&
    typeof property.value === "string"
  ) {
    return property.value;
  }
  if (node.computed === true && property.type === "StringLiteral") {
    return typeof property.value === "string" ? property.value : undefined;
  }
};

const visitAst = (
  value: unknown,
  visitor: (
    node: AstNode,
    context: { parent?: AstNode; key?: string }
  ) => string | undefined,
  context: { parent?: AstNode; key?: string } = {}
): string | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = visitAst(item, visitor, context);
      if (result !== undefined) {
        return result;
      }
    }
    return;
  }
  if (isAstNode(value) === false) {
    return;
  }
  const result = visitor(value, context);
  if (result !== undefined) {
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    if (
      key === "loc" ||
      key === "start" ||
      key === "end" ||
      key === "extra" ||
      key === "leadingComments" ||
      key === "trailingComments"
    ) {
      continue;
    }
    const childResult = visitAst(child, visitor, { parent: value, key });
    if (childResult !== undefined) {
      return childResult;
    }
  }
};

const isNonExecutingPropertyName = (context: {
  parent?: AstNode;
  key?: string;
}) => {
  const { parent, key } = context;
  if (parent === undefined) {
    return false;
  }
  if (
    (parent.type === "Property" ||
      parent.type === "ObjectProperty" ||
      parent.type === "ObjectMethod") &&
    key === "key" &&
    parent.computed !== true
  ) {
    return true;
  }
  if (
    (parent.type === "MemberExpression" ||
      parent.type === "OptionalMemberExpression") &&
    key === "property" &&
    parent.computed !== true
  ) {
    return true;
  }
  return false;
};

const parseJsxModule = (source: string) =>
  JsxParser.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
  }) as unknown as AstNode;

const hasModuleSyntax = (source: string) => {
  try {
    const ast = parseJsxModule(source);
    const body = Array.isArray(ast.body)
      ? ast.body
      : isAstNode(ast.program) && Array.isArray(ast.program.body)
        ? ast.program.body
        : undefined;
    if (body === undefined) {
      return false;
    }
    return body.some(
      (node) =>
        isAstNode(node) &&
        (node.type === "ImportDeclaration" ||
          node.type === "ExportAllDeclaration" ||
          node.type === "ExportDefaultDeclaration" ||
          node.type === "ExportNamedDeclaration")
    );
  } catch {
    return false;
  }
};

export const inspectWebstudioJsxFragmentSyntax = (source: string) => {
  if (hasModuleSyntax(source)) {
    return throwWebstudioJsxValidationError(
      `Do not use import or export in JSX fragments. Use the built-in ${webstudioJsxFragmentBuiltInHelpers} helpers.`,
      "declarative_jsx_without_modules"
    );
  }
  let ast: AstNode;
  try {
    ast = parseWebstudioJsxFragmentExpression(source);
  } catch (error) {
    return throwWebstudioJsxValidationError(
      `Could not parse JSX fragment. Pass Webstudio JSX such as <$.Box><$.Heading>Title</$.Heading></$.Box>. ${getErrorMessage(error)}`,
      "valid_webstudio_jsx_syntax",
      getErrorMessage(error)
    );
  }
  const error = visitAst(ast, (node, context) => {
    if (node.type === "ImportExpression" || node.type === "Import") {
      return `Do not use dynamic import() in JSX fragments. JSX fragments are declarative Webstudio project data; use the built-in ${webstudioJsxFragmentBuiltInHelpers} helpers.`;
    }
    if (node.type === "Identifier" && typeof node.name === "string") {
      if (
        restrictedRuntimeIdentifiers.has(node.name) &&
        isNonExecutingPropertyName(context) === false
      ) {
        return `Do not access "${node.name}" in JSX fragments. JSX fragments are declarative Webstudio project data; use the built-in ${webstudioJsxFragmentBuiltInHelpers} helpers.`;
      }
    }
    if (getMemberPropertyName(node) === "constructor") {
      return `Do not access "constructor" in JSX fragments. JSX fragments are declarative Webstudio project data; use the built-in ${webstudioJsxFragmentBuiltInHelpers} helpers.`;
    }
  });
  if (error !== undefined) {
    return throwWebstudioJsxValidationError(
      error,
      "declarative_webstudio_jsx_only"
    );
  }
};
