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
import {
  elementComponent,
  type Instance,
  type Instances,
} from "@webstudio-is/sdk";
import { $isSpanNode, $setNodeSpan } from "./toolbar-connector";

// Map<nodeKey, instanceId>
export type Refs = Map<string, string>;

const legacyLexicalFormats = [
  ["bold", "Bold"],
  ["italic", "Italic"],
  ["superscript", "Superscript"],
  ["subscript", "Subscript"],
] as const;

const elementLexicalFormats = [
  ["bold", "b"],
  ["italic", "i"],
  ["superscript", "sup"],
  ["subscript", "sub"],
] as const;

const $writeUpdates = (
  node: ElementNode,
  instanceChildren: Instance["children"],
  instancesList: Instance[],
  refs: Refs,
  newLinkKeyToInstanceId: Refs,
  isElement: boolean
) => {
  const children = node.getChildren();
  for (const child of children) {
    if ($isParagraphNode(child)) {
      $writeUpdates(
        child,
        instanceChildren,
        instancesList,
        refs,
        newLinkKeyToInstanceId,
        isElement
      );
    }
    if ($isLineBreakNode(child)) {
      instanceChildren.push({ type: "text", value: "\n" });
    }
    if ($isLinkNode(child)) {
      const key = child.getKey();
      const id = refs.get(key) ?? newLinkKeyToInstanceId.get(key) ?? nanoid();
      refs.set(key, id);
      instanceChildren.push({
        type: "id",
        value: id,
      });
      const childChildren: Instance["children"] = [];
      $writeUpdates(
        child,
        childChildren,
        instancesList,
        refs,
        newLinkKeyToInstanceId,
        isElement
      );
      if (isElement) {
        instancesList.push({
          type: "instance",
          id,
          component: elementComponent,
          tag: "a",
          children: childChildren,
        });
      } else {
        instancesList.push({
          type: "instance",
          id,
          component: "RichTextLink",
          children: childChildren,
        });
      }
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
        const childChildren: Instance["children"] = [];
        if (isElement) {
          instancesList.push({
            type: "instance",
            id,
            component: elementComponent,
            tag: "span",
            children: childChildren,
          });
        } else {
          instancesList.push({
            type: "instance",
            id,
            component: "Span",
            children: childChildren,
          });
        }
        parentUpdates.push({ type: "id", value: id });
        parentUpdates = childChildren;
      }
      // convert all lexical formats
      if (isElement) {
        for (const [format, tag] of elementLexicalFormats) {
          if (child.hasFormat(format)) {
            const key = `${child.getKey()}:${format}`;
            const id = refs.get(key) ?? nanoid();
            refs.set(key, id);
            const childInstance: Instance = {
              type: "instance",
              id,
              component: elementComponent,
              tag,
              children: [],
            };
            instancesList.push(childInstance);
            parentUpdates.push({ type: "id", value: id });
            parentUpdates = childInstance.children;
          }
        }
      } else {
        for (const [format, component] of legacyLexicalFormats) {
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
      }
      parentUpdates.push({ type: "text", value: text });
    }
  }
};

export const $convertToUpdates = (
  treeRootInstance: Instance,
  refs: Refs,
  newLinkKeyToInstanceId: Refs
) => {
  const treeRootInstanceChildren: Instance["children"] = [];
  const instancesList: Instance[] = [
    {
      ...treeRootInstance,
      children: treeRootInstanceChildren,
    },
  ];
  const root = $getRoot();
  $writeUpdates(
    root,
    treeRootInstanceChildren,
    instancesList,
    refs,
    newLinkKeyToInstanceId,
    treeRootInstance.component === elementComponent
  );
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
    const isLinkInstance =
      instance.component === "RichTextLink" ||
      (instance.component === elementComponent && instance.tag === "a");
    if (isLinkInstance && $isElementNode(parent)) {
      const linkNode = $createLinkNode("");
      refs.set(linkNode.getKey(), instance.id);
      parent.append(linkNode);
      $writeLexical(linkNode, instance.children, instances, refs);
    }
    if (
      instance.component === "Span" ||
      (instance.component === elementComponent && instance.tag === "span")
    ) {
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
    for (const [format, component] of legacyLexicalFormats) {
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
    // convert all lexical formats
    for (const [format, tag] of elementLexicalFormats) {
      if (instance.component === elementComponent && instance.tag === tag) {
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
