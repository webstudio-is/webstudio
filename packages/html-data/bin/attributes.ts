import { mkdir, writeFile } from "node:fs/promises";
import hash from "@emotion/hash";
import {
  coreMetas,
  createScope,
  elementComponent,
  type Instance,
  type Instances,
  type Prop,
  type Props,
} from "@webstudio-is/sdk";
import { generateWebstudioComponent } from "@webstudio-is/react-sdk";
import {
  findByClasses,
  findByTags,
  getAttr,
  getTextContent,
  loadHtmlIndices,
  loadSvgSinglePage,
  parseHtml,
} from "./crawler";
import { possibleStandardNames } from "./possible-standard-names";
import { ignoredTags } from "./overrides";

const validHtmlAttributes = new Set<string>();

type Attribute = {
  name: string;
  description: string;
  required?: boolean;
  type: "string" | "boolean" | "number" | "select" | "url";
  options?: string[];
};

const overrides: Record<string, Record<string, false | Partial<Attribute>>> = {
  "*": {
    // react has own opinions about it
    style: false,
    // specific to input in react types
    enterkeyhint: false,
    inert: false,
    popover: false,
    writingsuggestions: false,
    hidden: {
      // "until-found"; "hidden"; the empty string
      type: "boolean",
      options: undefined,
    },
  },
  a: {
    href: { type: "url", required: true },
    target: { required: true },
    download: { type: "boolean", required: true },
  },
  blockquote: {
    cite: { required: true },
  },
  form: {
    action: { required: true },
    method: { required: true },
    enctype: { required: true },
  },
  area: {
    ping: false,
  },
  button: {
    type: { required: true },
    command: false,
    commandfor: false,
    popovertarget: false,
    popovertargetaction: false,
  },
  label: {
    for: { required: true },
  },
  dialog: {
    closedby: false,
  },
  img: {
    src: { required: true },
    alt: { required: true },
    width: { required: true },
    height: { required: true },
    ismap: false,
  },
  input: {
    name: { required: true },
    value: { required: true },
    checked: { required: true },
    type: { required: true },
    placeholder: { required: true },
    required: { required: true },
    autofocus: { required: true },
    alpha: false,
    colorspace: false,
    // react types have it only in textarea
    dirname: false,
    popovertarget: false,
    popovertargetaction: false,
  },
  textarea: {
    name: { required: true },
    placeholder: { required: true },
    required: { required: true },
    autofocus: { required: true },
  },
  select: {
    name: { required: true },
    required: { required: true },
    autofocus: { required: true },
    // mutltiple mode is not considered accessible
    // and we cannot express it in builder so easier to remove
    multiple: false,
  },
  option: {
    label: { required: true },
    value: { required: true },
    disabled: { required: true },
    // enforce fake value attribute on select element
    selected: false,
  },
};

// Crawl WHATWG HTML.
const html = await loadHtmlIndices();
const document = parseHtml(html);
const table = findByTags(document, "table").find(
  (table) => getAttr(table, "id")?.value === "attributes-1"
);
const [tbody] = findByTags(table, "tbody");
const rows = findByTags(tbody, "tr");

const attributesByTag: Record<string, Attribute[]> = {};
// textarea does not have value attribute and text content is used as initial value
// introduce fake value attribute to manage initial state similar to input
attributesByTag.textarea = [
  {
    name: "value",
    description: "Value of the form control",
    type: "string",
    required: true,
  },
];
// select does not have value attribute and selected options are used as initial value
// introduce fake value attribute to manage initial state similar to input
attributesByTag.select = [
  {
    name: "value",
    description: "Value of the form control",
    type: "string",
    required: true,
  },
];

