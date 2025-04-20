import { aria } from "aria-query";
import {
  findTags,
  getAttr,
  getTextContent,
  loadPage,
  parseHtml,
} from "./crawler";
import { mkdir, writeFile } from "node:fs/promises";

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
