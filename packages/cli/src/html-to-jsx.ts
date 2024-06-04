import {
  parseFragment,
  defaultTreeAdapter,
  type DefaultTreeAdapterMap,
} from "parse5";

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

const convertAttributeName = (name: string) =>
  name === "class" ? "className" : name;

const attributesToString = (attributes: [string, string][]) =>
  attributes
    .map(([attName, value]) =>
      value === "" && isBooleanAttr(attName)
        ? ` ${convertAttributeName(attName)}`
        : ` ${convertAttributeName(attName)}="${value}"`
    )
    .join("");

const convertTagName = (tagName: string) => {
  const tag = tagName.toLowerCase();
  if (tag === "script") {
    return "Script";
  }
  return tag;
};

const escapeValue = (value: string) =>
  value
    // .trim()
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");

export const htmlToJsx = (html: string) => {
  const parsedHtml = parseFragment(html);

  let result = "";

  for (const walkNode of walkChildNodes(parsedHtml)) {
    switch (walkNode.type) {
      case "text":
        {
          const escapedValue = escapeValue(walkNode.value);

          result += escapedValue ? "{`" + escapedValue + "`}" : "";
        }
        break;
      case "element-start":
        {
          const tag = convertTagName(walkNode.tagName);
          result += `<${tag}${attributesToString(walkNode.attributes)}>`;
        }
        break;

      case "element-end":
        result += `</${convertTagName(walkNode.tagName)}>`;
        break;
    }
  }

  return result;
};
