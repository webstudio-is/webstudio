import { mkdir, writeFile } from "node:fs/promises";
import {
  createScope,
  elementComponent,
  type Instance,
  type Instances,
  type Prop,
  type Props,
} from "@webstudio-is/sdk";
import { generateWebstudioComponent } from "@webstudio-is/react-sdk";
import {
  findTags,
  getAttr,
  getTextContent,
  loadHtmlIndices,
  parseHtml,
} from "./crawler";
import { possibleStandardNames } from "./possible-standard-names";

const validHtmlAttributes = new Set<string>();

type Attribute = {
  name: string;
  description: string;
  required?: boolean;
  type: "string" | "boolean" | "number" | "select" | "url";
  options?: string[];
};

const overrides: Record<
  string,
  false | Record<string, false | Partial<Attribute>>
> = {
  template: false,
  link: false,
  script: false,
  style: false,
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
  dialog: {
    closedby: false,
  },
  img: {
    ismap: false,
  },
  input: {
    alpha: false,
    colorspace: false,
    // react types have it only in textarea
    dirname: false,
    popovertarget: false,
    popovertargetaction: false,
  },
};

// Crawl WHATWG HTML.
const html = await loadHtmlIndices();
const document = parseHtml(html);
const table = findTags(document, "table").find(
  (table) => getAttr(table, "id")?.value === "attributes-1"
);
const [tbody] = findTags(table, "tbody");
const rows = findTags(tbody, "tr");

const attributesByTag: Record<string, Attribute[]> = {};

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
  if (value.includes("valid navigable target name or keyword")) {
    possibleOptions = ["_blank", "_self", "_parent", "_top"];
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
    const tagOverride = overrides[tag];
    if (tagOverride === false) {
      continue;
    }
    if (!attributesByTag[tag]) {
      attributesByTag[tag] = [];
    }
    const attributes = attributesByTag[tag];
    if (!attributes.some((item) => item.name === attribute)) {
      const override = tagOverride?.[attribute];
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

// sort tags and attributes
const tags = Object.keys(attributesByTag).sort();
for (const tag of tags) {
  const attributes = attributesByTag[tag];
  delete attributesByTag[tag];
  attributes.sort();
  if (attributes.length > 0) {
    attributesByTag[tag] = attributes;
  }
}

const attributesContent = `type Attribute = {
  name: string,
  description: string,
  required?: boolean,
  type: 'string' | 'boolean' | 'number' | 'select' | 'url',
  options?: string[]
}

export const attributesByTag: Record<string, undefined | Attribute[]> = ${JSON.stringify(attributesByTag, null, 2)};
`;

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
    instances,
    props,
    dataSources: new Map(),
    rootInstanceId: body.id,
    classesMap: new Map(),
    parameters: [],
    metas: new Map(),
    tagsOverrides: {},
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
