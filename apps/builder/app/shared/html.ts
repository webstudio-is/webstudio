import {
  type DefaultTreeAdapterMap,
  defaultTreeAdapter,
  parseFragment,
} from "parse5";
import {
  type WebstudioFragment,
  type Instance,
  elementComponent,
  Prop,
  tags,
  StyleDecl,
  Breakpoint,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { ariaAttributes, attributesByTag } from "@webstudio-is/html-data";
import { richTextContentTags } from "./content-model";
import { setIsSubsetOf } from "./shim";
import { camelCaseProperty, parseCss } from "@webstudio-is/css-data";

type ElementNode = DefaultTreeAdapterMap["element"];

const spaceRegex = /^\s*$/;

const getAttributeType = (
  attribute: (typeof ariaAttributes)[number]
): "string" | "boolean" | "number" => {
  if (attribute.type === "string" || attribute.type === "select") {
    return "string";
  }
  if (attribute.type === "number" || attribute.type === "boolean") {
    return attribute.type;
  }
  attribute.type satisfies never;
  throw Error("Unknown type");
};

const getAttributeTypes = () => {
  const attributeTypes = new Map<string, "string" | "number" | "boolean">();
  for (const attribute of ariaAttributes) {
    attributeTypes.set(attribute.name, getAttributeType(attribute));
  }
  for (const attribute of attributesByTag["*"] ?? []) {
    attributeTypes.set(attribute.name, getAttributeType(attribute));
  }
  for (const [tag, attributes] of Object.entries(attributesByTag)) {
    if (attributes) {
      for (const attribute of attributes) {
        attributeTypes.set(
          `${tag}:${attribute.name}`,
          getAttributeType(attribute)
        );
      }
    }
  }
  return attributeTypes;
};

const findContentTags = (element: ElementNode, tags = new Set<string>()) => {
  for (const childNode of element.childNodes) {
    if (defaultTreeAdapter.isElementNode(childNode)) {
      tags.add(childNode.tagName);
      findContentTags(childNode, tags);
    }
  }
  return tags;
};

export const generateFragmentFromHtml = (html: string): WebstudioFragment => {
  const attributeTypes = getAttributeTypes();
  const instances = new Map<Instance["id"], Instance>();
  const styleSourceSelections: StyleSourceSelection[] = [];
  const styleSources: StyleSource[] = [];
  const styles: StyleDecl[] = [];
  const breakpoints: Breakpoint[] = [];
  const props: Prop[] = [];
  let lastId = -1;
  const getNewId = () => {
    lastId += 1;
    return lastId.toString();
  };

  let baseBreakpoint: undefined | Breakpoint;
  const getBaseBreakpointId = () => {
    if (baseBreakpoint) {
      return baseBreakpoint.id;
    }
    baseBreakpoint = { id: "base", label: "" };
    breakpoints.push(baseBreakpoint);
    return baseBreakpoint.id;
  };
  const createLocalStyles = (instanceId: string, css: string) => {
    const localStyleSource: StyleSource = {
      type: "local",
      id: `${instanceId}:ws:style`,
    };
    styleSources.push(localStyleSource);
    styleSourceSelections.push({ instanceId, values: [localStyleSource.id] });
    for (const { property, value } of parseCss(`.styles{${css}}`)) {
      styles.push({
        styleSourceId: localStyleSource.id,
        breakpointId: getBaseBreakpointId(),
        property: camelCaseProperty(property),
        value,
      });
    }
  };

  const convertElementToInstance = (node: ElementNode) => {
    if (!tags.includes(node.tagName)) {
      return;
    }
    const instance: Instance = {
      type: "instance",
      id: getNewId(),
      component: elementComponent,
      tag: node.tagName,
      children: [],
    };
    instances.set(instance.id, instance);
    for (const attr of node.attrs) {
      const id = `${instance.id}:${attr.name}`;
      const instanceId = instance.id;
      const name = attr.name;
      // cast props to types extracted from html and aria specs
      const type =
        attributeTypes.get(`${node.tagName}:${name}`) ??
        attributeTypes.get(name) ??
        "string";
      // ignore style attribute to not conflict with react
      if (attr.name === "style") {
        createLocalStyles(instanceId, attr.value);
        continue;
      }
      if (type === "string") {
        props.push({ id, instanceId, name, type, value: attr.value });
        continue;
      }
      if (type === "number") {
        props.push({ id, instanceId, name, type, value: Number(attr.value) });
        continue;
      }
      if (type === "boolean") {
        props.push({ id, instanceId, name, type, value: true });
        continue;
      }
      (type) satisfies never;
    }
    const contentTags = findContentTags(node);
    const hasNonRichTextContent = !setIsSubsetOf(
      contentTags,
      richTextContentTags
    );
    for (const childNode of node.childNodes) {
      if (defaultTreeAdapter.isElementNode(childNode)) {
        const child = convertElementToInstance(childNode);
        if (child) {
          instance.children.push(child);
        }
      }
      if (defaultTreeAdapter.isTextNode(childNode)) {
        if (spaceRegex.test(childNode.value)) {
          continue;
        }
        let child: Instance["children"][number] = {
          type: "text",
          // collapse spacing characters inside of text to avoid preserved newlines
          value: childNode.value.replaceAll(/\s+/g, " "),
        };
        // when element has content elements other than supported by rich text
        // wrap its text children with span, for example
        // <div>
        //   text
        //   <article></article>
        // </div>
        // is converted into
        // <div>
        //   <span>text</span>
        //   <article></article>
        // </div>
        if (hasNonRichTextContent) {
          const span: Instance = {
            type: "instance",
            id: getNewId(),
            component: elementComponent,
            tag: "span",
            children: [child],
          };
          instances.set(span.id, span);
          child = { type: "id", value: span.id };
        }
        instance.children.push(child);
      }
    }
    return { type: "id" as const, value: instance.id };
  };

  const documentFragment = parseFragment(html, { scriptingEnabled: false });
  const children: Instance["children"] = [];
  for (const childNode of documentFragment.childNodes) {
    if (defaultTreeAdapter.isElementNode(childNode)) {
      const child = convertElementToInstance(childNode);
      if (child) {
        children.push(child);
      }
    }
  }
  return {
    children,
    instances: Array.from(instances.values()),
    props,
    dataSources: [],
    resources: [],
    styleSourceSelections,
    styleSources,
    styles,
    breakpoints,
    assets: [],
  };
};
