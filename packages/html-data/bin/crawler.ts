import { Parser, defaultTreeAdapter, type DefaultTreeAdapterMap } from "parse5";

type Document = DefaultTreeAdapterMap["document"];

type ChildNode = DefaultTreeAdapterMap["childNode"];

type Node = DefaultTreeAdapterMap["node"];

type NodeWithChildren = Extract<ChildNode, { childNodes: ChildNode[] }>;

type Element = DefaultTreeAdapterMap["element"];

type Attribute = Element["attrs"][number];

export const findTags = (
  node: undefined | Node,
  tagName: string,
  result: NodeWithChildren[] = []
): NodeWithChildren[] => {
  if (node && "childNodes" in node) {
    if ("tagName" in node && node.tagName === tagName) {
      result.push(node);
    }
    for (const child of node.childNodes) {
      findTags(child, tagName, result);
    }
  }
  return result;
};

export const getAttr = (
  node: NodeWithChildren,
  name: string
): undefined | Attribute => {
  return node.attrs.find((attr) => attr.name === name);
};

export const getTextContent = (node: ChildNode) => {
  if ("value" in node) {
    return node.value;
  }
  let result = "";
  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      result += getTextContent(child);
    }
  }
  return result;
};

export const parseHtml = (html: string): Document => {
  return Parser.parse(html, { treeAdapter: defaultTreeAdapter });
};
