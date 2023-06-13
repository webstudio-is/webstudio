import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import type { ElementType } from "..";

export const traverseTemplate = function traverseTemplate(
  template: WsEmbedTemplate,
  fn: (node: ElementType<WsEmbedTemplate>) => void
) {
  template.forEach((node) => {
    fn(node);

    if (node.type === "instance" && node.children.length > 0) {
      traverseTemplate(node.children, fn);
    }
  });
};
