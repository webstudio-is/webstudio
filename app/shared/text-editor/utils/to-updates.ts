import { type ChildrenUpdates } from "@webstudio-is/sdk";
import {
  OnChangePlugin as LexicalOnChangePlugin,
  type EditorState,
  type SerializedEditorState,
  type SerializedTextNode,
  type SerializedElementNode,
  type SerializedRootNode,
  type SerializedLexicalNode,
} from "../lexical";

type Node =
  | SerializedRootNode
  | SerializedElementNode
  | SerializedTextNode
  | SerializedLexicalNode;

export const toUpdates = (
  node: Node,
  updates: ChildrenUpdates = []
): ChildrenUpdates => {
  if ("text" in node) {
    const last = updates[updates.length - 1];
    if (typeof last === "string") {
      // Every new Paragraph node is basically just a new line.
      updates[updates.length - 1] = `${last}\n${node.text}`;
    } else {
      updates.push(node.text);
    }
  }

  if ("children" in node) {
    for (const child of node.children) {
      toUpdates(child, updates);
    }
  }
  return updates;
};
