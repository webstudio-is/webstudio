import { nanoid } from "nanoid";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type {
  Breakpoint,
  Instance,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import {
  findClosestInsertable,
  insertWebstudioFragmentAt,
} from "../instance-utils";
import { $breakpoints } from "../nano-states";
import { isBaseBreakpoint } from "../breakpoints";
import { denormalizeSrcProps } from "./asset-upload";

const micromarkOptions = {
  extensions: [gfm()],
  mdastExtensions: [gfmFromMarkdown()],
};

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
  code: "CodeText",
  // @todo same problem as with image
  inlineCode: "CodeText",
  list: "List",
  listItem: "ListItem",
  thematicBreak: "Separator",
};

type Options = { generateId?: typeof nanoid };

type Root = ReturnType<typeof fromMarkdown>;

const toInstanceData = (
  data: WebstudioFragment,
  breakpointId: Breakpoint["id"],
  ast: { children: Root["children"] },
  options: Options = {}
): Instance["children"] => {
  const { instances, props, styleSources, styleSourceSelections, styles } =
    data;
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
    const instanceId = generateId();
    const instance: Instance = {
      type: "instance",
      id: instanceId,
      component,
      children:
        "children" in child
          ? toInstanceData(data, breakpointId, child, options)
          : [],
    };
    instances.push(instance);
    children.push({ type: "id", value: instanceId });

    if (child.type === "heading") {
      props.push({
        id: generateId(),
        type: "string",
        name: "tag",
        instanceId,
        value: `h${child.depth}`,
      });
    }
    if (child.type === "link") {
      props.push({
        id: generateId(),
        type: "string",
        name: "href",
        instanceId,
        value: child.url,
      });
    }
    if (child.type === "image") {
      props.push({
        id: generateId(),
        type: "string",
        name: "src",
        instanceId,
        value: child.url,
      });
    }
    if (child.type === "inlineCode") {
      props.push({
        id: generateId(),
        type: "string",
        name: "code",
        instanceId,
        value: child.value,
      });
      const styleSourceId = generateId();
      styleSources.push({ type: "local", id: styleSourceId });
      styleSourceSelections.push({ instanceId, values: [styleSourceId] });
      styles.push({
        breakpointId,
        styleSourceId,
        property: "display",
        value: { type: "keyword", value: "inline-block" },
      });
    }
    if (child.type === "code") {
      props.push({
        id: generateId(),
        type: "string",
        name: "code",
        instanceId,
        value: child.value,
      });
      if (child.lang) {
        props.push({
          id: generateId(),
          type: "string",
          name: "lang",
          instanceId,
          value: child.lang,
        });
      }
    }
    if (child.type === "list") {
      if (typeof child.ordered === "boolean") {
        props.push({
          id: generateId(),
          type: "boolean",
          name: "ordered",
          instanceId,
          value: child.ordered,
        });
      }
      if (typeof child.start === "number") {
        props.push({
          id: generateId(),
          type: "number",
          name: "start",
          instanceId,
          value: child.start,
        });
      }
    }

    if ("title" in child && child.title) {
      props.push({
        id: generateId(),
        type: "string",
        name: "title",
        instanceId,
        value: child.title,
      });
    }
    if ("alt" in child && child.alt) {
      props.push({
        id: generateId(),
        type: "string",
        name: "alt",
        instanceId,
        value: child.alt,
      });
    }
  }

  return children;
};

const parse = (clipboardData: string, options?: Options) => {
  const ast = fromMarkdown(clipboardData, micromarkOptions);
  if (ast.children.length === 0) {
    return;
  }
  const breakpoints = $breakpoints.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return;
  }
  const data: WebstudioFragment = {
    children: [],
    instances: [],
    props: [],
    breakpoints: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    dataSources: [],
    resources: [],
    assets: [],
  };
  data.children = toInstanceData(data, baseBreakpoint.id, ast, options);
  return data;
};

export const onPaste = async (clipboardData: string) => {
  let fragment = parse(clipboardData);
  if (fragment === undefined) {
    return false;
  }
  fragment = await denormalizeSrcProps(fragment);
  const insertable = findClosestInsertable(fragment);
  if (insertable === undefined) {
    return false;
  }
  insertWebstudioFragmentAt(fragment, insertable);
  return true;
};

export const __testing__ = {
  parse,
};
