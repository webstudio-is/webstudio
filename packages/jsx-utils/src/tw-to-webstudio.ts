import type { WsEmbedTemplate } from "@webstudio-is/sdk";
import {
  camelCaseProperty,
  parseTailwindToWebstudio,
} from "@webstudio-is/css-data";
import { traverseTemplateAsync } from "./traverse-template";

export const tailwindToWebstudio = async (template: WsEmbedTemplate) => {
  return traverseTemplateAsync(template, async (node) => {
    if (node.type === "instance" && node.props && node.props.length > 0) {
      const classNameProp = node.props.find(
        (prop) => prop.name === "className"
      );
      if (classNameProp && classNameProp.type === "string") {
        const hyphenatedStyles = await parseTailwindToWebstudio(
          classNameProp.value
        );
        const newStyles = hyphenatedStyles.map(
          ({ property, ...styleDecl }) => ({
            ...styleDecl,
            property: camelCaseProperty(property),
          })
        );

        if (node.styles !== undefined) {
          // Merge with existing styles
          const currentStyles = new Set(
            node.styles.map(({ property }) => property)
          );
          for (const styleDecl of newStyles) {
            if (currentStyles.has(styleDecl.property) === false) {
              node.styles.push(styleDecl);
            }
          }
        } else {
          node.styles = newStyles;
        }

        // @todo Instead of deleting className remove Tailwind CSS classes and leave the remaning ones.
        node.props = node.props.filter((prop) => prop.name !== "className");
      }
    }
  });
};
