import type { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { traverseTemplateAsync } from "./traverse-template";
import { parseTailwindToWebstudio } from "@webstudio-is/css-data";

export const tailwindToWebstudio = async (template: WsEmbedTemplate) => {
  return traverseTemplateAsync(template, async (node, parent) => {
    if (node.type === "instance" && node.props && node.props.length > 0) {
      const classNameProp = node.props.find(
        (prop) => prop.name === "className"
      );
      if (classNameProp && classNameProp.type === "string") {
        const styles = await parseTailwindToWebstudio(classNameProp.value);

        if (node.styles !== undefined) {
          // Merge with existing styles
          const currentStyles = new Set(
            node.styles.map(({ property }) => property)
          );
          for (const styleDecl of styles) {
            if (currentStyles.has(styleDecl.property) === false) {
              node.styles.push(styleDecl);
            }
          }
        } else {
          node.styles = styles;
        }

        // @todo Instead of deleting className remove Tailwind CSS classes and leave the remaning ones.
        node.props = node.props.filter((prop) => prop.name !== "className");
      }
    }
  });
};
