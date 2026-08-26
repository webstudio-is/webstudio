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
import type {
  MdxAuthoredNode,
  MdxAuthoredProp,
  MdxDocument,
  MdxMarkdownListItem,
  MdxMode,
} from "./mdx";
import {
  assertUniqueAttributeNames,
  mapAttributeNames,
} from "./jsx-attributes";

type SerializationNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  value?: string;
  children?: SerializationNode[];
  data?: {
    listItem?: MdxMarkdownListItem;
    mode?: MdxMode;
    props?: readonly MdxAuthoredProp[];
    propsUseJsxNames?: boolean;
    rawText?: string;
    rawSource?: string;
  };
};

const protectTextWhitespace = (value: string) =>
  value.replace(/[\t\n\v\f\r ]/g, "\uE000");

const toHastProperties = (props: readonly MdxAuthoredProp[]) =>
  Object.fromEntries(
    mapAttributeNames({
      attributes: props.map(({ name, value }) => ({
        name,
        value:
          name === "class" && typeof value === "string"
            ? value.split(" ")
            : value,
      })),
      direction: "instance-to-jsx",
      acceptsHtmlAttributes: true,
    }).map(({ name, value }) => [name, value])
  );

const toTextNode = (
  value: string,
  protectWhitespace = true
): SerializationNode =>
  protectWhitespace
    ? {
        type: "text",
        value: protectTextWhitespace(value),
        data: { rawText: value },
      }
    : { type: "text", value };

const toWebstudioElement = ({
  mode,
  props,
  children,
  propsUseJsxNames,
}: {
  mode: MdxMode;
  props: readonly MdxAuthoredProp[];
  children: readonly MdxAuthoredNode[];
  propsUseJsxNames: boolean;
}): SerializationNode => ({
  type: "element",
  tagName: "ws.element",
  properties: {},
  children: children.map((child) => toSerializationNode(child)),
  data: { mode, props, propsUseJsxNames },
});

const toSerializationNode = (
  node: MdxAuthoredNode,
  hastPreservesWhitespace = false
): SerializationNode => {
  if (node.type === "text") {
    return toTextNode(node.value, hastPreservesWhitespace === false);
  }
  if (node.type === "comment") {
    return { type: "comment", value: node.value, data: { mode: node.mdxMode } };
  }
  if (node.type === "opaque") {
    return {
      type: "opaque",
      value: node.value,
      data: { mode: node.mdxMode, rawSource: node.value },
    };
  }
  if (node.type === "template") {
    return toWebstudioElement({
      mode: node.mdxMode,
      props: [{ name: "ws:name", value: node.name }, ...node.props],
      children: node.children,
      propsUseJsxNames: true,
    });
  }
  if (node.syntax === "mdx") {
    return toWebstudioElement({
      mode: node.mdxMode,
      props: [{ name: "ws:tag", value: node.tag }, ...node.props],
      children: node.children,
      propsUseJsxNames: false,
    });
  }

  let children = node.children.map((child) =>
    toSerializationNode(
      child,
      hastPreservesWhitespace || node.preserveTextWhitespace === true
    )
  );
  if (
    node.markdownListItem?.checked !== undefined &&
    node.markdownListItem.spread === false
  ) {
    children = [{ type: "element", tagName: "p", properties: {}, children }];
  }
  return {
    type: "element",
    tagName: node.tag,
    properties: toHastProperties(node.props),
    children,
    data:
      node.markdownListItem === undefined
        ? undefined
        : { listItem: node.markdownListItem },
  };
};

const getSerializationData = (node: { data?: unknown }) =>
  node.data as SerializationNode["data"];

const mapWebstudioElement: Handle = (state, node) => {
  const data = getSerializationData(node);
  const props = data?.props ?? [];
  const mappedProps =
    data?.propsUseJsxNames === true
      ? props
      : mapAttributeNames({
          attributes: props,
          direction: "instance-to-jsx",
          acceptsHtmlAttributes: true,
        });
  assertUniqueAttributeNames(mappedProps);
  const attributes: MdxJsxAttribute[] = mappedProps.map((prop) => ({
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

const mapText: NodeHandle = (_state, node) => ({
  type: "text",
  value:
    getSerializationData(node)?.rawText ??
    (typeof node.value === "string" ? node.value : ""),
});

const mapOpaque: NodeHandle = (_state, node) => ({
  type: "html",
  value: getSerializationData(node)?.rawSource ?? "",
});

const mapListItem: Handle = (state, node) => {
  const result = defaultHandlers.li(state, node);
  const listItem = getSerializationData(node)?.listItem;
  if (
    listItem !== undefined &&
    result !== undefined &&
    Array.isArray(result) === false &&
    result.type === "listItem"
  ) {
    result.spread = listItem.spread;
  }
  return result;
};

export const serializeMdxFrontmatter = (
  properties: Readonly<Record<string, unknown>>
) => {
  const yaml = stringifyYaml(properties, {
    aliasDuplicateObjects: false,
    lineWidth: 0,
    sortMapEntries: true,
  }).trimEnd();
  return `---\n${yaml}\n---\n\n`;
};

const serializeFrontmatter = (document: MdxDocument) => {
  if (
    document.frontmatter.sourceRange === undefined &&
    Object.keys(document.frontmatter.properties).length === 0
  ) {
    return "";
  }
  return serializeMdxFrontmatter(document.frontmatter.properties);
};

export const serializeMdxDocument = (document: MdxDocument) => {
  const hast = {
    type: "root",
    children: document.children.map((node) => toSerializationNode(node)),
  } as Parameters<typeof toMdast>[0];
  const mdast = toMdast(hast, {
    document: true,
    handlers: { li: mapListItem, "ws.element": mapWebstudioElement },
    nodeHandlers: { comment: mapComment, opaque: mapOpaque, text: mapText },
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
