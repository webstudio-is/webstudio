import { writeFile, mkdir } from "node:fs/promises";
import { Parser, defaultTreeAdapter } from "parse5";
import type { Attribute, AttributesByTag } from "./types";
import { htmlPropsDescriptions } from "./descriptions";

// scrub attributes data from https://html.spec.whatwg.org/multipage/indices.html#attributes-3

const response = await fetch(
  "https://html.spec.whatwg.org/multipage/indices.html"
);
const text = await response.text();
const document = Parser.parse(text, { treeAdapter: defaultTreeAdapter });

type ChildNode = (typeof document.childNodes)[0];
type Node = typeof document | ChildNode;
type NodeWithChildren = Extract<ChildNode, { childNodes: ChildNode[] }>;

const findTags = (
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

const getAttr = (node: NodeWithChildren, name: string) => {
  return node.attrs.find((attr) => attr.name === name);
};

const getTextContent = (node: ChildNode) => {
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

const table = findTags(document, "table").find(
  (table) => getAttr(table, "id")?.value === "attributes-1"
);
const [tbody] = findTags(table, "tbody");
const rows = findTags(tbody, "tr");

const attributesByTag: AttributesByTag = {};

for (const tr of rows) {
  const [nameColumn] = findTags(tr, "th");
  const [elementsColumn, _descriptionColumn, valueColumn] = findTags(tr, "td");
  const name = getTextContent(nameColumn).trim();
  const elements = getTextContent(elementsColumn)
    .trim()
    .split(/\s*;\s*/)
    .map((element) => {
      if (element === "HTML elements") {
        return "*";
      }
      if (
        element === "source (in picture)" ||
        element === "source (in video or audio)"
      ) {
        return "source";
      }
      return element;
    })
    .filter((element) => element !== "form-associated custom elements");
  const value = getTextContent(valueColumn)
    .trim()
    .split(/\s*;\s*/);

  let attribute: Attribute;
  if (value.length === 1) {
    if (value[0] === "Text" || value[0] === "Text*") {
      attribute = { name, type: "string" };
    } else if (value[0] === "Boolean attribute") {
      attribute = { name, type: "boolean" };
    } else if (value[0].includes("number") || value[0].includes("integer")) {
      attribute = { name, type: "number" };
    } else {
      attribute = { name, type: "string" };
    }
  } else {
    const values: string[] = [];
    for (const item of value) {
      if (item.startsWith('"') && item.endsWith('"')) {
        values.push(item.slice(1, -1));
      }
      // some values are not specific
    }
    attribute = { name, type: "enum", values };
  }
  attribute.description =
    htmlPropsDescriptions[name as keyof typeof htmlPropsDescriptions];
  for (const element of elements) {
    const attributes = attributesByTag[element] ?? [];
    attributesByTag[element] = attributes;
    attributes.push(attribute);
  }
}

const json = JSON.stringify(attributesByTag);
const content = `
import type { AttributesByTag } from "../types"
export const htmlAttributes: AttributesByTag = ${json}
`;
await mkdir("./src/__generated__", { recursive: true });
await writeFile("./src/__generated__/html-attributes.ts", content);
