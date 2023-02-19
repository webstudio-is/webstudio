import store from "immerhin";
import { gfm } from "micromark-extension-gfm";
import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Instance, Prop } from "@webstudio-is/project-build";
import { utils } from "@webstudio-is/project";
import { nanoid } from "nanoid";
import {
  createInstancesIndex,
  findClosestDroppableTarget,
  insertInstanceMutable,
} from "../tree-utils";
import {
  instancesIndexStore,
  propsStore,
  rootInstanceContainer,
  selectedInstanceIdStore,
} from "../nano-states";

const micromarkOptions = { extensions: [gfm()] };

export const mimeType = "text/plain";

// @todo Definition, Strikethrough
const astTypeComponentMap: Record<string, Instance["component"]> = {
  paragraph: "Paragraph",
  heading: "Heading",
  strong: "Bold",
  emphasis: "Italic",
  link: "RichTextLink",
  image: "Image",
  blockquote: "Blockquote",
  code: "Code",
  inlineCode: "InlineCode",
  list: "List",
  listItem: "ListItem",
};

type Options = { generateId?: typeof nanoid };

const createInstance = (
  {
    component,
    node,
    props,
  }: {
    component: Instance["component"];
    node: Root["children"][number];
    props: Array<Prop>;
  },
  options: Options
) => {
  const { generateId = nanoid } = options;
  return utils.tree.createInstance({
    id: generateId(),
    component,
    children:
      "children" in node ? toInstancesData(node, options, props).instances : [],
  });
};

const toInstancesData = (
  ast: { children: Root["children"] },
  options: Options = {},
  props: Array<Prop> = []
): { instances: Instance["children"]; props: Array<Prop> } => {
  const { generateId = nanoid } = options;
  const instances: Instance["children"] = [];

  for (const child of ast.children) {
    if (child.type === "text") {
      instances.push({
        type: child.type,
        value: child.value,
      });
      continue;
    }

    const component = astTypeComponentMap[child.type];
    if (component) {
      const instance = createInstance(
        { component, node: child, props },
        options
      );
      instances.push(instance);
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
      }
      if (child.type === "code") {
        instance.children.push({
          type: "text",
          value: child.value,
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
  }
  return { instances, props };
};

export const parse = (clipboardData: string, options?: Options) => {
  const ast = fromMarkdown(clipboardData, micromarkOptions);
  if (ast.children.length === 0) {
    return;
  }
  return toInstancesData(ast, options);
};

export const onPaste = (clipboardData: string) => {
  const data = parse(clipboardData);
  if (data === undefined) {
    return;
  }

  const dropTarget = findClosestDroppableTarget(
    instancesIndexStore.get(),
    selectedInstanceIdStore.get()
  );
  store.createTransaction(
    [rootInstanceContainer, propsStore],
    (rootInstance, props) => {
      const instancesIndex = createInstancesIndex(rootInstance);
      for (const instance of data.instances) {
        if (instance.type !== "text") {
          insertInstanceMutable(instancesIndex, instance, dropTarget);
        }
      }
      for (const prop of data.props) {
        props.set(prop.id, prop);
      }
    }
  );
};
