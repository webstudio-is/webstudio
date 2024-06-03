import {
  parseFragment,
  defaultTreeAdapter,
  type DefaultTreeAdapterMap,
} from "parse5";

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
    .map(([attName, value]) => ` ${convertAttributeName(attName)}="${value}"`)
    .join("");

const convertTagName = (tagName: string) => {
  const tag = tagName.toLowerCase();
  if (tag === "script") {
    return "Script";
  }
  return tag;
};

export const htmlToJsx = (html: string) => {
  const parsedHtml = parseFragment(html);

  let result = "";

  for (const walkNode of walkChildNodes(parsedHtml)) {
    switch (walkNode.type) {
      case "text":
        result += walkNode.value;
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
