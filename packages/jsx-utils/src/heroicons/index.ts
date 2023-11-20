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

          node.component = "HtmlEmbed";

          node.label = name ? `${name} icon` : "Icon";

          node.props = [
            {
              type: "string",
              name: "code",
              value:
                icon === null
                  ? unknownIcon((name || "I")[0].toUpperCase())
                  : icon,
            },
          ];
        } else {
          node.component = "Text";
          node.children = [{ type: "text", value: "Icon" }];
        }
      }
    }
  });

const unknownIcon = (text: string) =>
  `<svg style="height: 1.1em;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="transparent" stroke="currentColor" stroke-width="2" /><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14">${text}</text></svg>`;
