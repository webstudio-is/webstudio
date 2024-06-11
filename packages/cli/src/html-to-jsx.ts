import {
  parseFragment,
  defaultTreeAdapter,
  type DefaultTreeAdapterMap,
} from "parse5";
import { camelCase } from "change-case";

const BOOLEAN_ATTRIBUTES = new Set([
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "contenteditable",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "scoped",
  "selected",
  "truespeed",
]);

const isBooleanAttr = (name: string) =>
  BOOLEAN_ATTRIBUTES.has(name.toLowerCase());

type WalkNode =
  | { type: "text"; value: string }
  | {
      type: "element-start";
      tagName: string;
      attributes: [name: string, value: string][];
    }
  | { type: "element-end"; tagName: string };

// eslint-disable-next-line func-style
function* walkChildNodes(
  node: DefaultTreeAdapterMap["node"]
): IterableIterator<WalkNode> {
  if (
    defaultTreeAdapter.isCommentNode(node) ||
    defaultTreeAdapter.isTextNode(node) ||
    defaultTreeAdapter.isDocumentTypeNode(node)
  ) {
    throw new Error("Unsupported node type");
  }

  for (const childNode of node.childNodes) {
    if (defaultTreeAdapter.isCommentNode(childNode)) {
      continue;
    }

    if (defaultTreeAdapter.isTextNode(childNode)) {
      yield { type: "text", value: childNode.value };
      continue;
    }

    if (false === defaultTreeAdapter.isElementNode(childNode)) {
      continue;
    }

    const attributes: [string, string][] = childNode.attrs.map((attr) => [
      attr.name,
      attr.value,
    ]);

    yield { type: "element-start", tagName: childNode.tagName, attributes };
    yield* walkChildNodes(childNode);
    yield { type: "element-end", tagName: childNode.tagName };
  }
}

const convertStyleString = (style: string) => {
  const styles = style
    .split(";")
    .map((style) => style.trim())
    .map((style) => style.split(":").map((part) => part.trim()));

  const res: Record<string, string> = {};
  for (const [name, value] of styles) {
    res[camelCase(name)] = value;
  }
  return JSON.stringify(res);
};

const escape = (value: string) => JSON.stringify(value);

const toAttrString = (name: string, value: string) => {
  const attName = name.toLowerCase();
  const jsxName = attName === "class" ? "className" : attName;

  if (value === "" && isBooleanAttr(attName)) {
    return `${jsxName}`;
  }

  if (attName === "style") {
    return `${jsxName}={${convertStyleString(value)}}`;
  }

  return `${jsxName}={${escape(value)}}`;
};

const attributesToString = (attributes: [string, string][]) =>
  attributes
    .map(([attName, value]) => ` ${toAttrString(attName, value)}`)
    .join("");

const convertTagName = (tagName: string) => {
  const tag = tagName.toLowerCase();
  if (tag === "script") {
    return "Script";
  }

  if (tag === "style") {
    return "Style";
  }

  return tag;
};

export const htmlToJsx = (html: string) => {
  const parsedHtml = parseFragment(html, { scriptingEnabled: false });

  let result = "";

  for (const walkNode of walkChildNodes(parsedHtml)) {
    switch (walkNode.type) {
      case "text": {
        const escapedValue = escape(walkNode.value);

        result += escapedValue ? "{" + escapedValue + "}" : "";
        break;
      }

      case "element-start": {
        const tag = convertTagName(walkNode.tagName);
        result += `<${tag}${attributesToString(walkNode.attributes)}>`;
        break;
      }

      case "element-end": {
        result += `</${convertTagName(walkNode.tagName)}>`;
        break;
      }
    }
  }

  return result;
};
