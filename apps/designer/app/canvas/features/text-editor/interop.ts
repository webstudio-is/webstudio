import {
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  TextNode,
  ElementNode,
  LineBreakNode,
  ParagraphNode,
} from "lexical";
import { $createLinkNode, LinkNode } from "@lexical/link";
import type { ChildrenUpdates, Instance } from "@webstudio-is/react-sdk";

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
      const id = refs.get(child.getKey())?.id;
      const childrenUpdates: ChildrenUpdates = [];
      $writeUpdates(child, childrenUpdates, refs);
      updates.push({ id, component: "Link", children: childrenUpdates });
    }
    if (child instanceof TextNode) {
      // support nesting bold into italic and vice versa
      // considering lexical represents both as single node
      // and add ref suffix to distinct styling on one node key
      const text = child.getTextContent();
      let parentUpdates = updates;
      if (child.hasFormat("bold")) {
        const id = refs.get(`${child.getKey()}:bold`)?.id;
        const update: ChildrenUpdates[number] = {
          id,
          component: "Bold",
          children: [],
        };
        parentUpdates.push(update);
        parentUpdates = update.children;
      }
      if (child.hasFormat("italic")) {
        const id = refs.get(`${child.getKey()}:italic`)?.id;
        const update: ChildrenUpdates[number] = {
          id,
          component: "Italic",
          children: [],
        };
        parentUpdates.push(update);
        parentUpdates = update.children;
      }
      parentUpdates.push(text);
    }
  }
};

export const $convertToUpdates = (refs: Refs) => {
  const updates: ChildrenUpdates = [];
  const root = $getRoot();
  $writeUpdates(root, updates, refs);
  return updates;
};

type InstanceChild = string | Instance;

const $writeLexical = (
  parent: ElementNode | TextNode,
  children: InstanceChild[],
  refs: Refs
) => {
  for (const child of children) {
    if (typeof child === "string") {
      if (parent instanceof TextNode) {
        parent.setTextContent(child);
      } else {
        const textNode = $createTextNode(child);
        parent.append(textNode);
      }
    } else {
      if (parent instanceof ElementNode && child.component === "Link") {
        const linkNode = $createLinkNode("");
        refs.set(linkNode.getKey(), child);
        parent.append(linkNode);
        $writeLexical(linkNode, child.children, refs);
      }
      if (child.component === "Bold") {
        let textNode;
        if (parent instanceof TextNode) {
          textNode = parent;
        } else {
          textNode = $createTextNode("");
          parent.append(textNode);
        }
        textNode.toggleFormat("bold");
        refs.set(`${textNode.getKey()}:bold`, child);
        $writeLexical(textNode, child.children, refs);
      }
      if (child.component === "Italic") {
        let textNode;
        if (parent instanceof TextNode) {
          textNode = parent;
        } else {
          textNode = $createTextNode("");
          parent.append(textNode);
        }
        textNode.toggleFormat("italic");
        refs.set(`${textNode.getKey()}:italic`, child);
        $writeLexical(textNode, child.children, refs);
      }
    }
  }
};

export const $convertToLexical = (instance: Instance, refs: Refs) => {
  const root = $getRoot();
  let p = $createParagraphNode();
  root.append(p);
  for (const child of instance.children) {
    if (child === "\n") {
      p = $createParagraphNode();
      root.append(p);
    } else {
      $writeLexical(p, [child], refs);
    }
  }
};
