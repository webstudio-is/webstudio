import { type ChildrenUpdates } from "@webstudio-is/react-sdk";
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
    updates.push(node.text);
  }

  if (node.type === "instance" && "instance" in node) {
    updates.push({
      id: node.instance.id,
      text: node.text,
      component: node.instance.component,
    });
  }

  if ("children" in node) {
    for (const child of node.children) {
      if (child.type === "paragraph" && updates.length !== 0) {
        updates.push("\n");
      }

      toUpdates(child, updates);
    }
  }

  return updates;
};
