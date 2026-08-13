import {
  defaultHandlers,
  toMdast,
  type Handle,
  type NodeHandle,
} from "hast-util-to-mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { mdxExpressionToMarkdown } from "mdast-util-mdx-expression";
import {
  mdxJsxToMarkdown,
  type MdxJsxAttribute,
  type MdxJsxFlowElement,
  type MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import { toMarkdown } from "mdast-util-to-markdown";
import { stringify as stringifyYaml } from "yaml";
import type { MdxAuthoredNode, MdxAuthoredProp, MdxDocument } from "./mdx";

type SerializationMode = "flow" | "text";
type SerializationContext =
  | SerializationMode
  | "jsx-text"
  | "list"
  | "pre"
  | "table"
  | "table-row"
  | "table-cell"
  | "task";

type SerializationNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  value?: string;
  children?: SerializationNode[];
  data?: {
    listItemSpread?: boolean;
    mode?: SerializationMode;
    props?: readonly MdxAuthoredProp[];
  };
};

type ElementNode = Extract<MdxAuthoredNode, { type: "element" }>;

const flowTags = new Set([
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "ol",
  "p",
  "pre",
  "table",
  "ul",
]);
const textTags = new Set(["a", "br", "code", "del", "em", "img", "strong"]);
const noPropTags = new Set([
  "blockquote",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "strong",
]);
const nonEmptyMarkdownTags = new Set([
  "blockquote",
  "del",
  "em",
  "p",
  "strong",
]);

const getProp = (node: ElementNode, name: string) =>
  node.props.find((prop) => prop.name === name)?.value;

const hasOnlyProps = (node: ElementNode, names: readonly string[]) =>
  new Set(node.props.map((prop) => prop.name)).size === node.props.length &&
  node.props.every((prop) => names.includes(prop.name));

const hasOnlyTextChildren = (node: ElementNode) =>
  node.children.every((child) => child.type === "text");

const isTaskInput = (node: ElementNode) =>
  node.tag === "input" &&
  node.children.length === 0 &&
  getProp(node, "type") === "checkbox" &&
  getProp(node, "disabled") === true &&
  (getProp(node, "checked") === undefined ||
    getProp(node, "checked") === true) &&
  hasOnlyProps(node, ["type", "checked", "disabled"]);

const getTaskParagraph = (node: ElementNode) => {
  const first = node.children[0];
  if (first?.type === "element" && isTaskInput(first)) {
    return { input: first, rest: node.children.slice(1), wrapped: false };
  }
  const nestedInput = first?.type === "element" ? first.children[0] : undefined;
  if (
    first?.type === "element" &&
    first.tag === "p" &&
    first.props.length === 0 &&
    nestedInput?.type === "element" &&
    isTaskInput(nestedInput)
  ) {
    return {
      input: nestedInput,
      rest: first.children.slice(1),
      wrapped: true,
    };
  }
};

const isTaskList = (node: ElementNode) =>
  node.children.some(
    (child) =>
      child.type === "element" &&
      child.tag === "li" &&
      getProp(child, "class") === "task-list-item"
  );

const hasMatchingTaskListClass = (node: ElementNode) =>
  getProp(node, "class") ===
  (isTaskList(node) ? "contains-task-list" : undefined);

const isTableCell = (node: MdxAuthoredNode, tag: "td" | "th") => {
  if (node.type !== "element" || node.tag !== tag) {
    return false;
  }
  const align = getProp(node, "align");
  return (
    (align === undefined ||
      align === "left" ||
      align === "center" ||
      align === "right") &&
    hasOnlyProps(node, ["align"])
  );
};

const isTableRow = (node: MdxAuthoredNode, cellTag: "td" | "th") =>
  node.type === "element" &&
  node.tag === "tr" &&
  node.props.length === 0 &&
  node.children.length > 0 &&
  node.children.every((child) => isTableCell(child, cellTag));

const isMarkdownTable = (node: ElementNode) => {
  const [head, body, extra] = node.children;
  if (
    node.props.length > 0 ||
    extra !== undefined ||
    head?.type !== "element" ||
    head.tag !== "thead" ||
    head.props.length > 0 ||
    head.children.length !== 1 ||
    isTableRow(head.children[0], "th") === false ||
    (body !== undefined &&
      (body.type !== "element" ||
        body.tag !== "tbody" ||
        body.props.length > 0 ||
        body.children.every((row) => isTableRow(row, "td")) === false))
  ) {
    return false;
  }
  const heading = head.children[0];
  if (heading.type !== "element") {
    return false;
  }
  const rows = body?.type === "element" ? body.children : [];
  return rows.every(
    (row) =>
      row.type === "element" &&
      row.children.length === heading.children.length &&
      row.children.every(
        (cell, index) =>
          cell.type === "element" &&
          heading.children[index]?.type === "element" &&
          getProp(cell, "align") === getProp(heading.children[index], "align")
      )
  );
};

