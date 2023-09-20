#!/usr/bin/env tsx

import { parseArgs } from "node:util";
import { argv, cwd } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import htmlTags from "html-tags";
import { htmlAttributes } from "./__generated__/html-attributes";
import type { Attribute } from "./types";
import type { PropMeta } from "@webstudio-is/sdk";
import { domAttributesToReact } from ".";

const { positionals, values } = parseArgs({
  args: argv.slice(2),
  allowPositionals: true,
  options: {
    convertName: {
      type: "string",
    },
  },
});

const allowedConvertName = ["react"];

if (
  values.convertName === undefined ||
  allowedConvertName.includes(values.convertName) === false
) {
  throw Error("Invalid or missing --convertName");
}

const [generatedPath] = positionals;

const toPropMeta = (attribute: Attribute): PropMeta => {
  const required = false;
  const { description } = attribute;
  if (attribute.type === "string") {
    return { type: "string", control: "text", required, description };
  }
  if (attribute.type === "number") {
    return { type: "number", control: "number", required, description };
  }
  if (attribute.type === "boolean") {
    return { type: "boolean", control: "boolean", required, description };
  }
  if (attribute.type === "enum") {
    return {
      type: "string",
      control: attribute.values.length <= 3 ? "radio" : "select",
      required,
      options: attribute.values,
      description,
    };
  }
  attribute satisfies never;
  throw Error("never happens");
};

const toPropsMeta = (attributes: Attribute[]) => {
  const propsMeta: Record<string, PropMeta> = {};
  for (const attribute of attributes) {
    let name = attribute.name;
    if (values.convertName === "react") {
      name =
        domAttributesToReact[name as keyof typeof domAttributesToReact] ?? name;
    }
    propsMeta[name] = toPropMeta(attribute);
  }
  return propsMeta;
};

const globalPropsMeta = toPropsMeta(htmlAttributes["*"]);
let content = `
import type { PropMeta } from '@webstudio-is/sdk'

const globals: Record<string, PropMeta> = ${JSON.stringify(globalPropsMeta)}

`;
for (const tag of htmlTags) {
  if (htmlAttributes[tag]) {
    const json = JSON.stringify(toPropsMeta(htmlAttributes[tag]));
    content += `export const ${tag} = {...globals,${json.slice(1)}\n\n`;
    continue;
  }
  if (tag === "var") {
    content += `const _${tag} = globals\n`;
    content += `export { _var as var }\n\n`;
    continue;
  }
  content += `export const ${tag} = globals\n\n`;
}

const path = join(cwd(), generatedPath);
await mkdir(dirname(path), { recursive: true });
await writeFile(path, content);
