import { type ChildrenUpdates } from "@webstudio-is/sdk";
import {
  type SerializedTextNode,
  type SerializedElementNode,
  type SerializedRootNode,
  type SerializedLexicalNode,
} from "../lexical";
import { type SerializedInstanceNode } from "../nodes/node-instance";

type Node =
  | SerializedRootNode
  | SerializedElementNode
  | SerializedTextNode
  | SerializedLexicalNode
  | SerializedInstanceNode;

export const toUpdates = (
  node: Node,
  updates: ChildrenUpdates = []
): ChildrenUpdates => {
  if (node.type === "text" && "text" in node) {
    const last = updates[updates.length - 1];
    if (typeof last === "string") {
      // Every new Paragraph node is basically just a new line.
      updates[updates.length - 1] = `${last}\n${node.text}`;
    } else {
      updates.push(node.text);
    }
  }

  if (node.type === "instance" && "instance" in node) {
    if ("isNew" in node && node.isNew === true) {
      updates.push({
        id: node.instance.id,
        text: node.text,
        component: node.instance.component,
        createInstance: true,
      });
    } else {
      updates.push({
        id: node.instance.id,
        text: node.text,
      });
    }
  }

  if ("children" in node) {
    for (const child of node.children) {
      toUpdates(child, updates);
    }
  }
  return updates;
};
