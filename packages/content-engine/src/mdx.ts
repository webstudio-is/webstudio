import {
  defaultHandlers,
  toHast,
  type Handler,
  type Handlers,
} from "mdast-util-to-hast";
import { parse, postprocess, preprocess } from "micromark";
import { mdxjs } from "micromark-extension-mdxjs";
import {
  discoverAssetValueReferences,
  resolveAssetValueReferences,
  type AssetValueReference,
} from "./asset-value-references";
import {
  createAssetReferenceResolver,
  createNamedAssetReferenceContext,
} from "./asset-reference-utils";
import { createUniqueAssetIdsByPath } from "./asset-path-resolution";
import { getInstancePropName } from "./jsx-attributes";
import { getUtf8ByteLength } from "./byte-stream";
import { extractMarkdownFrontmatter } from "./frontmatter";
import { contentEngineLimits } from "./limits";
import {
  getSyntaxTreeChildren,
  isSyntaxTreeNode,
  parseMarkdownAst,
  type SyntaxTreeNode,
} from "./markdown-ast";
import {
  findMarkdownFrontmatter,
  markdownByteOrderMark,
} from "./markdown-scanner";
import {
  serializeMdxDocument,
  serializeMdxFrontmatter,
} from "./mdx-serialization";

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
  sourceRange?: MdxSourceRange;
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
      type: "opaque";
      value: string;
      mdxMode: MdxMode;
      sourceRange: MdxSourceRange;
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

export const createMdxCodeBlock = ({
  value,
  language,
}: {
  value: string;
  language?: string;
}): MdxAuthoredNode => ({
  type: "element",
  syntax: "markdown",
  tag: "pre",
  props: [],
  children: [
    {
      type: "element",
      syntax: "markdown",
      tag: "code",
      props:
        language === undefined
          ? []
          : [{ name: "class", value: `language-${language}` }],
      children: [{ type: "text", value: `${value}\n` }],
      preserveTextWhitespace: true,
    },
  ],
});

export const readMdxCodeBlock = (node: MdxAuthoredNode) => {
  if (
    node.type !== "element" ||
    node.syntax !== "markdown" ||
    node.tag !== "pre" ||
    node.props.length !== 0 ||
    node.children.length !== 1
  ) {
    return;
  }
  const code = node.children[0];
  if (
    code?.type !== "element" ||
    code.syntax !== "markdown" ||
    code.tag !== "code" ||
    code.children.length !== 1 ||
    code.children[0]?.type !== "text" ||
    code.props.length > 1
  ) {
    return;
  }
  const className = code.props[0];
  if (
    className !== undefined &&
    (className.name !== "class" ||
      typeof className.value !== "string" ||
      className.value.startsWith("language-") === false)
  ) {
    return;
  }
  const language =
    typeof className?.value === "string"
      ? className.value.slice("language-".length)
      : undefined;
  if (language !== undefined && language.length === 0) {
    return;
  }
  const value = code.children[0].value;
  return {
    value: value.endsWith("\n") ? value.slice(0, -1) : value,
    language,
  };
};

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

export type MdxSourceDiagnostic =
  | Readonly<{
      code: "invalid-mdx";
      severity: "error";
      message: string;
      sourceRange?: MdxSourceRange;
    }>
  | Readonly<{
      code: "unsafe-mdx";
      severity: "warning";
      message: string;
      nodeType?: string;
      reason?: string;
      sourceRange?: MdxSourceRange;
    }>;

/** Maps parser failures to the shared diagnostics contract used by every MDX consumer. */
export const createMdxSourceDiagnostics = (
  errors: readonly MdxDocumentError[]
): MdxSourceDiagnostic[] =>
  errors.map((error) =>
    error.code === "invalid-mdx"
      ? {
          code: error.code,
          severity: "error",
          message: error.message,
          sourceRange: error.sourceRange,
        }
      : {
          code: error.code,
          severity: "warning",
          message: error.reason ?? error.message,
          nodeType: error.nodeType,
          reason: error.reason,
          sourceRange: error.sourceRange,
        }
  );

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

