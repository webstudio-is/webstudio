import { ariaAttributes, attributesByTag } from "@webstudio-is/html-data";

type HtmlAttribute = (typeof ariaAttributes)[number];

export type HtmlAttributeType = "string" | "boolean" | "number";

const toAttributeType = (attribute: HtmlAttribute): HtmlAttributeType => {
  if (
    attribute.type === "string" ||
    attribute.type === "select" ||
    attribute.type === "url"
  ) {
    return "string";
  }
  return attribute.type;
};

export const getHtmlAttributeType = ({
  tag,
  name,
}: {
  tag: string;
  name: string;
}): HtmlAttributeType | undefined => {
  const attribute =
    attributesByTag[tag]?.find((candidate) => candidate.name === name) ??
    attributesByTag["*"]?.find((candidate) => candidate.name === name) ??
    ariaAttributes.find((candidate) => candidate.name === name);
  return attribute === undefined ? undefined : toAttributeType(attribute);
};

export const getHtmlAttributeTypes = () => {
  const attributeTypes = new Map<string, HtmlAttributeType>();
  for (const attribute of ariaAttributes) {
    attributeTypes.set(attribute.name, toAttributeType(attribute));
  }
  for (const attribute of attributesByTag["*"] ?? []) {
    attributeTypes.set(attribute.name, toAttributeType(attribute));
  }
  for (const [tag, attributes] of Object.entries(attributesByTag)) {
    for (const attribute of attributes ?? []) {
      attributeTypes.set(
        `${tag}:${attribute.name}`,
        toAttributeType(attribute)
      );
    }
  }
  return attributeTypes;
};
