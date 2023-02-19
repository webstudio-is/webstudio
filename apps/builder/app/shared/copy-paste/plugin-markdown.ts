import store from "immerhin";
import { gfm } from "micromark-extension-gfm";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Instance, Prop } from "@webstudio-is/project-build";
import type { Root } from "mdast-util-from-markdown/lib";
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

// @todo List, ListItem, Definition, Code, Blockquote, Break, Image
const astTypeComponentMap: Record<string, Instance["component"]> = {
  paragraph: "Paragraph",
  heading: "Heading",
  strong: "Bold",
  emphasis: "Italic",
  link: "RichTextLink",
  image: "Image",
};

type Options = { generateId?: typeof nanoid };

const toInstancesData = (
  ast: { children: Root["children"] },
  options: Options = {},
  props: Array<Prop> = []
): { instances: Instance["children"]; props: Array<Prop> } => {
  const { generateId = nanoid } = options;
  const instances: Instance["children"] = [];

  for (const child of ast.children) {
    const component = astTypeComponentMap[child.type];
    if (component) {
      const instance = utils.tree.createInstance({
        id: generateId(),
        component,
        children:
          "children" in child
            ? toInstancesData(child, options, props).instances
            : [],
      });
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

    if (child.type === "text") {
      instances.push({
        type: "text",
        value: child.value,
      });
    }
  }
  return { instances, props };
};

export const parse = (clipboardData: string, options?: Options) => {
  const ast = fromMarkdown(clipboardData, micromarkOptions);
  if (ast.children.length === 0) {
    return;
  }
  console.log(JSON.stringify(ast, null, 2));
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
        insertInstanceMutable(instancesIndex, instance, dropTarget);
      }
      for (const prop of data.props) {
        props.set(prop.id, prop);
      }
    }
  );
};
