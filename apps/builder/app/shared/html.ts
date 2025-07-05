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
import { camelCaseProperty, parseCss } from "@webstudio-is/css-data";
import { richTextContentTags } from "./content-model";
import { setIsSubsetOf } from "./shim";
import { isAttributeNameSafe } from "@webstudio-is/react-sdk";

type ElementNode = DefaultTreeAdapterMap["element"];

const spaceRegex = /^\s*$/;

const getAttributeType = (
  attribute: (typeof ariaAttributes)[number]
): "string" | "boolean" | "number" => {
  if (
    attribute.type === "string" ||
    attribute.type === "select" ||
    attribute.type === "url"
  ) {
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

export const generateFragmentFromHtml = (
  html: string,
  options?: { unknownTags?: boolean }
): WebstudioFragment => {
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
    if (
      node.tagName === "svg" &&
      node.sourceCodeLocation &&
      options?.unknownTags
    ) {
      const { startCol, startOffset, endOffset } = node.sourceCodeLocation;
      const indent = startCol - 1;
      const htmlFragment = html
        .slice(startOffset, endOffset)
        // try to preserve indentation
        .split("\n")
        .map((line, index) => {
          if (index > 0 && /^\s+$/.test(line.slice(0, indent))) {
            return line.slice(indent);
          }
          return line;
        })
        .join("\n");
      const instance: Instance = {
        type: "instance",
        id: getNewId(),
        component: "HtmlEmbed",
        children: [],
      };
      instances.set(instance.id, instance);
      const name = "code";
      const codeProp: Prop = {
        id: `${instance.id}:${name}`,
        instanceId: instance.id,
        name,
        type: "string",
        value: htmlFragment,
      };
      props.push(codeProp);
      return { type: "id" as const, value: instance.id };
    }
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
    // users expect to get optimized images by default
    // though still able to create raw img element
    if (node.tagName === "img") {
      instance.component = "Image";
      delete instance.tag;
    }
    instances.set(instance.id, instance);
    for (const attr of node.attrs) {
      // skip attributes which cannot be rendered in jsx
      if (!isAttributeNameSafe(attr.name)) {
        continue;
      }
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
      // selected option is represented as fake value attribute on select element
      if (node.tagName === "option" && attr.name === "selected") {
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
    if (node.tagName === "select") {
      for (const childNode of node.childNodes) {
        if (defaultTreeAdapter.isElementNode(childNode)) {
          if (
            childNode.tagName === "option" &&
            childNode.attrs.find((attr) => attr.name === "selected")
          ) {
            const valueAttr = childNode.attrs.find(
              (attr) => attr.name === "value"
            );
            // if value attribute is omitted, the value is taken from the text content of the option element
            const childText = childNode.childNodes.find((childNode) =>
              defaultTreeAdapter.isTextNode(childNode)
            );
            // selected option is represented as fake value attribute on select element
            props.push({
              id: `${instance.id}:value`,
              instanceId: instance.id,
              name: "value",
              type: "string",
              value: valueAttr?.value ?? childText?.value.trim() ?? "",
            });
          }
        }
      }
    }
    for (let index = 0; index < node.childNodes.length; index += 1) {
      const childNode = node.childNodes[index];
      if (defaultTreeAdapter.isElementNode(childNode)) {
        const child = convertElementToInstance(childNode);
        if (child) {
          instance.children.push(child);
        }
      }
      if (defaultTreeAdapter.isTextNode(childNode)) {
        // trim spaces around rich text
        // do not for code
        if (spaceRegex.test(childNode.value) && node.tagName !== "code") {
          if (index === 0 || index === node.childNodes.length - 1) {
            continue;
          }
        }
        let child: Instance["children"][number] = {
          type: "text",
          value: childNode.value,
        };
        if (node.tagName !== "code") {
          // collapse spacing characters inside of text to avoid preserved newlines
          child.value = child.value.replaceAll(/\s+/g, " ");
          // remove unnecessary spacing in nodes
          if (index === 0) {
            child.value = child.value.trimStart();
          }
          if (index === node.childNodes.length - 1) {
            child.value = child.value.trimEnd();
          }
        }
        // textarea content is initial value
        // and represented with fake value attribute
        if (node.tagName === "textarea") {
          props.push({
            id: `${instance.id}:value`,
            instanceId: instance.id,
            name: "value",
            type: "string",
            value: child.value.trim(),
          });
          continue;
        }
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
          // remove spaces between elements outside of rich text
          if (spaceRegex.test(childNode.value)) {
            continue;
          }
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

  const documentFragment = parseFragment(html, {
    scriptingEnabled: false,
    sourceCodeLocationInfo: true,
  });
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
