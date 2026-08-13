import {
  defaultHandlers,
  toHast,
  type Handler,
  type Handlers,
} from "mdast-util-to-hast";
import {
  discoverAssetValueReferences,
  type AssetValueReference,
} from "./asset-value-references";
import { createAssetReferenceResolver } from "./asset-reference-utils";
import { getUtf8ByteLength } from "./byte-stream";
import { extractMarkdownFrontmatter } from "./frontmatter";
import { contentEngineLimits } from "./limits";
import {
  getSyntaxTreeChildren,
  isSyntaxTreeNode,
  parseMarkdownAst,
  type SyntaxTreeNode,
} from "./markdown-ast";

export type MdxSourcePoint = Readonly<{
  line: number;
  column: number;
  offset?: number;
}>;

export type MdxSourceRange = Readonly<{
  start: MdxSourcePoint;
  end: MdxSourcePoint;
}>;

export type MdxAuthoredProp = Readonly<{
  name: string;
  value: string | true;
}>;

export type MdxMode = "flow" | "text";

export type MdxMarkdownListItem = Readonly<{
  checked?: boolean;
  spread: boolean;
}>;

export type MdxAuthoredNode =
  | Readonly<{
      type: "text";
      value: string;
      sourceRange?: MdxSourceRange;
    }>
  | Readonly<{
      type: "comment";
      value: string;
      mdxMode: MdxMode;
      sourceRange?: MdxSourceRange;
    }>
  | Readonly<{
      type: "element";
      syntax: "markdown";
      tag: string;
      props: readonly MdxAuthoredProp[];
      children: readonly MdxAuthoredNode[];
      markdownListItem?: MdxMarkdownListItem;
      preserveTextWhitespace?: true;
      sourceRange?: MdxSourceRange;
    }>
  | Readonly<{
      type: "element";
      syntax: "mdx";
      tag: string;
      props: readonly MdxAuthoredProp[];
      children: readonly MdxAuthoredNode[];
      mdxMode: MdxMode;
      sourceRange?: MdxSourceRange;
    }>
  | Readonly<{
      type: "template";
      name: string;
      props: readonly MdxAuthoredProp[];
      children: readonly MdxAuthoredNode[];
      mdxMode: MdxMode;
      sourceRange?: MdxSourceRange;
    }>;

export type MdxDocument = Readonly<{
  frontmatter: Readonly<{
    properties: Readonly<Record<string, unknown>>;
    sourceRange?: MdxSourceRange;
  }>;
  children: readonly MdxAuthoredNode[];
}>;

export type MdxDocumentErrorCode = "invalid-mdx" | "unsafe-mdx";

export class MdxDocumentError extends Error {
  readonly code: MdxDocumentErrorCode;
  readonly nodeType?: string;
  readonly reason?: string;
  readonly sourceRange?: MdxSourceRange;