const isMarkdownElement = (
  node: ElementNode,
  context: SerializationContext
): boolean => {
  const allowedByContext =
    (context === "flow" && flowTags.has(node.tag)) ||
    (context === "text" && textTags.has(node.tag)) ||
    (context === "list" && node.tag === "li") ||
    (context === "pre" && node.tag === "code") ||
    (context === "table" && (node.tag === "thead" || node.tag === "tbody")) ||
    (context === "table-row" && node.tag === "tr") ||
    (context === "table-cell" && (node.tag === "th" || node.tag === "td")) ||
    (context === "task" && node.tag === "input");
  if (allowedByContext === false) {
    return false;
  }
  if (noPropTags.has(node.tag)) {
    return (
      node.props.length === 0 &&
      (nonEmptyMarkdownTags.has(node.tag) === false || node.children.length > 0)
    );
  }
  if (node.tag === "br" || node.tag === "hr") {
    return node.props.length === 0 && node.children.length === 0;
  }
  if (node.tag === "a") {
    return (
      node.children.length > 0 &&
      typeof getProp(node, "href") === "string" &&
      (getProp(node, "title") === undefined ||
        typeof getProp(node, "title") === "string") &&
      hasOnlyProps(node, ["href", "title"])
    );
  }
  if (node.tag === "img") {
    return (
      node.children.length === 0 &&
      typeof getProp(node, "src") === "string" &&
      (getProp(node, "alt") === undefined ||
        typeof getProp(node, "alt") === "string") &&
      (getProp(node, "title") === undefined ||
        typeof getProp(node, "title") === "string") &&
      hasOnlyProps(node, ["src", "alt", "title"])
    );
  }
  if (node.tag === "code") {
    const className = getProp(node, "class");
    return (
      hasOnlyTextChildren(node) &&
      (context === "text"
        ? node.props.length === 0
        : node.props.length === 0 ||
          (typeof className === "string" &&
            /^language-\S+$/.test(className) &&
            hasOnlyProps(node, ["class"])))
    );
  }
  if (node.tag === "ol") {
    const start = getProp(node, "start");
    return (
      (start === undefined ||
        (typeof start === "string" && /^\d{1,9}$/.test(start))) &&
      hasOnlyProps(node, ["class", "start"]) &&
      hasMatchingTaskListClass(node) &&
      node.children.length > 0 &&
      node.children.every(
        (child) => child.type === "element" && isMarkdownElement(child, "list")
      )
    );
  }
  if (node.tag === "ul") {
    return (
      hasOnlyProps(node, ["class"]) &&
      hasMatchingTaskListClass(node) &&
      node.children.length > 0 &&
      node.children.every(
        (child) => child.type === "element" && isMarkdownElement(child, "list")
      )
    );
  }
  if (node.tag === "li") {
    const className = getProp(node, "class");
    return (
      (className === undefined ||
        (className === "task-list-item" &&
          getTaskParagraph(node) !== undefined)) &&
      hasOnlyProps(node, ["class"])
    );
  }
  if (node.tag === "pre") {
    return (
      node.children.length === 1 &&
      node.children[0]?.type === "element" &&
      isMarkdownElement(node.children[0], "pre")
    );
  }
  if (node.tag === "input") {
    return isTaskInput(node);
  }
  if (node.tag === "table") {
    return isMarkdownTable(node);
  }
  if (node.tag === "thead" || node.tag === "tbody") {
    return (
      node.props.length === 0 &&
      node.children.every(
        (child) =>
          child.type === "element" && isMarkdownElement(child, "table-row")
      )
    );
  }
  if (node.tag === "tr") {
    return (
      node.props.length === 0 &&
      node.children.every(
        (child) =>
          child.type === "element" && isMarkdownElement(child, "table-cell")
      )
    );
  }
  if (node.tag === "td" || node.tag === "th") {
    const align = getProp(node, "align");
    return (
      (align === undefined ||
        align === "left" ||
        align === "center" ||
        align === "right") &&
      hasOnlyProps(node, ["align"])
    );
  }
  return false;
};

const getMode = (context: SerializationContext): SerializationMode =>
  context === "text" ||
  context === "jsx-text" ||
  context === "pre" ||
  context === "table-cell" ||
  context === "task"
    ? "text"
    : "flow";

const isPhrasingNode = (node: MdxAuthoredNode): boolean => {
  if (node.type === "text" || node.type === "comment") {
    return true;
  }
  if (node.type === "element" && flowTags.has(node.tag)) {
    return false;
  }
  return node.children.every(isPhrasingNode);
};

const getChildContext = (
  node: ElementNode,
  context: SerializationContext
): SerializationContext => {
  if (node.tag === "ul" || node.tag === "ol") {
    return "list";
  }
  if (node.tag === "thead" || node.tag === "tbody") {
    return "table-row";
  }
  if (node.tag === "tr") {
    return "table-cell";
  }
  if (node.tag === "table") {
    return "table";
  }
  if (node.tag === "pre") {
    return "pre";
  }
  if (
    context === "table-cell" ||
    node.tag === "a" ||
    node.tag === "code" ||
    node.tag === "del" ||
    node.tag === "em" ||
    node.tag.startsWith("h") ||
    node.tag === "p" ||
    node.tag === "strong"
  ) {
    return "text";
  }
  return "flow";
};

