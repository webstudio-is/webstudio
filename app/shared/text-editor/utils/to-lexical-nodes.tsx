import { type Instance } from "@webstudio-is/sdk";
import { $createInstanceNode } from "../nodes/node-instance";
import { $createTextNode, $createParagraphNode } from "../lexical";

export const toLexicalNodes = (children: Instance["children"]) => {
  const nodes = [];

  for (const child of children) {
    if (typeof child === "string") {
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode(child);
      paragraph.append(textNode);
      nodes.push(paragraph);
      continue;
    }

    // Inline components should always have a single child string
    const text = typeof child.children[0] === "string" ? child.children[0] : "";
    const paragraph = nodes[nodes.length - 1];
    const instanceNode = $createInstanceNode({
      instance: child,
      text,
      isNew: false,
    });
    paragraph.append(instanceNode);
  }

  return nodes;
};
