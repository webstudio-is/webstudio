/* eslint-disable no-console, func-style */
import * as fs from "node:fs";
import * as path from "node:path";
import type { CreateChatCompletionResponse } from "openai";
import { fetch } from "undici";
import { keywordValues } from "../src/__generated__/keyword-values";

/**
 * Using ChatGPT, this scripts generates descriptions for CSS properties and declarations (property-value).
 * It uses `keywordValues` to get a list of all the properties and values.
 *
 * The result is a TS module located at ./src/__generated__/property-value-descriptions.ts which exports:
 * - properties
 * - declarations
 *
 * By default it generates descriptions only for new properties/values, however you can use the --force flag to regenerate everything.
 *
 * The script needs two env variables:
 * - process.env.OPENAI_KEY - Your OpenAI API key https://platform.openai.com/account/api-keys
 * - process.env.OPENAI_ORG - Your OpenAI Org ID https://platform.openai.com/account/org-settings
 */

const args = process.argv.slice(2);
let forceRegenerate = false;
if (args.includes("--force")) {
  forceRegenerate = true;
  args.splice(args.indexOf("--force"), 1);
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
  if (propertiesDescriptions === undefined) {
    propertiesDescriptions = {};
  }
  if (!declarationsDescriptions) {
    declarationsDescriptions = {};
  }
} catch (error) {}

const batchSize = 16;

/**
 * Properties descriptions
 */
const newPropertiesNames = Object.keys(keywordValues)
  // Slice to generate only X - useful for testing.
  // .slice(0, 1)
  .filter(
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
Please generate a good, newbie friendly and self-explanatory description (max 140 characters) for all the CSS properties in the following list:

\`\`\`
${properties.map((name) => `- ${name}`).join("\n")}
\`\`\`

Respond with a matching bulleted list of the same length which contains all the descriptions as Markdown code block.

Important:

- The response list should include a description for every property in the list above.
- The descriptions should be beginner friendly and understandable by someone who doesn't know CSS.
- Don't add any other explanation.
- Don't repeat the property names in the descriptions.

Example properties list (input):

\`\`\`
- background-color
- flex-direction
\`\`\`

Example response:

\`\`\`markdown
- Sets the background color
- Sets the flex container main axis direction
\`\`\`
`);

  if (Array.isArray(result)) {
    // Retry
    if (result[0] === 429) {
      console.log(`❌  Error: 429 ${result[1]}. Retrying...`);
      continue;
    }

    throw new Error(`❌ Error: ${result[0]} ${result[1]}`);
  }

  const descriptions = grabDescriptions(result);

  if (properties.length !== descriptions.length) {
    console.log(
      "❌ Error: the number of generated descriptions does not match the amount of inputs. Retrying..."
    );

    console.log({ input: properties.join("\n"), output: result });
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
const propertyColors: Record<string, string[]> = {};

Object.entries(keywordValues)
  // Slice to generate only X - useful for testing.
  // .slice(0, 10)
  .forEach(([keyword, values]) => {
    return values.forEach((value, index) => {
      const descriptionKey = `${keyword}:${value}`;
      if (
        !forceRegenerate &&
        typeof declarationsDescriptions[descriptionKey] === "string"
      ) {
        return;
      }

      const property = toKebabCase(keyword);

      // We are currently skipping generation for color-related properies. Uncomment the code below to enable colors generation.
      // Also add the following line to the GPT prompt:
      // "When you encounter a declaration where the value is \`{color}\` make the description generic: this is a template that I will later use for all my colors."
      //
      // const nonColorValues = [
      //   "auto",
      //   "initial",
      //   "inherit",
      //   "unset",
      //   "currentColor",
      //   "transparent",
      //   "none"
      // ];
      if (
        keyword.toLowerCase().includes("color")
        // && !nonColorValues.includes(value)
      ) {
        return;
        /*
          When it comes to generating descriptions for declarations whose value is a color eg. `background-color: orange`
          we generate a description for a generic `property: {color_value}` declaration (e.g. `background-color: {color}`)
          and GPT will generate a description template with a placeholder `{color_value}`.
          The script repeats the template for every color value, replacing `{color_value}`.
          This is to avoid generating a ton of similar description and wasting GPT tokens.
         */
        // descriptionKey = `${keyword}:{color}`;
        // if (!propertyColors[descriptionKey]) {
        //   propertyColors[descriptionKey] = [];
        // }
        // propertyColors[descriptionKey].push(value);
        // newDeclarationsDescriptions[descriptionKey] = `${property}: {color}`;
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
Please generate a good, newbie friendly and self-explanatory description (max 140 characters) for all the CSS declarations in the following list:

\`\`\`
${list.join("\n")}
\`\`\`

Respond with a matching bulleted list of the same length which contains all the descriptions as Markdown code block.

Important:

- The response should include a description for every declaration above.
- The descriptions should be beginner friendly and understandable by someone who doesn't know CSS.
- Don't add any other explanation.
- Don't include the declarations (input) in the descriptions (output).

Example declarations list (input):

\`\`\`
- align-items: center
- flex-direction: row
\`\`\`

Example response:

\`\`\`markdown
- Sets the alignment of flex items to the center of the container
- Sets the flex container main axis direction to row
\`\`\`
`);

  if (Array.isArray(result)) {
    // Retry
    if (result[0] === 429) {
      console.log(`❌  Error: 429 ${result[1]}. Retrying...`);
      continue;
    }

    throw new Error(`❌ Error: ${result[0]} ${result[1]}`);
  }

  const descriptions = grabDescriptions(result);

  if (list.length !== descriptions.length) {
    console.log(
      "❌ Error: the number of generated descriptions does not match the amount of inputs. Retrying..."
    );

    console.log({ input: list.join("\n"), output: result });
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
      temperature: 0.5,
    }),
  });

  if (response.ok === false) {
    return [response.status, response.statusText];
  }

  const completion = (await response.json()) as CreateChatCompletionResponse;

  const content = completion.choices[0].message?.content.trim() || "";

  if (content === "") {
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