  constructor({
    code,
    message,
    nodeType,
    reason,
    sourceRange,
    cause,
  }: {
    code: MdxDocumentErrorCode;
    message: string;
    nodeType?: string;
    reason?: string;
    sourceRange?: MdxSourceRange;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "MdxDocumentError";
    this.code = code;
    this.nodeType = nodeType;
    this.reason = reason;
    this.sourceRange = sourceRange;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toSourcePoint = (value: unknown): MdxSourcePoint | undefined => {
  if (
    isRecord(value) === false ||
    typeof value.line !== "number" ||
    typeof value.column !== "number" ||
    Number.isInteger(value.line) === false ||
    Number.isInteger(value.column) === false ||
    value.line < 1 ||
    value.column < 1
  ) {
    return;
  }
  const point: { line: number; column: number; offset?: number } = {
    line: value.line,
    column: value.column,
  };
  if (
    typeof value.offset === "number" &&
    Number.isInteger(value.offset) &&
    value.offset >= 0
  ) {
    point.offset = value.offset;
  }
  return point;
};

const toSourceRange = (position: unknown): MdxSourceRange | undefined => {
  if (isRecord(position) === false) {
    return;
  }
  const start = toSourcePoint(position.start);
  const end = toSourcePoint(position.end);
  if (start !== undefined && end !== undefined) {
    return { start, end };
  }
};

const getParserErrorSourceRange = (error: unknown) => {
  if (isRecord(error) === false) {
    return;
  }
  const sourceRange = toSourceRange(error.position);
  if (sourceRange !== undefined) {
    return sourceRange;
  }
  if (typeof error.name !== "string") {
    return;
  }
  const [lineSource, columnSource] = error.name.split(":", 2);
  const line = Number(lineSource);
  const column = Number(columnSource);
  if (
    Number.isInteger(line) === false ||
    Number.isInteger(column) === false ||
    line < 1 ||
    column < 1
  ) {
    return;
  }
  const point = { line, column };
  return { start: point, end: point };
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const throwUnsafeNode = (
  node: SyntaxTreeNode,
  reason: string,
  fallbackNode?: SyntaxTreeNode
): never => {
  throw new MdxDocumentError({
    code: "unsafe-mdx",
    message: reason,
    nodeType: node.type,
    reason,
    sourceRange:
      toSourceRange(node.position) ?? toSourceRange(fallbackNode?.position),
  });
};

const unsupportedElementTags = new Set([
  "base",
  "link",
  "meta",
  "noscript",
  "script",
  "style",
  "template",
  "title",
]);

const urlPropNames = new Set([
  "action",
  "cite",
  "data",
  "formaction",
  "href",
  "poster",
  "src",
  "xlink:href",
  "xlinkhref",
]);

const isSafeStaticUrl = (value: string, propName: string) => {
  let url: URL;
  try {
    url = new URL(value, "https://webstudio.invalid");
  } catch {
    return false;
  }
  if (url.protocol === "http:" || url.protocol === "https:") {
    return true;
  }
  return (
    propName === "href" &&
    (url.protocol === "mailto:" || url.protocol === "tel:")
  );
};

const validateStaticProp = (node: SyntaxTreeNode, prop: MdxAuthoredProp) => {
  const normalizedName = prop.name.toLowerCase();
  if (
    normalizedName.startsWith("on") ||
    normalizedName === "srcdoc" ||
    normalizedName === "dangerouslysetinnerhtml" ||
    normalizedName === "srcset"
  ) {
    throwUnsafeNode(node, `MDX JSX prop ${prop.name} is not supported`);
  }
  if (
    urlPropNames.has(normalizedName) &&
    typeof prop.value === "string" &&
    isSafeStaticUrl(prop.value, normalizedName) === false
  ) {
    throwUnsafeNode(node, `MDX JSX prop ${prop.name} contains an unsafe URL`);
  }
};

const validateAstLimits = (root: SyntaxTreeNode) => {
  const pending: Array<{ node: SyntaxTreeNode; depth: number }> = [
    { node: root, depth: 0 },
  ];
  let nodeCount = 0;
  let propCount = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      break;
    }
    nodeCount += 1;
    if (nodeCount > contentEngineLimits.mdxNodes) {
      throw new MdxDocumentError({
        code: "invalid-mdx",
        message: "MDX content exceeds the node limit",
        sourceRange: toSourceRange(current.node.position),
      });
    }
    if (current.depth > contentEngineLimits.mdxDepth) {
      throw new MdxDocumentError({
        code: "invalid-mdx",
        message: "MDX content exceeds the nesting limit",
        sourceRange: toSourceRange(current.node.position),
      });
    }
    if (Array.isArray(current.node.attributes)) {
      propCount += current.node.attributes.length;
      if (propCount > contentEngineLimits.mdxProps) {
        throw new MdxDocumentError({
          code: "invalid-mdx",
          message: "MDX content exceeds the prop limit",
          sourceRange: toSourceRange(current.node.position),
        });
      }
    }
    for (const child of getSyntaxTreeChildren(current.node)) {
      pending.push({ node: child, depth: current.depth + 1 });
    }
  }
};

const createElement = ({
  node,
  tag,
  props = [],
  children,
  mdxMode,
  markdownListItem,
  preserveTextWhitespace,
}: {
  node: SyntaxTreeNode;
  tag: string;
  props?: readonly MdxAuthoredProp[];
  children: readonly MdxAuthoredNode[];
  mdxMode?: MdxMode;
  markdownListItem?: MdxMarkdownListItem;
  preserveTextWhitespace?: true;
}): MdxAuthoredNode => {
  const sourceRange = toSourceRange(node.position);
  if (mdxMode !== undefined) {
    return {
      type: "element",
      syntax: "mdx",
      tag,
      props,
      children,
      mdxMode,
      sourceRange,
    };
  }
  return {
    type: "element",
    syntax: "markdown",
    tag,
    props,
    children,
    ...(markdownListItem === undefined ? {} : { markdownListItem }),
    ...(preserveTextWhitespace === undefined ? {} : { preserveTextWhitespace }),
    sourceRange,
  };
};

const getMdxMode = (node: SyntaxTreeNode): MdxMode =>
  node.type === "mdxJsxTextElement" || node.type === "mdxTextExpression"
    ? "text"
    : "flow";

const setHastData = (node: SyntaxTreeNode, data: Record<string, unknown>) => {
  node.data = { ...(isRecord(node.data) ? node.data : {}), ...data };
};

const isCommentExpression = (node: SyntaxTreeNode) => {
  if (isRecord(node.data) === false || isRecord(node.data.estree) === false) {
    return false;
  }
  const { body, comments } = node.data.estree;
  return (
    Array.isArray(body) &&
    body.length === 0 &&
    Array.isArray(comments) &&
    comments.length > 0
  );
};

const mapStaticProps = (node: SyntaxTreeNode) => {
  if (Array.isArray(node.attributes) === false) {
    return [];
  }
  const props: MdxAuthoredProp[] = [];
  const names = new Set<string>();
  for (const attribute of node.attributes) {
    if (isSyntaxTreeNode(attribute) === false) {
      throwUnsafeNode(node, "MDX JSX contains an invalid attribute");
    }
    if (attribute.type === "mdxJsxExpressionAttribute") {
      throwUnsafeNode(
        attribute,
        "MDX JSX attribute spreads are not supported",
        node
      );
    }
    if (
      attribute.type !== "mdxJsxAttribute" ||
      typeof attribute.name !== "string"
    ) {
      throwUnsafeNode(
        attribute,
        "MDX JSX contains an unsupported attribute",
        node
      );
    }
    if (names.has(attribute.name)) {
      throwUnsafeNode(attribute, "MDX JSX attributes must be unique", node);
    }
    names.add(attribute.name);
    if (isRecord(attribute.value)) {
      throwUnsafeNode(
        attribute.value.type === "mdxJsxAttributeValueExpression"
          ? (attribute.value as SyntaxTreeNode)
          : attribute,
        "MDX JSX attribute expressions are not supported",
        node
      );
    }
    if (attribute.value !== null && typeof attribute.value !== "string") {
      throwUnsafeNode(
        attribute,
        "MDX JSX attribute values must be static",
        node
      );
    }
    props.push({
      name: attribute.name,
      value: attribute.value === null ? true : attribute.value,
    });
  }
  return props;
};

const mapMdxExpression: Handler = (state, value) => {
  const node = value as SyntaxTreeNode;
  if (isCommentExpression(node) && typeof node.value === "string") {
    const comment = {
      type: "comment",
      value: node.value,
      data: { mdxMode: getMdxMode(node) },
    } as const;
    state.patch(value, comment);
    return comment;
  }
  return throwUnsafeNode(node, "Executable MDX expressions are not supported");
};

const mapMdxJsxElement: Handler = (state, value) => {
  const node = value as SyntaxTreeNode;
  if (node.name !== "ws.element") {
    return throwUnsafeNode(
      node,
      "Only the ws.element component is supported in authored MDX"
    );
  }
  const properties = Object.fromEntries(
    mapStaticProps(node).map((prop) => [prop.name, prop.value])
  );
  const result = state(value, "ws.element", properties, state.all(value));
  if (isSyntaxTreeNode(result)) {
    setHastData(result, { mdxMode: getMdxMode(node) });
  }
  return result;
};

const mapListItem: Handler = (state, value, parent) => {
  const node = value as SyntaxTreeNode;
  const result = defaultHandlers.listItem(state, value, parent);
  if (isSyntaxTreeNode(result)) {
    setHastData(result, {
      markdownListItem: {
        ...(typeof node.checked === "boolean" ? { checked: node.checked } : {}),
        spread:
          node.spread === true ||
          (isSyntaxTreeNode(parent) && parent.spread === true),
      },
    });
  }
  return result;
};

const preserveWhitespace =
  (handler: Handler): Handler =>
  (state, value, parent) => {
    const result = handler(state, value, parent);
    if (isSyntaxTreeNode(result)) {
      setHastData(result, { preserveTextWhitespace: true });
    }
    return result;
  };

const mapParagraph: Handler = (state, value) => {
  const children = getSyntaxTreeChildren(value as SyntaxTreeNode);
  if (children.length === 1 && children[0].type === "mdxJsxTextElement") {
    return state.one(value.children[0], value);
  }
  return defaultHandlers.paragraph(state, value);
};

const rejectUnsupportedNode: Handler = (_state, value) => {
  const node = value as SyntaxTreeNode;
  return throwUnsafeNode(node, `MDX node type ${node.type} is not supported`);
};

const mdxHandlers: Handlers = {
  code: preserveWhitespace(defaultHandlers.code),
  html: rejectUnsupportedNode,
  inlineCode: preserveWhitespace(defaultHandlers.inlineCode),
  mdxFlowExpression: mapMdxExpression,
  mdxJsxFlowElement: mapMdxJsxElement,
  mdxJsxTextElement: mapMdxJsxElement,
  mdxTextExpression: mapMdxExpression,
  mdxjsEsm: rejectUnsupportedNode,
  listItem: mapListItem,
  paragraph: mapParagraph,
};

const mapHastProperties = (node: SyntaxTreeNode) => {
  if (node.properties === undefined) {
    return [];
  }
  if (isRecord(node.properties) === false) {
    return throwUnsafeNode(node, "HTML properties must be an object");
  }
  const props: MdxAuthoredProp[] = [];
  const propertyNames = new Set<string>();
  for (const [propertyName, value] of Object.entries(node.properties)) {
    if (value === undefined || value === null || value === false) {
      continue;
    }
    let propValue: MdxAuthoredProp["value"];
    if (value === true) {
      propValue = true;
    } else if (typeof value === "string" || typeof value === "number") {
      propValue = String(value);
    } else if (
      Array.isArray(value) &&
      value.every(
        (item) => typeof item === "string" || typeof item === "number"
      )
    ) {
      propValue = value.join(" ");
    } else {
      return throwUnsafeNode(node, `HTML property ${propertyName} is invalid`);
    }
    const name = propertyName === "className" ? "class" : propertyName;
    if (propertyNames.has(name)) {
      return throwUnsafeNode(node, "HTML properties must be unique");
    }
    propertyNames.add(name);
    const prop: MdxAuthoredProp = { name, value: propValue };
    validateStaticProp(node, prop);
    props.push(prop);
  }
  return props;
};

const mapHastChildren = (node: SyntaxTreeNode): MdxAuthoredNode[] =>
  getSyntaxTreeChildren(node)
    .filter(
      (child) =>
        child.position !== undefined ||
        child.type !== "text" ||
        typeof child.value !== "string" ||
        child.value !== "\n"
    )
    .map(mapHastNode);

const getHastMdxMode = (node: SyntaxTreeNode) => {
  if (
    isRecord(node.data) &&
    (node.data.mdxMode === "flow" || node.data.mdxMode === "text")
  ) {
    return node.data.mdxMode;
  }
  return throwUnsafeNode(node, "MDX node mode is missing");
};

const getMarkdownListItem = (
  node: SyntaxTreeNode
): MdxMarkdownListItem | undefined => {
  if (isRecord(node.data) === false) {
    return;
  }
  const value = node.data.markdownListItem;
  if (
    isRecord(value) === false ||
    typeof value.spread !== "boolean" ||
    (value.checked !== undefined && typeof value.checked !== "boolean")
  ) {
    return;
  }
  return {
    ...(typeof value.checked === "boolean" ? { checked: value.checked } : {}),
    spread: value.spread,
  };
};

const preservesTextWhitespace = (node: SyntaxTreeNode) =>
  isRecord(node.data) && node.data.preserveTextWhitespace === true
    ? true
    : undefined;

const mapWebstudioElement = (
  node: SyntaxTreeNode,
  props: readonly MdxAuthoredProp[]
): MdxAuthoredNode => {
  const nameProp = props.find((prop) => prop.name === "ws:name");
  const tagProp = props.find((prop) => prop.name === "ws:tag");
  if (nameProp !== undefined && tagProp !== undefined) {
    return throwUnsafeNode(node, "ws:name and ws:tag cannot be used together");
  }
  if (nameProp !== undefined) {
    if (typeof nameProp.value !== "string" || nameProp.value.length === 0) {
      return throwUnsafeNode(node, "ws:name must be a non-empty static string");
    }
    return {
      type: "template",
      name: nameProp.value,
      props: props.filter((prop) => prop.name !== "ws:name"),
      children: mapHastChildren(node),
      mdxMode: getHastMdxMode(node),
      sourceRange: toSourceRange(node.position),
    };
  }

  let tag = "div";
  if (tagProp !== undefined) {
    if (typeof tagProp.value !== "string" || tagProp.value.length === 0) {
      return throwUnsafeNode(node, "ws:tag must be a non-empty static string");
    }
    tag = tagProp.value;
  }
  if (unsupportedElementTags.has(tag.toLowerCase())) {
    return throwUnsafeNode(
      node,
      `Webstudio element tag ${tag} is not supported`
    );
  }
  return createElement({
    node,
    tag,
    props: props.filter((prop) => prop.name !== "ws:tag"),
    children: mapHastChildren(node),
    mdxMode: getHastMdxMode(node),
  });
};

const mapHastNode = (node: SyntaxTreeNode): MdxAuthoredNode => {
  if (node.type === "text") {
    if (typeof node.value !== "string") {
      return throwUnsafeNode(node, "HTML text must contain a string value");
    }
    return {
      type: "text",
      value: node.value,
      sourceRange: toSourceRange(node.position),
    };
  }
  if (node.type === "comment") {
    if (typeof node.value !== "string") {
      return throwUnsafeNode(node, "HTML comments must contain a string value");
    }
    return {
      type: "comment",
      value: node.value,
      mdxMode: getHastMdxMode(node),
      sourceRange: toSourceRange(node.position),
    };
  }
  if (node.type !== "element" || typeof node.tagName !== "string") {
    return throwUnsafeNode(
      node,
      `HTML node type ${node.type} is not supported`
    );
  }
  const props = mapHastProperties(node);
  if (node.tagName === "ws.element") {
    return mapWebstudioElement(node, props);
  }
  return createElement({
    node,
    tag: node.tagName,
    props,
    children: mapHastChildren(node),
    markdownListItem: getMarkdownListItem(node),
    preserveTextWhitespace: preservesTextWhitespace(node),
  });
};

const mapAuthoredChildren = (root: SyntaxTreeNode) => {
  const hast = toHast(root as Parameters<typeof toHast>[0], {
    handlers: mdxHandlers,
    unknownHandler: rejectUnsupportedNode,
  });
  if (isSyntaxTreeNode(hast) === false || hast.type !== "root") {
    return throwUnsafeNode(root, "MDX did not produce an HTML document");
  }
  return mapHastChildren(hast);
};

export const discoverMdxAssetReferences = ({
  document,
  sourcePath,
  assetIdsByPath,
}: {
  document: MdxDocument;
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
}): AssetValueReference[] => {
  const references = discoverAssetValueReferences({
    properties: document.frontmatter.properties,
    sourcePath,
    assetIdsByPath,
    rootPath: ["frontmatter", "properties"],
  });
  const resolveAssetReference = createAssetReferenceResolver({
    sourcePath,
    assetIdsByPath,
  });
  const visit = (
    nodes: readonly MdxAuthoredNode[],
    parentPath: Array<string | number>
  ) => {
    for (const [nodeIndex, node] of nodes.entries()) {
      if (node.type === "text" || node.type === "comment") {
        continue;
      }
      const nodePath = [...parentPath, nodeIndex];
      for (const [propIndex, prop] of node.props.entries()) {
        if (
          typeof prop.value !== "string" ||
          urlPropNames.has(prop.name.toLowerCase()) === false
        ) {
          continue;
        }
        const reference = resolveAssetReference(prop.value);
        if (reference !== undefined) {
          references.push({
            path: [...nodePath, "props", propIndex, "value"],
            ...reference,
          });
        }
      }
      visit(node.children, [...nodePath, "children"]);
    }
  };
  visit(document.children, ["children"]);
  return references;
};

export const parseMdxDocument = async ({
  source,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
}: {
  source: string;
  maximumBytes?: number;
}): Promise<MdxDocument> => {
  if (
    Number.isInteger(maximumBytes) === false ||
    maximumBytes <= 0 ||
    maximumBytes > contentEngineLimits.hydratedFileBytes ||
    getUtf8ByteLength(source) > maximumBytes
  ) {
    throw new MdxDocumentError({
      code: "invalid-mdx",
      message: "MDX content exceeds the byte limit",
    });
  }

  let root: SyntaxTreeNode;
  try {
    root = parseMarkdownAst(source, "mdx");
  } catch (cause) {
    throw new MdxDocumentError({
      code: "invalid-mdx",
      message: getErrorMessage(cause),
      sourceRange: getParserErrorSourceRange(cause),
      cause,
    });
  }
  validateAstLimits(root);

  let properties: Record<string, unknown>;
  try {
    properties = (await extractMarkdownFrontmatter(source)).properties;
  } catch (cause) {
    throw new MdxDocumentError({
      code: "invalid-mdx",
      message: getErrorMessage(cause),
      sourceRange: toSourceRange(
        getSyntaxTreeChildren(root).find((node) => node.type === "yaml")
          ?.position
      ),
      cause,
    });
  }

  const frontmatterNode = getSyntaxTreeChildren(root).find(
    (node) => node.type === "yaml"
  );
  return {
    frontmatter: {
      properties,
      sourceRange: toSourceRange(frontmatterNode?.position),
    },
    children: mapAuthoredChildren(root),
  };
};

export { serializeMdxDocument } from "./mdx-serialization";
