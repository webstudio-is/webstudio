import {
  type ElementNode,
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  TextNode,
  LineBreakNode,
  ParagraphNode,
} from "lexical";
import { $createLinkNode, LinkNode } from "@lexical/link";
import type { ChildrenUpdates, Instance } from "@webstudio-is/react-sdk";
import { createInstanceId } from "~/shared/tree-utils";

// Map<nodeKey, Instance>
export type Refs = Map<string, Instance>;

const $writeUpdates = (
  node: ElementNode,
  updates: ChildrenUpdates,
  refs: Refs
) => {
  const children = node.getChildren();
  for (const child of children) {
    if (child instanceof ParagraphNode) {
      if (updates.length !== 0) {
        updates.push("\n");
      }
      $writeUpdates(child, updates, refs);
    }
    if (child instanceof LineBreakNode) {
      if (updates.length !== 0) {
        // @todo should we visually distinct line breaks and paragraphs?
        updates.push("\n");
      }
    }
    if (child instanceof LinkNode) {
      // @todo support link children styling
      const text = child.getTextContent();
      const id = refs.get(child.getKey())?.id ?? createInstanceId();
      updates.push({ id, component: "Link", text });
    }
    if (child instanceof TextNode) {
      // @todo support nesting bold into italic and vice versa
      const text = child.getTextContent();
      if (child.hasFormat("bold")) {
        const id = refs.get(child.getKey())?.id ?? createInstanceId();
        updates.push({ id, component: "Bold", text });
      } else if (child.hasFormat("italic")) {
        const id = refs.get(child.getKey())?.id ?? createInstanceId();
        updates.push({ id, component: "Italic", text });
      } else {
        updates.push(text);
      }
    }
  }
};

export const $convertToUpdates = (refs: Refs) => {
  const updates: ChildrenUpdates = [];
  const root = $getRoot();
  $writeUpdates(root, updates, refs);
  return updates;
};

export const $convertToLexical = (instance: Instance, refs: Refs) => {
  const root = $getRoot();
  let p = $createParagraphNode();
  root.append(p);
  for (const child of instance.children) {
    if (child === "\n") {
      p = $createParagraphNode();
      root.append(p);
    } else if (typeof child === "string") {
      const textNode = $createTextNode(child);
      p.append(textNode);
    } else {
      // inline components should always have a single child string
      const text =
        typeof child.children[0] === "string" ? child.children[0] : "";
      if (child.component === "Bold") {
        const textNode = $createTextNode(text);
        textNode.setFormat("bold");
        refs.set(textNode.getKey(), child);
        p.append(textNode);
      }
      if (child.component === "Italic") {
        const textNode = $createTextNode(text);
        textNode.setFormat("italic");
        refs.set(textNode.getKey(), child);
        p.append(textNode);
      }
      if (child.component === "Link") {
        const textNode = $createTextNode(text);
        const linkNode = $createLinkNode(text).append(textNode);
        refs.set(linkNode.getKey(), child);
        p.append(linkNode);
      }
    }
  }
};
