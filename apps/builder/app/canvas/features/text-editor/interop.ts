import {
  type TextNode,
  type ElementNode,
  type TextFormatType,
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  $createLineBreakNode,
  $isTextNode,
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
type CreateId = () => string;

const legacyLexicalFormats = [
  ["bold", "Bold"],
  ["italic", "Italic"],
  ["superscript", "Superscript"],
  ["subscript", "Subscript"],
] as const;

const elementLexicalFormats = [
  ["bold", "b", "strong"],
  ["italic", "i", "em"],
  ["superscript", "sup"],
  ["subscript", "sub"],
  ["strikethrough", "del"],
  ["code", "code"],
] as const;

const $writeUpdates = (
  node: ElementNode,
  instanceChildren: Instance["children"],
  instancesList: Instance[],
  refs: Refs,
  newLinkKeyToInstanceId: Refs,
  createId: CreateId,
  transientTextNodeKeys: ReadonlySet<string>,
  inheritedFormats: ReadonlySet<string> = new Set()
) => {
  const wrapFormats = (child: TextNode | ElementNode) => {
    let parentUpdates = instanceChildren;
    const formats = new Set(inheritedFormats);
    const textNodes = $isTextNode(child) ? [child] : child.getAllTextNodes();
    const candidates = [["span", "span"], ...elementLexicalFormats] as const;
    for (const [format, defaultTag, ...aliases] of candidates) {
      if (formats.has(format)) {
        continue;
      }
      const alias = aliases.find((tag) => refs.has(`${child.getKey()}:${tag}`));
      const key = `${child.getKey()}:${alias ?? format}`;
      if (!$isTextNode(child) && !refs.has(key)) {
        continue;
      }
      if (
        textNodes.length === 0 ||
        !textNodes.every((text) =>
          format === "span" ? $isSpanNode(text) : text.hasFormat(format)
        )
      ) {
        continue;
      }
      let id = refs.get(key) ?? createId();
      const previous = parentUpdates.at(-1);
      const existing = instancesList.find((instance) => instance.id === id);
      if (
        previous?.type === "id" &&
        previous.value === id &&
        existing !== undefined
      ) {
        parentUpdates = existing.children;
      } else {
        if (existing !== undefined) {
          id = createId();
        }
        const instance: Instance = {
          type: "instance",
          id,
          component: elementComponent,
          tag: alias ?? defaultTag,
          children: [],
        };
        refs.set(key, id);
        instancesList.push(instance);
        parentUpdates.push({ type: "id", value: id });
        parentUpdates = instance.children;
      }
      formats.add(format);
    }
    return { parentUpdates, formats };
  };
  const children = node.getChildren();
  for (const child of children) {
    if ($isParagraphNode(child)) {
      $writeUpdates(
        child,
        instanceChildren,
        instancesList,
        refs,
        newLinkKeyToInstanceId,
        createId,
        transientTextNodeKeys
      );
    }
    if ($isLineBreakNode(child)) {
      instanceChildren.push({ type: "text", value: "\n" });
    }
    if ($isLinkNode(child)) {
      const { parentUpdates, formats } = wrapFormats(child);
      const key = child.getKey();
      const id = refs.get(key) ?? newLinkKeyToInstanceId.get(key) ?? createId();
      refs.set(key, id);
      parentUpdates.push({
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
        createId,
        transientTextNodeKeys,
        formats
      );
      instancesList.push({
        type: "instance",
        id,
        component: elementComponent,
        tag: "a",
        children: childChildren,
      });
    }
    if ($isTextNode(child)) {
      if (transientTextNodeKeys.has(child.getKey())) {
        continue;
      }
      // support nesting bold into italic and vice versa
      // considering lexical represents both as single node
      // and add ref suffix to distinct styling on one node key
      const text = child.getTextContent();
      const { parentUpdates } = wrapFormats(child);
      parentUpdates.push({ type: "text", value: text });
    }
  }
};

export const $convertToUpdates = (
  treeRootInstance: Instance,
  refs: Refs,
  newLinkKeyToInstanceId: Refs,
  createId: CreateId,
  transientTextNodeKeys: ReadonlySet<string> = new Set()
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
    createId,
    transientTextNodeKeys
  );
  return instancesList;
};

export const $convertToPlainTextUpdate = (treeRootInstance: Instance) => [
  {
    ...treeRootInstance,
    children: [{ type: "text" as const, value: $getRoot().getTextContent() }],
  },
];

type InlineFormat = {
  format: TextFormatType | "span";
  suffix: string;
  id: string;
};

const $writeLexical = (
  parent: ElementNode,
  children: Instance["children"],
  instances: Instances,
  refs: Refs,
  formats: InlineFormat[] = []
) => {
  for (const child of children) {
    if (child.type === "text") {
      // convert text
      if (child.value === "\n") {
        const lineBreakNode = $createLineBreakNode();
        parent.append(lineBreakNode);
        continue;
      }
      const textNode = $createTextNode(child.value);
      for (const { format, suffix, id } of formats) {
        if (format === "span") {
          $setNodeSpan(textNode);
        } else if (!textNode.hasFormat(format)) {
          textNode.toggleFormat(format);
        }
        refs.set(`${textNode.getKey()}:${suffix}`, id);
      }
      parent.append(textNode);
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
    if (isLinkInstance) {
      const linkNode = $createLinkNode("");
      refs.set(linkNode.getKey(), instance.id);
      for (const { suffix, id } of formats) {
        refs.set(`${linkNode.getKey()}:${suffix}`, id);
      }
      parent.append(linkNode);
      $writeLexical(linkNode, instance.children, instances, refs, formats);
      continue;
    }
    if (
      instance.component === "Span" ||
      (instance.component === elementComponent && instance.tag === "span")
    ) {
      $writeLexical(parent, instance.children, instances, refs, [
        ...formats,
        { format: "span", suffix: "span", id: instance.id },
      ]);
      continue;
    }
    // convert all lexical formats
    for (const [format, component] of legacyLexicalFormats) {
      if (instance.component === component) {
        $writeLexical(parent, instance.children, instances, refs, [
          ...formats,
          { format, suffix: format, id: instance.id },
        ]);
      }
    }
    // convert all lexical formats
    for (const [format, tag, ...aliases] of elementLexicalFormats) {
      const alias = aliases.find((tag) => instance.tag === tag);
      if (
        instance.component === elementComponent &&
        (instance.tag === tag || alias !== undefined)
      ) {
        $writeLexical(parent, instance.children, instances, refs, [
          ...formats,
          { format, suffix: alias ?? format, id: instance.id },
        ]);
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
