import type { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { traverseTemplate } from "../traverse-template";
import { getIcon } from "./get-icon";

export const heroiconsToSvgEmbed = (
  template: WsEmbedTemplate,
  componentName: string = "Heroicon"
) =>
  traverseTemplate(template, (node) => {
    if (node.type === "instance" && node.component === componentName) {
      if (node.component === componentName) {
        if (typeof node.props !== "undefined") {
          const nameProp = node.props.find((prop) => prop.name === "name");
          const typeProp = node.props.find((prop) => prop.name === "type");

          const name =
            nameProp && nameProp.type === "string" ? nameProp.value : null;

          const type =
            typeProp &&
            typeProp.type === "string" &&
            (typeProp.value === "outline" || typeProp.value === "solid")
              ? typeProp.value
              : "solid";

          const icon = name ? getIcon(name, type) : null;

          if (icon === null) {
            node.component = "Text";
            node.children = [
              { type: "text", value: name ? `Icon ${name}` : "Icon" },
            ];
          } else {
            node.component = "HtmlEmbed";

            node.label = `${name} icon`;

            node.props = [
              {
                type: "string",
                name: "code",
                value: icon || "",
              },
            ];
          }
        } else {
          node.component = "Text";
          node.children = [{ type: "text", value: "Icon" }];
        }
      }
    }
  });
