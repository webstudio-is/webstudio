import store from "immerhin";
import { gfm } from "micromark-extension-gfm";
import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Instance, Prop } from "@webstudio-is/project-build";
import { nanoid } from "nanoid";
import { insertInstancesMutable } from "../tree-utils";
import { findClosestDroppableTarget } from "../instance-utils";
import {
  instancesStore,
  propsStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedPageStore,
} from "../nano-states";

const micromarkOptions = { extensions: [gfm()] };

export const mimeType = "text/plain";

// @todo Definition, Strikethrough, Table
const astTypeComponentMap: Record<string, Instance["component"]> = {
  paragraph: "Paragraph",
  heading: "Heading",
  strong: "Bold",
  emphasis: "Italic",
  link: "RichTextLink",
  // @todo image should not be rendered inside paragraph
  // we need to either have RichTextImage or support Image inside RichText
  image: "Image",
  blockquote: "Blockquote",
  code: "Code",
  // @todo same problem as with image
  inlineCode: "Code",
  list: "List",
  listItem: "ListItem",
  thematicBreak: "Separator",
};

type Options = { generateId?: typeof nanoid };

const toInstanceData = (
  instances: Instance[],
  props: Prop[],
  ast: { children: Root["children"] },
  options: Options = {}
): Instance["children"] => {
  const { generateId = nanoid } = options;
  const children: Instance["children"] = [];

  for (const child of ast.children) {
    if (child.type === "text") {
      children.push({ type: "text", value: child.value });
      continue;
    }

    const component = astTypeComponentMap[child.type];
    if (component === undefined) {
      continue;
    }
    const instance: Instance = {
      type: "instance",
      id: generateId(),
      component,
      children:
        "children" in child
          ? toInstanceData(instances, props, child, options)
          : [],
    };
    instances.push(instance);
    children.push({ type: "id", value: instance.id });

    if (child.type === "heading") {
      props.push({
        id: generateId(),
        type: "string",
        name: "tag",
        instanceId: instance.id,
        value: `h${child.depth}`,
      });
    }
    if (child.type === "link") {
      props.push({
        id: generateId(),
        type: "string",
        name: "href",
        instanceId: instance.id,
        value: child.url,
      });
    }
    if (child.type === "image") {
      props.push({
        id: generateId(),
        type: "string",
        name: "src",
        instanceId: instance.id,
        value: child.url,
      });
    }
    if (child.type === "inlineCode") {
      instance.children.push({
        type: "text",
        value: child.value,
      });
      props.push({
        id: generateId(),
        type: "boolean",
        name: "inline",
        instanceId: instance.id,
        value: true,
      });
    }
    if (child.type === "code") {
      instance.children.push({
        type: "text",
        value: child.value,
      });
      props.push({
        id: generateId(),
        type: "boolean",
        name: "inline",
        instanceId: instance.id,
        value: false,
      });
      if (child.lang) {
        props.push({
          id: generateId(),
          type: "string",
          name: "lang",
          instanceId: instance.id,
          value: child.lang,
        });
      }
      if (child.meta) {
        props.push({
          id: generateId(),
          type: "string",
          name: "meta",
          instanceId: instance.id,
          value: child.meta,
        });
      }
    }
    if (child.type === "list") {
      if (typeof child.ordered === "boolean") {
        props.push({
          id: generateId(),
          type: "boolean",
          name: "ordered",
          instanceId: instance.id,
          value: child.ordered,
        });
      }
      if (typeof child.start === "number") {
        props.push({
          id: generateId(),
          type: "number",
          name: "start",
          instanceId: instance.id,
          value: child.start,
        });
      }
    }

    if ("title" in child && child.title) {
      props.push({
        id: generateId(),
        type: "string",
        name: "title",
        instanceId: instance.id,
        value: child.title,
      });
    }
    if ("alt" in child && child.alt) {
      props.push({
        id: generateId(),
        type: "string",
        name: "alt",
        instanceId: instance.id,
        value: child.alt,
      });
    }
  }

  return children;
};

export const parse = (clipboardData: string, options?: Options) => {
  const ast = fromMarkdown(clipboardData, micromarkOptions);
  if (ast.children.length === 0) {
    return;
  }
  const instances: Instance[] = [];
  const props: Prop[] = [];
  const children = toInstanceData(instances, props, ast, options);
  return { props, instances, children };
};

export const onPaste = (clipboardData: string): boolean => {
  const data = parse(clipboardData);
  const selectedPage = selectedPageStore.get();
  if (data === undefined || selectedPage === undefined) {
    return false;
  }
  // paste to the root if nothing is selected
  const instanceSelector = selectedInstanceSelectorStore.get() ?? [
    selectedPage.rootInstanceId,
  ];
  const dragComponents = Array.from(
    new Set(data.instances.map((instance) => instance.component))
  );
  const dropTarget = findClosestDroppableTarget(
    registeredComponentMetasStore.get(),
    instancesStore.get(),
    instanceSelector,
    dragComponents
  );
  if (dropTarget === undefined) {
    return false;
  }
  store.createTransaction([instancesStore, propsStore], (instances, props) => {
    insertInstancesMutable(
      instances,
      props,
      registeredComponentMetasStore.get(),
      data.instances,
      data.children,
      dropTarget
    );
    for (const prop of data.props) {
      props.set(prop.id, prop);
    }
  });
  return true;
};
