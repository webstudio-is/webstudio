import type { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { traverseTemplateAsync } from "./traverse-template";
import { parseCss, parseTailwindToCss } from "@webstudio-is/css-data";

export const tailwindToWebstudio = async (template: WsEmbedTemplate) => {
  return traverseTemplateAsync(template, async (node, parent) => {
    if (node.type === "instance" && node.props && node.props.length > 0) {
      const classNameProp = node.props.find(
        (prop) => prop.name === "className"
      );
      if (classNameProp && classNameProp.type === "string") {
        const css = await parseTailwindToCss(classNameProp.value);
        const styles = Object.values(parseCss(css)).flat();

        if (Array.isArray(node.styles)) {
          // Merge with existing styles
          const currentStyles = new Set(
            node.styles.map(({ property }) => property)
          );
          styles.forEach((styleDecl) => {
            if (currentStyles.has(styleDecl.property) === false) {
              node.styles!.push(styleDecl);
            }
          });
        } else {
          node.styles = styles;
        }

        node.props = node.props.filter((prop) => prop.name !== "className");
      }
    }
  });
};
