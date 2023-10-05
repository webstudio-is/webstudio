import {
  heroiconsToSvgEmbed,
  jsxToWSEmbedTemplate,
  tailwindToWebstudio,
  traverseTemplate,
} from "@webstudio-is/jsx-utils";
import { WsEmbedTemplate } from "@webstudio-is/react-sdk";

export const jsxToTemplate = async (jsx: string) => {
  const template = await jsxToWSEmbedTemplate(jsx);
  await tailwindToWebstudio(template);
  heroiconsToSvgEmbed(template);
  return template;
};

export const postProcessTemplate = (
  template: WsEmbedTemplate,
  components: string[]
) => {
  traverseTemplate(template, (node) => {
    if (node.type === "instance") {
      if (components.includes(node.component) === false) {
        // Replace invalid components with Fragment if available
        if (components.includes("Fragment")) {
          node.component = "Fragment";
          delete node.props;
          delete node.styles;
        } else {
          throw new Error("Invalid component in template " + node.component);
        }
      }

      if (node.props !== undefined) {
        node.props = node.props.filter(
          (prop) => prop.name.startsWith("data-ws-") === false
        );
      }
    }
  });
};
