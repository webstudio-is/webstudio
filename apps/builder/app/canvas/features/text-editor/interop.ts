import { nanoid } from "nanoid";
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
import type { Instance, Instances } from "@webstudio-is/sdk";
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
  instanceChildren: Instance["children"],
  instancesList: Instance[],
  refs: Refs
) => {
  const children = node.getChildren();
  for (const child of children) {
    if ($isParagraphNode(child)) {
      $writeUpdates(child, instanceChildren, instancesList, refs);
    }
    if ($isLineBreakNode(child)) {
      instanceChildren.push({ type: "text", value: "\n" });
    }
    if ($isLinkNode(child)) {
      const key = child.getKey();
      const id = refs.get(key) ?? nanoid();
      refs.set(key, id);
      instanceChildren.push({
        type: "id",
        value: id,
      });
      const childChildren: Instance["children"] = [];
      $writeUpdates(child, childChildren, instancesList, refs);
      instancesList.push({
        type: "instance",
        id,
        component: "RichTextLink",
        children: childChildren,
      });
    }
    if ($isTextNode(child)) {
      // support nesting bold into italic and vice versa
      // considering lexical represents both as single node
      // and add ref suffix to distinct styling on one node key
      const text = child.getTextContent();
      let parentUpdates = instanceChildren;
      if ($isSpanNode(child)) {
        // prematurely generate span id to select it right after applying
        const key = `${child.getKey()}:span`;
        const id = refs.get(key) ?? nanoid();
        refs.set(key, id);
        const childInstance: Instance = {
          type: "instance",
          id,
          component: "Span",
          children: [],
        };
        instancesList.push(childInstance);
        parentUpdates.push({ type: "id", value: id });
        parentUpdates = childInstance.children;
      }
      // convert all lexical formats
      for (const [format, component] of lexicalFormats) {
        if (child.hasFormat(format)) {
          const key = `${child.getKey()}:${format}`;
          const id = refs.get(key) ?? nanoid();
          refs.set(key, id);
          const childInstance: Instance = {
            type: "instance",
            id,
            component,
            children: [],
          };
          instancesList.push(childInstance);
          parentUpdates.push({ type: "id", value: id });
          parentUpdates = childInstance.children;
        }
      }
      parentUpdates.push({ type: "text", value: text });
    }
  }
};

export const $convertToUpdates = (treeRootInstance: Instance, refs: Refs) => {
  const treeRootInstanceChildren: Instance["children"] = [];
  const instancesList: Instance[] = [
    {
      ...treeRootInstance,
      children: treeRootInstanceChildren,
    },
  ];
  const root = $getRoot();
  $writeUpdates(root, treeRootInstanceChildren, instancesList, refs);
  return instancesList;
};

const $writeLexical = (
  parent: ElementNode | TextNode,
  children: Instance["children"],
  instances: Instances,
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

    const instance = instances.get(child.value);
    if (instance === undefined) {
      continue;
    }

    // convert instances
    if (instance.component === "RichTextLink" && $isElementNode(parent)) {
      const linkNode = $createLinkNode("");
      refs.set(linkNode.getKey(), instance.id);
      parent.append(linkNode);
      $writeLexical(linkNode, instance.children, instances, refs);
    }
    if (instance.component === "Span") {
      let textNode;
      if ($isTextNode(parent)) {
        textNode = parent;
      } else {
        textNode = $createTextNode("");
        parent.append(textNode);
      }
      $setNodeSpan(textNode);
      refs.set(`${textNode.getKey()}:span`, instance.id);
      $writeLexical(textNode, instance.children, instances, refs);
    }
    // convert all lexical formats
    for (const [format, component] of lexicalFormats) {
      if (instance.component === component) {
        let textNode;
        if ($isTextNode(parent)) {
          textNode = parent;
        } else {
          textNode = $createTextNode("");
          parent.append(textNode);
        }
        textNode.toggleFormat(format);
        refs.set(`${textNode.getKey()}:${format}`, instance.id);
        $writeLexical(textNode, instance.children, instances, refs);
      }
    }
  }
};

export const $convertToLexical = (
  instances: Instances,
  rootInstanceId: Instance["id"],
  refs: Refs
) => {
  const root = $getRoot();
  const p = $createParagraphNode();
  root.append(p);
  const rootInstance = instances.get(rootInstanceId);
  if (rootInstance) {
    $writeLexical(p, rootInstance.children, instances, refs);
  }
};

export const $convertTextToLexical = (text: string) => {
  const root = $getRoot();
  const p = $createParagraphNode();
  root.append(p);
  const textNode = $createTextNode(text);
  p.append(textNode);
};