const toHastProperties = (props: readonly MdxAuthoredProp[]) =>
  Object.fromEntries(
    props.map(({ name, value }) => [
      name === "class" ? "className" : name,
      name === "class" && typeof value === "string" ? value.split(" ") : value,
    ])
  );

const toWebstudioElement = ({
  mode,
  props,
  children,
}: {
  mode: SerializationMode;
  props: readonly MdxAuthoredProp[];
  children: readonly MdxAuthoredNode[];
}): SerializationNode => {
  const childContext = children.every(isPhrasingNode) ? "jsx-text" : "flow";
  return {
    type: "element",
    tagName: "ws.element",
    properties: {},
    children: children.map((child) => toSerializationNode(child, childContext)),
    data: { mode, props },
  };
};

const toSerializationNode = (
  node: MdxAuthoredNode,
  context: SerializationContext
): SerializationNode => {
  const mode = getMode(context);
  if (node.type === "text") {
    return { type: "text", value: node.value };
  }
  if (node.type === "comment") {
    return { type: "comment", value: node.value, data: { mode } };
  }
  if (node.type === "template") {
    return toWebstudioElement({
      mode,
      props: [{ name: "ws:name", value: node.name }, ...node.props],
      children: node.children,
    });
  }
  if (isMarkdownElement(node, context) === false) {
    return toWebstudioElement({
      mode,
      props: [{ name: "ws:tag", value: node.tag }, ...node.props],
      children: node.children,
    });
  }
  const childContext = getChildContext(node, context);
  let children = node.children.map((child) =>
    toSerializationNode(child, childContext)
  );
  let listItemSpread: boolean | undefined;
  if (node.tag === "li" && getProp(node, "class") === "task-list-item") {
    const task = getTaskParagraph(node);
    if (task !== undefined) {
      listItemSpread = task.wrapped;
      const paragraph = {
        type: "element",
        tagName: "p",
        properties: {},
        children: [
          toSerializationNode(task.input, "task"),
          ...task.rest.map((child) => toSerializationNode(child, "text")),
        ],
      } satisfies SerializationNode;
      children = task.wrapped ? [paragraph, ...children.slice(1)] : [paragraph];
    }
  }
  return {
    type: "element",
    tagName: node.tag,
    properties: toHastProperties(node.props),
    children,
    data: listItemSpread === undefined ? undefined : { listItemSpread },
  };
};

const getSerializationData = (node: { data?: unknown }) =>
  node.data as SerializationNode["data"];

const mapWebstudioElement: Handle = (state, node) => {
  const data = getSerializationData(node);
  const attributes: MdxJsxAttribute[] = (data?.props ?? []).map((prop) => ({
    type: "mdxJsxAttribute",
    name: prop.name,
    value: prop.value === true ? null : prop.value,
  }));
  const children = state.all(node as never);
  if (data?.mode === "text") {
    return {
      type: "mdxJsxTextElement",
      name: "ws.element",
      attributes,
      children,
    } as MdxJsxTextElement;
  }
  return {
    type: "mdxJsxFlowElement",
    name: "ws.element",
    attributes,
    children: state.toFlow(children),
  } as MdxJsxFlowElement;
};

const mapComment: NodeHandle = (_state, node) => ({
  type:
    getSerializationData(node)?.mode === "text"
      ? "mdxTextExpression"
      : "mdxFlowExpression",
  value: typeof node.value === "string" ? node.value : "",
});

const mapListItem: Handle = (state, node) => {
  const result = defaultHandlers.li(state, node);
  const spread = getSerializationData(node)?.listItemSpread;
  if (
    spread !== undefined &&
    result !== undefined &&
    Array.isArray(result) === false &&
    result.type === "listItem"
  ) {
    result.spread = spread;
  }
  return result;
};

const serializeFrontmatter = (document: MdxDocument) => {
  if (
    document.frontmatter.sourceRange === undefined &&
    Object.keys(document.frontmatter.properties).length === 0
  ) {
    return "";
  }
  const yaml = stringifyYaml(document.frontmatter.properties, {
    aliasDuplicateObjects: false,
    lineWidth: 0,
    sortMapEntries: true,
  }).trimEnd();
  return `---\n${yaml}\n---\n\n`;
};

export const serializeMdxDocument = (document: MdxDocument) => {
  const hast = {
    type: "root",
    children: document.children.map((node) =>
      toSerializationNode(node, "flow")
    ),
  } as Parameters<typeof toMdast>[0];
  const mdast = toMdast(hast, {
    document: true,
    handlers: { li: mapListItem, "ws.element": mapWebstudioElement },
    nodeHandlers: { comment: mapComment },
  });
  return (
    serializeFrontmatter(document) +
    toMarkdown(mdast, {
      bullet: "-",
      emphasis: "_",
      extensions: [
        gfmToMarkdown(),
        mdxExpressionToMarkdown,
        mdxJsxToMarkdown({ quote: '"' }),
      ],
      fences: true,
    })
  );
};
