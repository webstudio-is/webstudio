import { type Instance } from "@webstudio-is/react-sdk";
import { $createInstanceNode } from "../nodes/node-instance";
import {
  $createTextNode,
  $createParagraphNode,
  type ParagraphNode,
} from "../lexical";

export const toLexicalNodes = (children: Instance["children"]) => {
  const nodes: Array<ParagraphNode> = [];

  let p = $createParagraphNode();
  nodes.push(p);

  for (const child of children) {
    if (child === "\n") {
      p = $createParagraphNode();
      nodes.push(p);
      continue;
    }

    if (typeof child === "string") {
      const textNode = $createTextNode(child);
      p.append(textNode);
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
