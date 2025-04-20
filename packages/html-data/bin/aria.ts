import { aria } from "aria-query";
import {
  findTags,
  getAttr,
  getTextContent,
  loadPage,
  parseHtml,
} from "./crawler";
import { mkdir, writeFile } from "node:fs/promises";
import {
  createScope,
  elementComponent,
  Prop,
  type Instance,
  type Instances,
  type Props,
} from "@webstudio-is/sdk";
import { generateWebstudioComponent } from "@webstudio-is/react-sdk";

type Attribute = {
  name: string;
  description: string;
  type: "string" | "boolean" | "number" | "select";
  options?: string[];
};

const html = await loadPage("aria1.3", "https://www.w3.org/TR/wai-aria-1.3");
const document = parseHtml(html);
const list = findTags(document, "dl").find(
  (table) => getAttr(table, "id")?.value === "index_state_prop"
);
const terms = findTags(list, "dt");
const details = findTags(list, "dd");
const descriptions = new Map<string, string>();
for (let index = 0; index < terms.length; index += 1) {
  const term = getTextContent(terms[index]);
  const detail = getTextContent(details[index]);
  descriptions.set(term, detail);
}

const attributes: Attribute[] = [];
for (const [name, meta] of aria.entries()) {
  const attribute: Attribute = {
    name,
    description: descriptions.get(name) ?? "",
    type: "string",
  };
  if (meta.type === "string" || meta.type === "boolean") {
    attribute.type = meta.type;
  } else if (meta.type === "number" || meta.type === "integer") {
    attribute.type = "number";
  } else if (meta.type === "token" || meta.type === "tokenlist") {
    attribute.type = "select";
    attribute.options = meta.values?.map((item) => item.toString());
  } else if (meta.type === "tristate") {
    attribute.type = "select";
    attribute.options = ["false", "mixed", "true"];
  } else {
    meta.type satisfies "id" | "idlist" | "tristate";
  }
  attributes.push(attribute);
}

const ariaContent = `type Attribute = {
  name: string,
  description: string,
  type: 'string' | 'boolean' | 'number' | 'select',
  options?: string[]
}

export const ariaAttributes: Attribute[] = ${JSON.stringify(attributes, null, 2)};
`;
await mkdir("./src/__generated__", { recursive: true });
await writeFile("./src/__generated__/aria.ts", ariaContent);

// generate jsx for testing react types

const instances: Instances = new Map();
const props: Props = new Map();

let id = 0;
const getId = () => {
  id += 1;
  return id.toString();
};

const instance: Instance = {
  type: "instance",
  id: getId(),
  component: elementComponent,
  tag: "div",
  children: [],
};
instances.set(instance.id, instance);
for (const { name, type, options } of attributes) {
  const id = getId();
  const instanceId = instance.id;
  if (type === "string") {
    const prop: Prop = { id, instanceId, type, name, value: "" };
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
  throw Error(`Unknown attribute ${name} with type ${type}`);
}

await mkdir("./src/__generated__", { recursive: true });
await writeFile(
  "./src/__generated__/aria-jsx-test.tsx",
  generateWebstudioComponent({
    name: "Page",
    scope: createScope(),
    instances,
    props,
    dataSources: new Map(),
    rootInstanceId: instance.id,
    classesMap: new Map(),
    parameters: [],
    metas: new Map(),
  }) + "export { Page }"
);
