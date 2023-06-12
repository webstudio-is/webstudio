/* eslint-disable no-console, func-style */
import fetch from "isomorphic-fetch";
import * as fs from "node:fs";
import * as path from "node:path";
import { keywordValues } from "../src/__generated__/keyword-values";

/**
 * Using ChatGPT, this scripts generates descriptions for CSS properties and declarations (property-value).
 * It uses `keywordValues` to get a list of all the properties and values.
 *
 * The result is a TS module located at ./src/__generated__/property-value-descriptions.ts which exports:
 * - properties
 * - declarations
 *
 * By default it generates descriptions only for new properties/values, however you can use the --forceRegenerate flag to regenerate everything.
 *
 * When it comes to generating descriptions for declarations whose value is a color eg. `background-color: orange`
 * we generate a description for a generic `property: {color}` declaration (e.g. `background-color: {color}`)
 * and GPT will generate a description template with a placeholder `{color}`.
 * The script repeats the template for every color value, replacing `{color}`.
 * This is to avoid generating a ton of similar description and wasting GPT tokens.
 *
 * The script needs two env variables:
 * - process.env.OPENAI_KEY - Your OpenAI API key https://platform.openai.com/account/api-keys
 * - process.env.OPENAI_ORG - Your OpenAI Org ID https://platform.openai.com/account/org-settings
 */

const args = process.argv.slice(2);
let forceRegenerate = false;
if (args.includes("--forceRegenerate")) {
  forceRegenerate = true;
  args.splice(args.indexOf("--forceRegenerate"), 1);
}

const fileName = "property-value-descriptions.ts";
const targetPath = path.join(process.cwd(), "src", "__generated__");

let propertiesDescriptions: Record<string, string> = {};
let declarationsDescriptions: Record<string, string> = {};

try {
  ({
    properties: propertiesDescriptions,
    declarations: declarationsDescriptions,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Fix this else it'll complain that we cannot use top-level await.
  } = await import(path.join(targetPath, fileName)));
  if (!propertiesDescriptions) {
    propertiesDescriptions = {};
  }
  if (!declarationsDescriptions) {
    declarationsDescriptions = {};
  }
} catch (error) {
  console.log(error);
}

const batchSize = 20;

/**
 * Properties descriptions
 */
const newPropertiesNames = Object.keys(keywordValues).filter(
  (property) =>
    forceRegenerate || typeof propertiesDescriptions[property] !== "string"
);