const addMdxJsxAttributePositions = (root: SyntaxTreeNode, source: string) => {
  if (source.includes("<ws.element") === false) {
    return;
  }
  let ranges: Array<{ start: unknown; end: unknown }>;
  try {
    ranges = postprocess(
      parse({ extensions: [mdxjs()] })
        .document()
        .write(preprocess()(source, undefined, true))
    ).flatMap(([phase, token]) => {
      const tokenType: string = token.type;
      return phase === "enter" &&
        (tokenType === "mdxJsxFlowTagAttribute" ||
          tokenType === "mdxJsxTextTagAttribute" ||
          tokenType === "mdxJsxFlowTagExpressionAttribute" ||
          tokenType === "mdxJsxTextTagExpressionAttribute")
        ? [{ start: token.start, end: token.end }]
        : [];
    });
  } catch {
    // Source validation remains owned by the document parser. Location
    // enrichment must not make otherwise recoverable MDX unrecoverable.
    return;
  }
  const visit = (node: SyntaxTreeNode) => {
    const nodeRange = toSourceRange(node.position);
    if (nodeRange !== undefined && Array.isArray(node.attributes)) {
      let rangeIndex = ranges.findIndex(({ start }) => {
        const point = toSourcePoint(start);
        return (point?.offset ?? -1) >= (nodeRange.start.offset ?? 0);
      });
      for (const attribute of node.attributes) {
        if (isSyntaxTreeNode(attribute) === false || rangeIndex < 0) {
          continue;
        }
        const range = ranges[rangeIndex];
        const end = toSourcePoint(range?.end);
        if (
          range === undefined ||
          end === undefined ||
          (end.offset ?? source.length + 1) >
            (nodeRange.end.offset ?? source.length)
        ) {
          break;
        }
        attribute.position = range;
        rangeIndex += 1;
      }
    }
    for (const child of getSyntaxTreeChildren(node)) {
      visit(child);
    }
  };
  visit(root);
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

const validateStaticProp = (
  node: SyntaxTreeNode,
  prop: MdxAuthoredProp,
  fallbackNode?: SyntaxTreeNode
) => {
  const normalizedName = prop.name.toLowerCase();
  if (
    normalizedName.startsWith("on") ||
    normalizedName === "srcdoc" ||
    normalizedName === "dangerouslysetinnerhtml" ||
    normalizedName === "srcset"
  ) {
    throwUnsafeNode(
      node,
      `MDX JSX prop ${prop.name} is not supported`,
      fallbackNode
    );
  }
  if (
    urlPropNames.has(normalizedName) &&
    typeof prop.value === "string" &&
    isSafeStaticUrl(prop.value, normalizedName) === false
  ) {
    throwUnsafeNode(
      node,
      `MDX JSX prop ${prop.name} contains an unsafe URL`,
      fallbackNode
    );
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

type MapHastOptions = {
  shouldOmitUnsafePart?: (error: MdxDocumentError) => boolean;
};

const canOmitUnsafePart = (error: unknown, options: MapHastOptions) =>
  error instanceof MdxDocumentError &&
  error.code === "unsafe-mdx" &&
  options.shouldOmitUnsafePart?.(error) === true;

const mapStaticProps = (node: SyntaxTreeNode, options: MapHastOptions = {}) => {
  if (Array.isArray(node.attributes) === false) {
    return [];
  }
  const props: MdxAuthoredProp[] = [];
  const names = new Set<string>();
  for (const attribute of node.attributes) {
    try {
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
      const prop = {
        name: attribute.name,
        value: attribute.value === null ? true : attribute.value,
        sourceRange: toSourceRange(attribute.position),
      } as const;
      validateStaticProp(attribute, prop, node);
      names.add(attribute.name);
      props.push(prop);
    } catch (error) {
      if (canOmitUnsafePart(error, options)) {
        continue;
      }
      throw error;
    }
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

const createMdxJsxElementHandler =
  (options: MapHastOptions = {}): Handler =>
  (state, value) => {
    const node = value as SyntaxTreeNode;
    if (node.name !== "ws.element") {
      return throwUnsafeNode(
        node,
        "Only the ws.element component is supported in authored MDX"
      );
    }
    const staticProps = mapStaticProps(node, options);
    const properties = Object.fromEntries(
      staticProps.map((prop) => [prop.name, prop.value])
    );
    const result = state(value, "ws.element", properties, state.all(value));
    if (isSyntaxTreeNode(result)) {
      setHastData(result, {
        mdxMode: getMdxMode(node),
        mdxPropSourceRanges: Object.fromEntries(
          staticProps.flatMap((prop) =>
            prop.sourceRange === undefined
              ? []
              : [[prop.name, prop.sourceRange]]
          )
        ),
      });
    }
    return result;
  };

const mapMdxJsxElement = createMdxJsxElementHandler();

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

const createRecoveringHandlers = ({
  source,
  diagnostics,
}: {
  source: string;
  diagnostics: MdxDocumentError[];
}) => {
  const recover =
    (handler: Handler): Handler =>
    (state, value, parent) => {
      try {
        return handler(state, value, parent);
      } catch (error) {
        if (
          error instanceof MdxDocumentError === false ||
          error.code !== "unsafe-mdx"
        ) {
          throw error;
        }
        const node = value as SyntaxTreeNode;
        const sourceRange = error.sourceRange ?? toSourceRange(node.position);
        const start = sourceRange?.start.offset;
        const end = sourceRange?.end.offset;
        if (start === undefined || end === undefined) {
          throw error;
        }
        diagnostics.push(error);
        const opaque = {
          type: "opaque",
          value: source.slice(start, end),
          data: { mdxMode: getMdxMode(node) },
        } as const;
        state.patch(value, opaque as never);
        return opaque as never;
      }
    };
  const shouldOmitUnsafePart = (error: MdxDocumentError) => {
    diagnostics.push(error);
    return true;
  };
  const handlers = Object.fromEntries(
    Object.entries(mdxHandlers).map(([name, handler]) => [
      name,
      recover(handler),
    ])
  ) as Handlers;
  handlers.mdxJsxFlowElement = createMdxJsxElementHandler({
    shouldOmitUnsafePart,
  });
  handlers.mdxJsxTextElement = createMdxJsxElementHandler({
    shouldOmitUnsafePart,
  });
  return {
    handlers,
    unknownHandler: recover(rejectUnsupportedNode),
    shouldOmitUnsafePart,
  };
};

const createMarkdownHastForMdx = (root: SyntaxTreeNode) => {
  const hast = toHast(root as Parameters<typeof toHast>[0], {
    allowDangerousHtml: true,
    handlers: {
      code: mdxHandlers.code,
      inlineCode: mdxHandlers.inlineCode,
      listItem: mdxHandlers.listItem,
    },
    unknownHandler: rejectUnsupportedNode,
  });
  if (isSyntaxTreeNode(hast) === false) {
    return throwUnsafeNode(root, "Markdown did not produce an HTML document");
  }
  return hast;
};

const findHastMdxMode = (node: SyntaxTreeNode): MdxMode | undefined => {
  if (
    isRecord(node.data) &&
    (node.data.mdxMode === "flow" || node.data.mdxMode === "text")
  ) {
    return node.data.mdxMode;
  }
};

const mapHastProperties = (
  node: SyntaxTreeNode,
  options: MapHastOptions,
  preserveJsxNames: boolean,
  allowAliasedPropertyNames = false
) => {
  if (node.properties === undefined) {
    return { props: [], requiresMdxFallback: false };
  }
  if (isRecord(node.properties) === false) {
    return throwUnsafeNode(node, "HTML properties must be an object");
  }
  const props: MdxAuthoredProp[] = [];
  const propertyNames = new Set<string>();
  let requiresMdxFallback = false;
  const mdxPropSourceRanges =
    isRecord(node.data) && isRecord(node.data.mdxPropSourceRanges)
      ? node.data.mdxPropSourceRanges
      : undefined;
  for (const [propertyName, value] of Object.entries(node.properties)) {
    try {
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
        return throwUnsafeNode(
          node,
          `HTML property ${propertyName} is invalid`
        );
      }
      const instancePropName = getInstancePropName({
        jsxPropName: propertyName,
        acceptsHtmlAttributes: true,
      });
      if (
        allowAliasedPropertyNames === false &&
        propertyNames.has(instancePropName)
      ) {
        return throwUnsafeNode(node, "HTML properties must be unique");
      }
      const name = preserveJsxNames ? propertyName : instancePropName;
      const sourceRange =
        mdxPropSourceRanges === undefined
          ? undefined
          : toSourceRange(mdxPropSourceRanges[propertyName]);
      const prop: MdxAuthoredProp = {
        name,
        value: propValue,
        ...(sourceRange === undefined ? {} : { sourceRange }),
      };
      validateStaticProp(node, prop);
      propertyNames.add(instancePropName);
      props.push(prop);
    } catch (error) {
      if (canOmitUnsafePart(error, options)) {
        requiresMdxFallback ||=
          (node.tagName === "a" && propertyName === "href") ||
          (node.tagName === "img" && propertyName === "src");
        continue;
      }
      throw error;
    }
  }
  return { props, requiresMdxFallback };
};

const mapHastChildren = (
  node: SyntaxTreeNode,
  options: MapHastOptions = {}
): MdxAuthoredNode[] => {
  const children: MdxAuthoredNode[] = [];
  for (const child of getSyntaxTreeChildren(node)) {
    if (
      child.position === undefined &&
      child.type === "text" &&
      child.value === "\n"
    ) {
      continue;
    }
    try {
      children.push(mapHastNode(child, options));
    } catch (error) {
      if (canOmitUnsafePart(error, options)) {
        continue;
      }
      throw error;
    }
  }
  return children;
};

const getHastMdxMode = (node: SyntaxTreeNode) => {
  const mode = findHastMdxMode(node);
  if (mode !== undefined) {
    return mode;
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
  props: readonly MdxAuthoredProp[],
  options: MapHastOptions
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
      children: mapHastChildren(node, options),
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
    props: props
      .filter((prop) => prop.name !== "ws:tag")
      .map((prop) => ({
        ...prop,
        name: getInstancePropName({
          jsxPropName: prop.name,
          acceptsHtmlAttributes: true,
        }),
      })),
    children: mapHastChildren(node, options),
    mdxMode: getHastMdxMode(node),
  });
};

const mapHastNode = (
  node: SyntaxTreeNode,
  options: MapHastOptions
): MdxAuthoredNode => {
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
  if (
    node.type === "opaque" &&
    typeof node.value === "string" &&
    (node.data as { mdxMode?: unknown } | undefined)?.mdxMode !== undefined
  ) {
    return {
      type: "opaque",
      value: node.value,
      mdxMode: getHastMdxMode(node),
      sourceRange:
        toSourceRange(node.position) ??
        throwUnsafeNode(node, "Opaque MDX source location is missing"),
    };
  }
  if (node.type !== "element" || typeof node.tagName !== "string") {
    return throwUnsafeNode(
      node,
      `HTML node type ${node.type} is not supported`
    );
  }
  const authoredMdxMode = findHastMdxMode(node);
  if (
    node.tagName !== "ws.element" &&
    authoredMdxMode !== undefined &&
    unsupportedElementTags.has(node.tagName.toLowerCase())
  ) {
    return throwUnsafeNode(
      node,
      `Webstudio element tag ${node.tagName} is not supported`
    );
  }
  const { props, requiresMdxFallback } = mapHastProperties(
    node,
    options,
    node.tagName === "ws.element",
    node.tagName === "ws.element" &&
      isRecord(node.properties) &&
      Object.hasOwn(node.properties, "ws:name")
  );
  if (node.tagName === "ws.element") {
    return mapWebstudioElement(node, props, options);
  }
  let mdxMode = authoredMdxMode ?? (requiresMdxFallback ? "text" : undefined);
  const children = mapHastChildren(node, options);
  const onlyChild = children.length === 1 ? children[0] : undefined;
  if (
    mdxMode === undefined &&
    node.tagName === "p" &&
    onlyChild !== undefined &&
    ((onlyChild.type === "element" &&
      onlyChild.syntax === "mdx" &&
      onlyChild.mdxMode === "text") ||
      (onlyChild.type === "template" && onlyChild.mdxMode === "text") ||
      (onlyChild.type === "comment" && onlyChild.mdxMode === "text"))
  ) {
    mdxMode = "flow";
  }
  return createElement({
    node,
    tag: node.tagName,
    props,
    children,
    mdxMode,
    markdownListItem: getMarkdownListItem(node),
    preserveTextWhitespace: preservesTextWhitespace(node),
  });
};

const mapAuthoredChildren = (
  root: SyntaxTreeNode,
  options: {
    handlers?: Handlers;
    unknownHandler?: Handler;
    shouldOmitUnsafePart?: (error: MdxDocumentError) => boolean;
  } = {}
) => {
  const hast = toHast(root as Parameters<typeof toHast>[0], {
    handlers: options.handlers ?? mdxHandlers,
    unknownHandler: options.unknownHandler ?? rejectUnsupportedNode,
  });
  if (isSyntaxTreeNode(hast) === false || hast.type !== "root") {
    return throwUnsafeNode(root, "MDX did not produce an HTML document");
  }
  return mapHastChildren(hast, {
    shouldOmitUnsafePart: options.shouldOmitUnsafePart,
  });
};

const validateMdxSourceBytes = ({
  source,
  maximumBytes,
}: {
  source: string;
  maximumBytes: number;
}) => {
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
};

const parseMdxFrontmatter = async (
  root: SyntaxTreeNode,
  source: string
): Promise<MdxDocument["frontmatter"]> => {
  const frontmatterNode = getSyntaxTreeChildren(root).find(
    (node) => node.type === "yaml"
  );
  try {
    return {
      properties: (await extractMarkdownFrontmatter(source)).properties,
      sourceRange: toSourceRange(frontmatterNode?.position),
    };
  } catch (cause) {
    throw new MdxDocumentError({
      code: "invalid-mdx",
      message: getErrorMessage(cause),
      sourceRange: toSourceRange(frontmatterNode?.position),
      cause,
    });
  }
};

/** Converts bounded Markdown through a caller-supplied structural HAST transform. */
export const createMdxDocumentFromMarkdown = async ({
  source,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
  transformHast,
  shouldOmitUnsafePart,
}: {
  source: string;
  maximumBytes?: number;
  transformHast: (input: {
    sourceRoot: SyntaxTreeNode;
    hastRoot: SyntaxTreeNode;
  }) => SyntaxTreeNode | Promise<SyntaxTreeNode>;
  shouldOmitUnsafePart?: (error: MdxDocumentError) => boolean;
}): Promise<MdxDocument> => {
  validateMdxSourceBytes({ source, maximumBytes });
  const sourceRoot = parseMarkdownAst(source);
  validateAstLimits(sourceRoot);
  const hastRoot = await transformHast({
    sourceRoot,
    hastRoot: createMarkdownHastForMdx(sourceRoot),
  });
  validateAstLimits(hastRoot);
  return {
    frontmatter: await parseMdxFrontmatter(sourceRoot, source),
    children: mapHastChildren(hastRoot, { shouldOmitUnsafePart }),
  };
};

export const discoverMdxBodyAssetReferences = ({
  document,
  sourcePath,
  assetIdsByPath,
}: {
  document: MdxDocument;
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
}): AssetValueReference[] => {
  const references: AssetValueReference[] = [];
  const resolveAssetReference = createAssetReferenceResolver({
    sourcePath,
    assetIdsByPath,
  });
  const visit = (
    nodes: readonly MdxAuthoredNode[],
    parentPath: Array<string | number>
  ) => {
    for (const [nodeIndex, node] of nodes.entries()) {
      if (
        node.type === "text" ||
        node.type === "comment" ||
        node.type === "opaque"
      ) {
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

export const discoverMdxAssetReferences = ({
  document,
  sourcePath,
  assetIdsByPath,
}: {
  document: MdxDocument;
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
}): AssetValueReference[] => [
  ...discoverAssetValueReferences({
    properties: document.frontmatter.properties,
    sourcePath,
    assetIdsByPath,
    rootPath: ["frontmatter", "properties"],
  }),
  ...discoverMdxBodyAssetReferences({
    document,
    sourcePath,
    assetIdsByPath,
  }),
];

export const discoverNamedMdxAssetReferences = ({
  document,
  source,
  assets,
}: {
  document: MdxDocument;
  source: { name: string; folderNames: readonly string[] };
  assets: Iterable<{
    id: string;
    name: string;
    folderNames: readonly string[];
  }>;
}) =>
  discoverMdxAssetReferences({
    document,
    ...createNamedAssetReferenceContext({ source, assets }),
  });

export const rewriteMdxAssetReferences = async ({
  source,
  sourcePath,
  assetPaths,
  replacementPaths,
}: {
  source: string;
  sourcePath: string;
  assetPaths: ReadonlyMap<string, string>;
  replacementPaths: ReadonlyMap<string, string>;
}) => {
  const document = await parseMdxDocument({ source });
  const references = discoverMdxAssetReferences({
    document,
    sourcePath,
    assetIdsByPath: createUniqueAssetIdsByPath(
      Array.from(assetPaths, ([id, path]) => ({ id, path }))
    ),
  });
  if (references.length === 0) {
    return source;
  }
  return serializeMdxDocument(
    resolveAssetValueReferences({
      value: document,
      references,
      runtimeAssets: Object.fromEntries(
        Array.from(replacementPaths, ([id, url]) => [id, { url }])
      ),
    })
  );
};

export const parseMdxDocument = async ({
  source,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
}: {
  source: string;
  maximumBytes?: number;
}): Promise<MdxDocument> => {
  validateMdxSourceBytes({ source, maximumBytes });

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
  addMdxJsxAttributePositions(root, source);
  validateAstLimits(root);

  return {
    frontmatter: await parseMdxFrontmatter(root, source),
    children: mapAuthoredChildren(root),
  };
};

export type MdxDocumentRecoveryResult =
  | Readonly<{
      status: "parsed";
      document: MdxDocument;
      diagnostics: readonly MdxDocumentError[];
    }>
  | Readonly<{
      status: "unrecoverable";
      diagnostics: readonly MdxDocumentError[];
    }>;

export const parseMdxDocumentRecovering = async ({
  source,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
}: {
  source: string;
  maximumBytes?: number;
}): Promise<MdxDocumentRecoveryResult> => {
  try {
    validateMdxSourceBytes({ source, maximumBytes });
    const root = parseMarkdownAst(source, "mdx");
    addMdxJsxAttributePositions(root, source);
    validateAstLimits(root);
    const diagnostics: MdxDocumentError[] = [];
    const recovery = createRecoveringHandlers({ source, diagnostics });
    return {
      status: "parsed",
      document: {
        frontmatter: await parseMdxFrontmatter(root, source),
        children: mapAuthoredChildren(root, recovery),
      },
      diagnostics,
    };
  } catch (cause) {
    const error =
      cause instanceof MdxDocumentError
        ? cause
        : new MdxDocumentError({
            code: "invalid-mdx",
            message: getErrorMessage(cause),
            sourceRange: getParserErrorSourceRange(cause),
            cause,
          });
    return { status: "unrecoverable", diagnostics: [error] };
  }
};

const withMarkdownSyntax = (node: MdxAuthoredNode): MdxAuthoredNode => {
  if (node.type !== "element" || node.syntax !== "mdx") {
    return node;
  }
  const { mdxMode: _mdxMode, ...element } = node;
  return {
    ...element,
    syntax: "markdown",
  };
};

const withMarkdownSyntaxDeep = (node: MdxAuthoredNode): MdxAuthoredNode => {
  if (
    node.type === "text" ||
    node.type === "comment" ||
    node.type === "opaque"
  ) {
    return node;
  }
  return withMarkdownSyntax({
    ...node,
    children: node.children.map(withMarkdownSyntaxDeep),
  });
};

const parseMarkdownCandidate = async (
  nodes: readonly MdxAuthoredNode[],
  cache?: Map<string, Promise<readonly MdxAuthoredNode[] | undefined>>
): Promise<readonly MdxAuthoredNode[] | undefined> => {
  const source = serializeMdxDocument({
    frontmatter: { properties: {} },
    children: nodes,
  });
  const cached = cache?.get(source);
  if (cached !== undefined) {
    return cached;
  }
  const result = parseMdxDocument({ source }).then(
    ({ children }) => children,
    () => undefined
  );
  cache?.set(source, result);
  return result;
};

const areAuthoredPropsEqual = (
  left: readonly MdxAuthoredProp[],
  right: readonly MdxAuthoredProp[]
) => {
  if (left.length !== right.length) {
    return false;
  }
  const leftByName = new Map(left.map((prop) => [prop.name, prop.value]));
  const rightByName = new Map(right.map((prop) => [prop.name, prop.value]));
  return (
    leftByName.size === left.length &&
    rightByName.size === right.length &&
    Array.from(leftByName).every(
      ([name, value]) => rightByName.get(name) === value
    )
  );
};

const unwrapSingleParagraph = (nodes: readonly MdxAuthoredNode[]) => {
  const onlyChild = nodes.length === 1 ? nodes[0] : undefined;
  return onlyChild?.type === "element" &&
    onlyChild.syntax === "markdown" &&
    onlyChild.tag === "p" &&
    onlyChild.props.length === 0
    ? onlyChild.children
    : nodes;
};

const areAuthoredNodesEquivalent = (
  left: MdxAuthoredNode,
  right: MdxAuthoredNode
): boolean => {
  if (left.type !== right.type) {
    return false;
  }
  if (left.type === "text" && right.type === "text") {
    return left.value === right.value;
  }
  if (left.type === "comment" && right.type === "comment") {
    return left.value === right.value;
  }
  if (left.type === "template" && right.type === "template") {
    return (
      left.name === right.name &&
      areAuthoredPropsEqual(left.props, right.props) &&
      areAuthoredNodeListsEquivalent(left.children, right.children, false)
    );
  }
  if (left.type === "element" && right.type === "element") {
    return (
      left.tag === right.tag &&
      areAuthoredPropsEqual(left.props, right.props) &&
      areAuthoredNodeListsEquivalent(
        left.children,
        right.children,
        left.tag !== "p"
      )
    );
  }
  return false;
};

const areAuthoredNodeListsEquivalent = (
  left: readonly MdxAuthoredNode[],
  right: readonly MdxAuthoredNode[],
  allowParagraphWrapper: boolean
) => {
  const normalizedLeft = allowParagraphWrapper
    ? unwrapSingleParagraph(left)
    : left;
  const normalizedRight = allowParagraphWrapper
    ? unwrapSingleParagraph(right)
    : right;
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((node, index) => {
      const other = normalizedRight[index];
      return other !== undefined && areAuthoredNodesEquivalent(node, other);
    })
  );
};

const findCanonicalMarkdownElement = ({
  candidate,
  nodes,
}: {
  candidate: Extract<MdxAuthoredNode, { type: "element" }>;
  nodes: readonly MdxAuthoredNode[] | undefined;
}) => {
  const direct = nodes?.length === 1 ? nodes[0] : undefined;
  const wrapped =
    direct?.type === "element" &&
    direct.syntax === "markdown" &&
    direct.tag === "p" &&
    direct.props.length === 0 &&
    direct.children.length === 1
      ? direct.children[0]
      : undefined;
  for (const node of [direct, wrapped]) {
    if (
      node?.type === "element" &&
      node.syntax === "markdown" &&
      areAuthoredNodesEquivalent(candidate, node)
    ) {
      return node;
    }
  }
};

const preferMarkdownNode = async (
  node: MdxAuthoredNode,
  cache: Map<string, Promise<readonly MdxAuthoredNode[] | undefined>>
): Promise<MdxAuthoredNode> => {
  if (
    node.type === "text" ||
    node.type === "comment" ||
    node.type === "opaque"
  ) {
    return node;
  }
  const children = await preferMarkdownNodes(node.children, cache);
  const withChildren = { ...node, children };
  if (withChildren.type !== "element" || withChildren.syntax !== "mdx") {
    return withChildren;
  }

  const candidate = withMarkdownSyntaxDeep(withChildren);
  const parsed = await parseMarkdownCandidate([candidate], cache);
  const markdownElement = findCanonicalMarkdownElement({
    candidate: withChildren,
    nodes: parsed,
  });
  if (markdownElement !== undefined) {
    return markdownElement;
  }
  return withChildren;
};

const preferMarkdownNodes = async (
  nodes: readonly MdxAuthoredNode[],
  cache: Map<string, Promise<readonly MdxAuthoredNode[] | undefined>>
): Promise<MdxAuthoredNode[]> => {
  const result: MdxAuthoredNode[] = [];
  for (const node of nodes) {
    result.push(await preferMarkdownNode(node, cache));
  }
  return result;
};

/**
 * Canonicalizes generic elements through the Markdown serializer and parser.
 * Elements recognized by Markdown use Markdown syntax. Templates and elements
 * without a Markdown representation keep their MDX syntax.
 */
export const preferMarkdownSyntax = async (
  document: MdxDocument
): Promise<MdxDocument> => {
  const cache = new Map<
    string,
    Promise<readonly MdxAuthoredNode[] | undefined>
  >();
  const preferredChildren = await preferMarkdownNodes(document.children, cache);
  const reparsed = await parseMarkdownCandidate(preferredChildren, cache);
  if (reparsed !== undefined) {
    return { ...document, children: reparsed };
  }
  return document;
};

/** Updates frontmatter without canonicalizing or otherwise rewriting the body. */
export const replaceMdxFrontmatter = async ({
  source,
  properties,
}: {
  source: string;
  properties: Readonly<Record<string, unknown>>;
}) => {
  const replacement = serializeMdxFrontmatter(properties);
  // Validate the complete value and the serialized byte limits without parsing
  // the MDX body. A malformed body must remain independently editable.
  await extractMarkdownFrontmatter(replacement);

  const encoder = new TextEncoder();
  const bytes = encoder.encode(source);
  const range = findMarkdownFrontmatter(bytes, true);
  const hasByteOrderMark = markdownByteOrderMark.every(
    (value, index) => bytes[index] === value
  );
  const prefix = hasByteOrderMark ? "\uFEFF" : "";
  if (range === null || range === undefined) {
    return prefix + replacement + source.slice(prefix.length);
  }

  const bodyStart = new TextDecoder("utf-8", { ignoreBOM: true }).decode(
    bytes.subarray(0, range.blockEnd)
  ).length;
  const suffix = source.slice(bodyStart);
  const separatorLength = suffix.startsWith("\r\n\r\n")
    ? 4
    : suffix.startsWith("\n\n")
      ? 2
      : suffix.startsWith("\r\n")
        ? 2
        : suffix.startsWith("\n")
          ? 1
          : 0;
  return prefix + replacement + suffix.slice(separatorLength);
};

export { serializeMdxDocument };
export { createCanonicalAssetPath } from "./asset-path";
