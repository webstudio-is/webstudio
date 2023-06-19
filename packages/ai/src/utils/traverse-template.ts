import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import type { ElementType } from "..";

export type NodeType =
  | ElementType<WsEmbedTemplate>
  | { type: "styles"; value: string };

export const traverseTemplate = function traverseTemplate(
  template: NodeType[],
  fn: (node: NodeType, parent: NodeType | NodeType[]) => void
) {
  template.forEach((node) => {
    fn(node, template);

    if (node.type === "instance" && node.children.length > 0) {
      traverseTemplate(node.children, (n, _) => fn(n, node));
    }
  });
};