for (let i = 0; i < newPropertiesNames.length; ) {
  const properties = newPropertiesNames.slice(i, i + batchSize);

  console.log(
    `[${Math.floor(i / batchSize) + 1}/${Math.ceil(
      newPropertiesNames.length / batchSize
    )}] Generating properties descriptions.`
  );

  if (properties.length === 0) {
    i += batchSize;
    continue;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Fix this else it'll complain that we cannot use top-level await.
  const result = await generate(`
Please generate a short description (max 140 characters) for **every** CSS property in the following list:

${properties.map((name) => `- ${name}`).join("\n")}

Respond with a matching bulleted list which contains only the description as Markdown code block, omitting the original property and any other explanation.

Example output:

\`\`\`markdown
- Sets the background color
- Sets the flex container main axis direction
\`\`\`
`);

  if (Array.isArray(result)) {
    // Retry
    if (result[0] === 429) {
      console.log("❌  Error: 429. Retrying...");
      continue;
    }

    throw new Error(`❌ Error: ${result[0]} ${result[1]}`);
  }

  const descriptions = grabDescriptions(result);

  if (properties.length !== descriptions.length) {
    console.log(
      "❌ Error: the number of generated descriptions does not match the amount of inputs. Retrying..."
    );

    console.log({ properties, result });
    continue;
  }

  properties.forEach((name, index) => {
    propertiesDescriptions[name] = descriptions[index];
  });

  writeFile({
    properties: propertiesDescriptions,
    declarations: declarationsDescriptions,
  });

  i += batchSize;
}
console.log("\n✅ Properties description generated!\n");

/**
 * Declarations descriptions
 */
const newDeclarationsDescriptions: Record<string, string> = {};
const nonColorValues = [
  "auto",
  "initial",
  "inherit",
  "unset",
  "currentColor",
  "transparent",
];
const propertyColors: Record<string, string[]> = {};

Object.entries(keywordValues).forEach(([keyword, values]) => {
  return values.forEach((value, index) => {
    let descriptionKey = `${keyword}:${value}`;
    if (
      !forceRegenerate &&
      typeof declarationsDescriptions[descriptionKey] === "string"
    ) {
      return;
    }

    const property = toKebabCase(keyword);

    if (
      keyword.toLowerCase().includes("color") &&
      !nonColorValues.includes(value)
    ) {
      // 1. In order to avoid generating descriptions for all the standard colors eg. `background-color: orange;`
      // we generate a description for a generic `property: {color}` declaration and use that as a template for all the possible colors.
      descriptionKey = `${keyword}:{color}`;
      if (!propertyColors[descriptionKey]) {
        propertyColors[descriptionKey] = [];
      }
      propertyColors[descriptionKey].push(value);
      newDeclarationsDescriptions[descriptionKey] = `${property}: {color}`;
    } else {
      newDeclarationsDescriptions[descriptionKey] = `${property}: ${value}`;
    }
  });
});

const newDescriptionsEntries = Object.entries(newDeclarationsDescriptions);

for (let i = 0; i < newDescriptionsEntries.length; ) {
  const batch = newDescriptionsEntries.slice(i, i + batchSize);

  const list = batch.map(([descriptionKey, declaration]) => `- ${declaration}`);

  console.log(
    `[${Math.floor(i / batchSize) + 1}/${Math.ceil(
      newDescriptionsEntries.length / batchSize
    )}] Generating declarations descriptions.`
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Fix this else it'll complain that we cannot use top-level await.
  const result = await generate(`
Please generate a short description (max 140 characters) for **every** CSS declaration in the following list:

${list.join("\n")}

Respond with a matching bulleted list which contains only the description as Markdown code block, omitting the original declaration and any other explanation.

When you encounter a declaration where the value is \`{color}\` make the description generic: this is a template that I will later use for all my colors.

For example:

\`\`\`markdown
- Sets the background color to {color}
- Sets the flex container main axis direction to row
\`\`\`
`);

  if (Array.isArray(result)) {
    // Retry
    if (result[0] === 429) {
      console.log("❌  Error: 429. Retrying...");
      continue;
    }

    throw new Error(`❌ Error: ${result[0]} ${result[1]}`);
  }

  const descriptions = grabDescriptions(result);

  if (list.length !== descriptions.length) {
    console.log(
      "❌ Error: the number of generated descriptions does not match the amount of inputs. Retrying..."
    );

    console.log({ list, result });
    continue;
  }

  batch.forEach((value, index) => {
    const [descriptionKey] = value;
    const description = descriptions[index];
    if (descriptionKey.endsWith(":{color}")) {
      const colors = propertyColors[descriptionKey];
      if (colors) {
        colors.forEach((color) => {
          declarationsDescriptions[descriptionKey.replace("{color}", color)] =
            description.replace("{color}", color);
        });
      } else {
        console.log(
          `❌ Error: Expanding the colors for ${descriptionKey} failed because we couldn't find it in propertyColors. Skipping...`
        );
      }
    } else {
      declarationsDescriptions[descriptionKey] = description;
    }
  });

  writeFile({
    properties: propertiesDescriptions,
    declarations: declarationsDescriptions,
  });

  i += batchSize;
}

console.log("\n✅ Declarations description generated!\n");
console.log("✨ Done.");

function writeFile(descriptions: Record<string, any>) {
  const autogeneratedHint = "// This file was auto-generated\n";

  const content =
    autogeneratedHint +
    Object.entries(descriptions)
      .map(
        ([binding, value]) =>
          `export const ${binding} = ` +
          JSON.stringify(value, null, 2) +
          " as const;"
      )
      .join("\n\n");

  fs.writeFileSync(path.join(targetPath, fileName), content, "utf-8");
}

async function generate(message: string): Promise<string | [number, string]> {
  if (!process.env.OPENAI_KEY) {
    throw new Error("Missing OpenAI key (process.env.OPENAI_KEY)");
  }

  if (
    typeof process.env.OPENAI_ORG !== "string" ||
    !process.env.OPENAI_ORG.startsWith("org-")
  ) {
    throw new Error(
      "Missing OpenAI org (process.env.OPENAI_ORG) or invalid org"
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      "OpenAI-Organization": process.env.OPENAI_ORG,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    return [response.status, response.statusText];
  }

  const completion = await response.json();

  const content = completion.choices[0].message?.content.trim() || "";

  if (!content) {
    return [404, "No response"];
  }

  return content;
}

function grabDescriptions(message: string) {
  const descriptions: string[] = [];
  message.split("\n").forEach((line) => {
    if (line.startsWith("-")) {
      descriptions.push(line.replace(/^-\s*/, ""));
    }
  });
  return descriptions;
}

function toKebabCase(keyword: string) {
  const label = keyword
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();

  return label;
}
