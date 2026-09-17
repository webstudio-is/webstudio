/**
 * Serializes the safe MDX document model back to authored MDX while choosing
 * Markdown or JSX syntax without exposing runtime Webstudio instances.
 */
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
import { name as isIdentifierName } from "estree-util-is-identifier-name";
import htmlTags from "html-tags";
import svgTags from "svg-tags";
import { serializeMarkdownFrontmatter } from "./frontmatter";
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
    jsxName?: string;
    selfClosing?: boolean;
    rawText?: string;
    rawSource?: string;
  };
};

const protectTextWhitespace = (value: string) =>
  value.replace(/[\t\n\v\f\r ]/g, "\uE000");

/** Authored template JSX uses one valid PascalCase JavaScript identifier. */
export const isMdxTemplateComponentName = (name: unknown): boolean => {
  if (typeof name !== "string" || isIdentifierName(name) === false) {
    return false;
  }
  const firstCharacter = Array.from(name)[0];
  return (
    firstCharacter !== undefined &&
    firstCharacter === firstCharacter.toUpperCase() &&
    firstCharacter !== firstCharacter.toLowerCase()
  );
};

const supportedIntrinsicElementTags = new Set<string>([
  ...htmlTags,
  ...svgTags,
]);

/** Authored intrinsic JSX is limited to known HTML and SVG elements. */
export const isMdxIntrinsicElementName = (name: unknown): name is string =>
  typeof name === "string" && supportedIntrinsicElementTags.has(name);

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
  tagName = "ws.element",
  jsxName,
  mode,
  props,
  children,
  propsUseJsxNames,
  selfClosing,
}: {
  tagName?: string;
  jsxName?: string;
  mode: MdxMode;
  props: readonly MdxAuthoredProp[];
  children: readonly MdxAuthoredNode[];
  propsUseJsxNames: boolean;
  selfClosing?: boolean;
}): SerializationNode => ({
  type: "element",
  tagName,
  properties: {},
  children: children.map((child) => toSerializationNode(child)),
  data: { mode, props, propsUseJsxNames, jsxName, selfClosing },
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
    const selfClosing = node.selfClosing ?? node.children.length === 0;
    if (selfClosing && node.children.length > 0) {
      throw new Error("Self-closing MDX templates cannot contain children");
    }
    if (
      node.props.some(({ name }) => name === "ws:name" || name === "ws:tag")
    ) {
      throw new Error("Named MDX templates cannot use ws:name or ws:tag");
    }
    if (isMdxTemplateComponentName(node.name)) {
      return toWebstudioElement({
        tagName: "ws.template",
        jsxName: node.name,
        mode: node.mdxMode,
        props: node.props,
        children: node.children,
        propsUseJsxNames: true,
        selfClosing,
      });
    }
    if (node.name.length === 0) {
      throw new Error("MDX template names must not be empty");
    }
    return toWebstudioElement({
      mode: node.mdxMode,
      props: [{ name: "ws:name", value: node.name }, ...node.props],
      children: node.children,
      propsUseJsxNames: true,
      selfClosing,
    });
  }
  if (node.syntax === "mdx") {
    const canUseDirectJsx = isMdxIntrinsicElementName(node.tag);
    return toWebstudioElement({
      tagName: "ws.element",
      jsxName: canUseDirectJsx ? node.tag : undefined,
      mode: node.mdxMode,
      props: canUseDirectJsx
        ? node.props
        : [{ name: "ws:tag", value: node.tag }, ...node.props],
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
  let children = state.all(node as never);
  if (data?.selfClosing === false && children.length === 0) {
    // hast-util-to-mdast removes empty text nodes. An empty raw node survives
    // its cleanup and makes the MDX serializer emit an explicit closing tag.
    children = [{ type: "html", value: "" }];
  }
  if (data?.mode === "text") {
    return {
      type: "mdxJsxTextElement",
      name: data?.jsxName ?? "ws.element",
      attributes,
      children,
    } as MdxJsxTextElement;
  }
  return {
    type: "mdxJsxFlowElement",
    name: data?.jsxName ?? "ws.element",
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

const serializeFrontmatter = (document: MdxDocument, hasBody: boolean) => {
  if (document.frontmatter.authoredSource !== undefined) {
    const source = document.frontmatter.authoredSource;
    return hasBody && source.endsWith("\n") === false ? `${source}\n` : source;
  }
  if (
    document.frontmatter.sourceRange === undefined &&
    Object.keys(document.frontmatter.properties).length === 0
  ) {
    return "";
  }
  return serializeMarkdownFrontmatter(document.frontmatter.properties);
};

export const serializeMdxDocument = (document: MdxDocument) => {
  const hast = {
    type: "root",
    children: document.children.map((node) => toSerializationNode(node)),
  } as Parameters<typeof toMdast>[0];
  const mdast = toMdast(hast, {
    document: true,
    handlers: {
      li: mapListItem,
      "ws.element": mapWebstudioElement,
      "ws.template": mapWebstudioElement,
    },
    nodeHandlers: { comment: mapComment, opaque: mapOpaque, text: mapText },
  });
  const body = toMarkdown(mdast, {
    bullet: "-",
    bulletOther: "*",
    bulletOrderedOther: ")",
    emphasis: "_",
    extensions: [
      gfmToMarkdown(),
      mdxExpressionToMarkdown,
      mdxJsxToMarkdown({ quote: '"' }),
    ],
    fences: true,
  });
  return serializeFrontmatter(document, body !== "") + body;
};