for (const row of rows) {
  const attribute = getTextContent(row.childNodes[0]).trim();
  const elements = getTextContent(row.childNodes[1]).trim();
  const description = getTextContent(row.childNodes[2]).trim();
  const tags = /HTML elements/.test(elements)
    ? ["*"]
    : elements.split(/;/g).map((d) => d.replace(/\([^)]+\)/g, "").trim());
  let value = getTextContent(row.childNodes[3]).trim().toLowerCase();
  if (value.endsWith(";")) {
    value = value.slice(0, -1);
  }
  let possibleOptions = value
    .split(/\s*;\s*/)
    .filter((item) => item.startsWith('"') && item.endsWith('"'))
    .map((item) => item.slice(1, -1));
  if (attribute === "target" || attribute === "formtarget") {
    possibleOptions = ["_blank", "_self", "_parent", "_top"];
  }
  if (value.includes("input type keyword")) {
    possibleOptions = [
      "hidden",
      "text",
      "search",
      "tel",
      "url",
      "email",
      "password",
      "date",
      "month",
      "week",
      "time",
      "datetime-local",
      "number",
      "range",
      "color",
      "checkbox",
      "radio",
      "file",
      "submit",
      "image",
      "reset",
      "button",
    ];
  }
  let type: "string" | "boolean" | "number" | "select" = "string";
  let options: undefined | string[];
  if (possibleOptions.length > 0) {
    type = "select";
    options = possibleOptions;
  } else if (value.includes("boolean attribute")) {
    type = "boolean";
  } else if (
    (value.includes("number") || value.includes("integer")) &&
    !value.includes("list") &&
    !value.includes("string")
  ) {
    type = "number";
  }
  validHtmlAttributes.add(attribute);
  for (let tag of tags) {
    tag = tag.toLowerCase().trim();
    if (/custom elements/i.test(tag)) {
      continue;
    }
    if (ignoredTags.includes(tag)) {
      continue;
    }
    if (!attributesByTag[tag]) {
      attributesByTag[tag] = [];
    }
    const attributes = attributesByTag[tag];
    if (!attributes.some((item) => item.name === attribute)) {
      const override = overrides[tag]?.[attribute];
      if (override !== false) {
        attributes.push({
          name: attribute,
          description,
          type,
          options,
          ...override,
        });
      }
    }
  }
}

{
  const svg = await loadSvgSinglePage();
  const document = parseHtml(svg);
  const attributeOptions = new Map<string, string[]>();
  // find all property definition and extract there keywords
  for (const propdef of findByClasses(document, "propdef")) {
    let options: undefined | string[];
    for (const row of findByTags(propdef, "tr")) {
      const [nameNode, valueNode] = row.childNodes;
      const name = getTextContent(nameNode);
      const list = getTextContent(valueNode)
        .trim()
        .split(/\s+\|\s+/);
      if (
        name.toLowerCase().includes("value") &&
        list.every((item) => item.match(/^[a-zA-Z-]+$/))
      ) {
        options = list;
      }
    }
    for (const propNameNode of findByClasses(propdef, "propdef-title")) {
      const propName = getTextContent(propNameNode).slice(1, -1);
      if (options) {
        attributeOptions.set(propName, options);
      }
    }
  }

  for (const summary of findByClasses(document, "element-summary")) {
    const [tag] = findByClasses(summary, "element-summary-name").map((item) =>
      getTextContent(item).slice(1, -1)
    );
    // ignore existing
    if (attributesByTag[tag] || ignoredTags.includes(tag)) {
      continue;
    }
    const attributes = new Set<string>();
    const [dl] = findByTags(summary, "dl");
    for (let index = 0; index < dl.childNodes.length; index += 1) {
      const child = dl.childNodes[index];
      if (getTextContent(child).toLowerCase().includes("attributes")) {
        const dd = dl.childNodes[index + 1];
        for (const attrNameNode of findByClasses(dd, "attr-name")) {
          const attrName = getTextContent(attrNameNode).slice(1, -1);
          // skip events
          if (attrName.startsWith("on") || attrName === "style") {
            continue;
          }
          validHtmlAttributes.add(attrName);
          attributes.add(attrName);
        }
      }
    }
    attributesByTag[tag] = Array.from(attributes)
      .sort()
      .map((name) => {
        let options = attributeOptions.get(name);
        if (name === "externalResourcesRequired") {
          options = ["true", "false"];
        }
        if (name === "accumulate") {
          options = ["none", "sum"];
        }
        if (name === "additive") {
          options = ["replace", "sum"];
        }
        if (name === "preserveAlpha") {
          options = ["true", "false"];
        }
        if (options) {
          return { name, description: "", type: "select", options };
        }
        return { name, description: "", type: "string" };
      });
  }
}

// sort tags and attributes
const tags = Object.keys(attributesByTag).sort();
const attributesByHash = new Map<string, Attribute>();
const reusableAttributesByHash = new Map<string, Attribute>();
for (const tag of tags) {
  const attributes = attributesByTag[tag];
  delete attributesByTag[tag];
  attributes.sort((left, right) => left.name.localeCompare(right.name));
  if (attributes.length > 0) {
    for (const attribute of attributes) {
      const attributeHash = hash(JSON.stringify(attribute));
      if (attributesByHash.has(attributeHash)) {
        reusableAttributesByHash.set(attributeHash, attribute);
      } else {
        attributesByHash.set(attributeHash, attribute);
      }
    }
    attributesByTag[tag] = attributes;
  }
}

let attributesContent = `type Attribute = {
  name: string,
  description: string,
  required?: boolean,
  type: 'string' | 'boolean' | 'number' | 'select' | 'url',
  options?: string[]
}

`;

