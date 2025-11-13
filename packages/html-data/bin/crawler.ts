import { readFile, writeFile } from "node:fs/promises";
import { Parser, defaultTreeAdapter, type DefaultTreeAdapterMap } from "parse5";

type Document = DefaultTreeAdapterMap["document"];

type ChildNode = DefaultTreeAdapterMap["childNode"];

type Node = DefaultTreeAdapterMap["node"];

type NodeWithChildren = Extract<ChildNode, { childNodes: ChildNode[] }>;

type Element = DefaultTreeAdapterMap["element"];

type Attribute = Element["attrs"][number];

export const findByTags = (
  node: undefined | Node,
  tagName: string,
  result: NodeWithChildren[] = []
): NodeWithChildren[] => {
  if (node && "childNodes" in node) {
    if ("tagName" in node && node.tagName === tagName) {
      result.push(node);
    }
    for (const child of node.childNodes) {
      findByTags(child, tagName, result);
    }
  }
  return result;
};

export const findByClasses = (
  node: undefined | Node,
  className: string,
  result: NodeWithChildren[] = []
): NodeWithChildren[] => {
  if (node && "childNodes" in node) {
    if (
      "tagName" in node &&
      node.attrs.some(
        (item) =>
          item.name === "class" && item.value.split(/\s+/).includes(className)
      )
    ) {
      result.push(node);
    }
    for (const child of node.childNodes) {
      findByClasses(child, className, result);
    }
  }
  return result;
};

export const getAttr = (
  node: undefined | NodeWithChildren,
  name: string
): undefined | Attribute => {
  return node?.attrs.find((attr) => attr.name === name);
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

export const loadPage = async (name: string, url: string) => {
  // prefer cached file to avoid too many requests on debug
  const cachedFile = `./node_modules/.cache/${name}.html`;
  let text;
  try {
    text = await readFile(cachedFile, "utf-8");
  } catch {
    const response = await fetch(url);
    text = await response.text();
    await writeFile(cachedFile, text);
  }
  return text;
};

export const loadHtmlIndices = () =>
  loadPage(
    "html-spec-indices",
    "https://html.spec.whatwg.org/multipage/indices.html"
  );

export const loadSvgSinglePage = () =>
  loadPage("svg-spec", "https://www.w3.org/TR/SVG11/single-page.html");
