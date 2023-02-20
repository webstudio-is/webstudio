import {
  type TextNode,
  type ElementNode,
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  $createLineBreakNode,
  $isTextNode,
  $isElementNode,
  $isParagraphNode,
  $isLineBreakNode,
} from "lexical";
import { $createLinkNode, $isLinkNode } from "@lexical/link";
import type { Instance, Text } from "@webstudio-is/project-build";
import { utils } from "@webstudio-is/project";
import { $isSpanNode, $setNodeSpan } from "./toolbar-connector";

// Map<nodeKey, instanceId>
export type Refs = Map<string, string>;

const lexicalFormats = [
  ["bold", "Bold"],
  ["italic", "Italic"],
  ["superscript", "Superscript"],
  ["subscript", "Subscript"],
] as const;

const $writeUpdates = (
  node: ElementNode,
  updates: Instance["children"],
  refs: Refs
) => {
  const children = node.getChildren();
  for (const child of children) {
    if ($isParagraphNode(child)) {
      $writeUpdates(child, updates, refs);
    }
    if ($isLineBreakNode(child)) {
      updates.push({ type: "text", value: "\n" });
    }
    if ($isLinkNode(child)) {
      const key = child.getKey();
      const id = refs.get(key) ?? utils.tree.createInstanceId();
      refs.set(key, id);
      const childrenUpdates: Instance["children"] = [];
      $writeUpdates(child, childrenUpdates, refs);
      updates.push({
        type: "instance",
        id,
        component: "RichTextLink",
        children: childrenUpdates,
      });
    }
    if ($isTextNode(child)) {
      // support nesting bold into italic and vice versa
      // considering lexical represents both as single node
      // and add ref suffix to distinct styling on one node key
      const text = child.getTextContent();
      let parentUpdates = updates;
      if ($isSpanNode(child)) {
        // prematurely generate span id to select it right after applying
        const key = `${child.getKey()}:span`;
        const id = refs.get(key) ?? utils.tree.createInstanceId();
        refs.set(key, id);
        const update: Instance["children"][number] = {
          type: "instance",
          id,
          component: "Span",
          children: [],
        };
        parentUpdates.push(update);
        parentUpdates = update.children;
      }
      // convert all lexical formats
      for (const [format, component] of lexicalFormats) {
        if (child.hasFormat(format)) {
          const key = `${child.getKey()}:${format}`;
          const id = refs.get(key) ?? utils.tree.createInstanceId();
          refs.set(key, id);
          const update: Instance["children"][number] = {
            type: "instance",
            id,
            component,
            children: [],
          };
          parentUpdates.push(update);
          parentUpdates = update.children;
        }
      }
      parentUpdates.push({ type: "text", value: text });
    }
  }
};

export const $convertToUpdates = (refs: Refs) => {
  const updates: Instance["children"] = [];
  const root = $getRoot();
  $writeUpdates(root, updates, refs);
  return updates;
};

type InstanceChild = Text | Instance;

const $writeLexical = (
  parent: ElementNode | TextNode,
  children: InstanceChild[],
  refs: Refs
) => {
  for (const child of children) {
    if (child.type === "text") {
      // convert text
      if (child.value === "\n" && $isElementNode(parent)) {
        const lineBreakNode = $createLineBreakNode();
        parent.append(lineBreakNode);
        continue;
      }
      if ($isTextNode(parent)) {
        parent.setTextContent(child.value);
      } else {
        const textNode = $createTextNode(child.value);
        parent.append(textNode);
      }
      continue;
    }

    // convert instances
    if (child.component === "RichTextLink" && $isElementNode(parent)) {
      const linkNode = $createLinkNode("");
      refs.set(linkNode.getKey(), child.id);
      parent.append(linkNode);
      $writeLexical(linkNode, child.children, refs);
    }
    if (child.component === "Span") {
      let textNode;
      if ($isTextNode(parent)) {
        textNode = parent;
      } else {
        textNode = $createTextNode("");
        parent.append(textNode);
      }
      $setNodeSpan(textNode);
      refs.set(`${textNode.getKey()}:span`, child.id);
      $writeLexical(textNode, child.children, refs);
    }
    // convert all lexical formats
    for (const [format, component] of lexicalFormats) {
      if (child.component === component) {
        let textNode;
        if ($isTextNode(parent)) {
          textNode = parent;
        } else {
          textNode = $createTextNode("");
          parent.append(textNode);
        }
        textNode.toggleFormat(format);
        refs.set(`${textNode.getKey()}:${format}`, child.id);
        $writeLexical(textNode, child.children, refs);
      }
    }
  }
};

export const $convertToLexical = (instance: Instance, refs: Refs) => {
  const root = $getRoot();
  const p = $createParagraphNode();
  root.append(p);
  $writeLexical(p, instance.children, refs);
};
