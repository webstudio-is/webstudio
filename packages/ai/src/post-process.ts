import { type MitosisComponent, type MitosisNode } from "@builder.io/mitosis";
import { fromMarkdown as parseMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";

export const getCode = function getCode(response: string, lang: string) {
  const tree = parseMarkdown(response);
  let code = response;
  const codeBlocks: string[] = [];

  visit(tree, "code", (node) => {
    if (node.lang === lang) {
      codeBlocks.unshift(node.value.trim());
    } else if (!node.lang) {
      codeBlocks.push(node.value.trim());
    }
  });

  if (codeBlocks.length > 0) {
    code = codeBlocks[0];
  }

  return code;
};

type ProcessedValue = ReturnType<typeof processValue>;

function replacer<U>(key: string, value: U): ProcessedValue[];
function replacer(key: "children", value: MitosisNode[]): ProcessedValue[];
// eslint-disable-next-line func-style
function replacer(key: string, value: MitosisNode[]): ProcessedValue[] {
  if (key === "children" && Array.isArray(value)) {
    return value.map(processValue).filter((v) => v !== null);
  }

  if (key !== null && Array.isArray(value)) {
    return value.map((value) => processValue(value)).filter((v) => v !== null);
  }

  return value;
}

// @todo this is a Mitosis generator - add plugins hooks etc.
export const mitosisJSONToWsEmbedTemplate = function componentToWsEmbedTemplate(
  options = {}
) {
  return ({ component }: { component: MitosisComponent }) => {
    return JSON.stringify(component.children, replacer);
  };
};

const processValue = function processValue(value: MitosisNode) {
  if (typeof value?.properties?._text === "string") {
    const text = value.properties._text.trim();
    if (text.length === 0) {
      return null;
    }

    return {
      type: "text",
      value: text,
    };
  }

  const type = value["@type"];

  if (type === "@builder.io/mitosis/node") {
    return {
      type: "instance",
      component: value.name === "div" ? "Box" : value.name,
      styles:
        typeof value.properties.class === "string"
          ? value.properties.class.split(" ").map((name) => ({
              property: name,
              value: {
                type: "invalid",
                value: name,
              },
            }))
          : [],
      children: value.children || [],
    };
  }

  return value;
};