const attributeVariableByHash = new Map<string, string>();
for (const [key, attribute] of reusableAttributesByHash) {
  const normalizedName = attribute.name
    .replaceAll("-", "_")
    .replaceAll(":", "_");
  const variableName = `attribute_${normalizedName}_${key}`;
  attributeVariableByHash.set(key, variableName);
  attributesContent += `const ${variableName}: Attribute = ${JSON.stringify(attribute, null, 2)};\n\n`;
}

const serializableAttributesByTag: Record<
  string,
  Array<string | Attribute>
> = {};
for (const tag of tags) {
  const attributes = attributesByTag[tag];
  serializableAttributesByTag[tag] = attributes.map((attribute) => {
    const key = hash(JSON.stringify(attribute));
    const variableName = attributeVariableByHash.get(key);
    if (variableName) {
      return variableName;
    }
    return attribute;
  });
}

attributesContent += `
export const attributesByTag: Record<string, undefined | Attribute[]> = ${JSON.stringify(serializableAttributesByTag, null, 2)};
`;
for (const variableName of attributeVariableByHash.values()) {
  attributesContent = attributesContent.replaceAll(
    `"${variableName}"`,
    variableName
  );
}

await mkdir("./src/__generated__", { recursive: true });
await writeFile("./src/__generated__/attributes.ts", attributesContent);

// generate jsx for testing react types

const instances: Instances = new Map();
const props: Props = new Map();

let id = 0;
const getId = () => {
  id += 1;
  return id.toString();
};

const body: Instance = {
  type: "instance",
  id: getId(),
  component: elementComponent,
  tag: "body",
  children: [],
};
instances.set(body.id, body);

for (const entry of Object.entries(attributesByTag)) {
  let [tag] = entry;
  const [_tag, attributes] = entry;
  if (tag === "*") {
    tag = "div";
  }
  const instance: Instance = {
    type: "instance",
    id: getId(),
    component: elementComponent,
    tag,
    children: [],
  };
  body.children.push({ type: "id", value: instance.id });
  instances.set(instance.id, instance);
  for (const { name, type, options } of attributes) {
    const id = getId();
    const instanceId = instance.id;
    if (type === "string" || type === "url") {
      const prop: Prop = { id, instanceId, type: "string", name, value: "" };
      props.set(prop.id, prop);
      continue;
    }
    if (type === "boolean") {
      const prop: Prop = { id, instanceId, type, name, value: true };
      props.set(prop.id, prop);
      continue;
    }
    if (type === "select") {
      const prop: Prop = {
        id,
        instanceId,
        type: "string",
        name,
        value: options?.[0] ?? "",
      };
      props.set(prop.id, prop);
      continue;
    }
    if (type === "number") {
      const prop: Prop = {
        id,
        instanceId,
        type: "number",
        name,
        value: 0,
      };
      props.set(prop.id, prop);
      continue;
    }
    (type) satisfies never;
    throw Error(`Unknown attribute ${name} with type ${type}`);
  }
}

await mkdir("./src/__generated__", { recursive: true });
await writeFile(
  "./src/__generated__/attributes-jsx-test.tsx",
  generateWebstudioComponent({
    name: "Page",
    scope: createScope(),
    metas: new Map(Object.entries(coreMetas)),
    instances,
    props,
    dataSources: new Map(),
    rootInstanceId: body.id,
    classesMap: new Map(),
    parameters: [],
  }) + "export { Page }"
);

// react does not have this one
possibleStandardNames["dirname"] = "dirName";
const standardAttributesToReactProps: Record<string, string> = {};
const reactPropsToStandardAttributes: Record<string, string> = {};
for (const [htmlAttribute, reactProperty] of Object.entries(
  possibleStandardNames
)) {
  if (
    validHtmlAttributes.has(htmlAttribute) &&
    htmlAttribute !== reactProperty
  ) {
    standardAttributesToReactProps[htmlAttribute] = reactProperty;
    reactPropsToStandardAttributes[reactProperty] = htmlAttribute;
  }
}

let standardAttributesContent = "";
standardAttributesContent += `export const standardAttributesToReactProps: Record<string, string> = ${JSON.stringify(standardAttributesToReactProps, null, 2)};\n\n`;
standardAttributesContent += `export const reactPropsToStandardAttributes: Record<string, string> = ${JSON.stringify(reactPropsToStandardAttributes, null, 2)};\n`;

await mkdir("../react-sdk/src/__generated__", { recursive: true });
await writeFile(
  "../react-sdk/src/__generated__/standard-attributes.ts",
  standardAttributesContent
);
