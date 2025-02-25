/* eslint-disable func-style */
import * as fs from "node:fs";
import * as path from "node:path";
import warnOnce from "warn-once";
import pRetry from "p-retry";
import type { CreateChatCompletionResponse } from "openai";
import { keywordValues } from "../src/__generated__/keyword-values";
import { shorthandProperties } from "../src/__generated__/shorthand-properties";
import { customLonghandPropertyNames } from "../src/custom-data";

const propertiesPrompt = fs.readFileSync(
  path.join(process.cwd(), "bin", "prompts", "properties.prompt.md"),
  "utf-8"
);
const declarationsPrompt = fs.readFileSync(
  path.join(process.cwd(), "bin", "prompts", "declarations.prompt.md"),
  "utf-8"
);

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

let propertiesGenerated: Record<string, string> = {};
let propertiesOverrides: Record<string, string> = {};
let declarationsGenerated: Record<string, string> = {};
let declarationsOverrides: Record<string, string> = {};
let propertySyntaxesGenerated: Record<string, string> = {};

try {
  ({
    propertiesGenerated = {},
    propertiesOverrides = {},
    declarationsGenerated = {},
    declarationsOverrides = {},
    propertySyntaxesGenerated = {},
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Fix this else it'll complain that we cannot use top-level await.
  } = await import(path.join(targetPath, fileName)));
} catch (error) {
  //
}

const batchSize = 16;

/**
 * Properties descriptions
 */
const newPropertiesNames = [
  ...Object.keys(keywordValues),
  ...shorthandProperties,
]
  // Slice to generate only X - useful for testing.
  // .slice(0, 30)
  .filter(
    (property) =>
      forceRegenerate ||
      (typeof propertiesGenerated[property] !== "string" &&
        typeof propertiesOverrides[property] !== "string")
  );

const newPropertySyntaxes = customLonghandPropertyNames.filter(
  (property) =>
    forceRegenerate ||
    (typeof propertySyntaxesGenerated[property] !== "string" &&
      typeof propertySyntaxesGenerated[property] !== "string")
);

for (let index = 0; index < newPropertySyntaxes.length; ) {
  const syntaxes = newPropertySyntaxes.slice(index, index + batchSize);

  console.info(
    `[${Math.floor(index / batchSize) + 1}/${Math.ceil(
      newPropertySyntaxes.length / batchSize
    )}] Generating property syntax descriptions.`
  );

  if (syntaxes.length === 0) {
    index += batchSize;
    continue;
  }

  const prompt = propertiesPrompt.replace(
    "{properties}",
    syntaxes.map((name) => `- ${name}`).join("\n")
  );

  const result = await generateWithRetry(prompt);
  const descriptions = grabDescriptions(result);

  if (syntaxes.length !== descriptions.length) {
    console.info(
      "❌ Error: the number of generated descriptions does not match the amount of inputs. Retrying..."
    );

    console.info({ input: syntaxes.join("\n"), output: result });
    continue;
  }

  syntaxes.forEach((name, index) => {
    propertySyntaxesGenerated[name] = (descriptions[index] ?? "")
      .replace(new RegExp(`^\`?${name}\`?:`), "")
      .trim();
  });

  writeFile({
    propertiesGenerated,
    propertiesOverrides,
    propertySyntaxesGenerated,
    properties: `{ ...propertiesGenerated, ...propertiesOverrides }`,
    declarationsGenerated,
    declarationsOverrides,
    declarations: `{ ...declarationsGenerated, ...declarationsOverrides }`,
  });

  index += batchSize;
}
console.info("\n✅ Properties syntax description generated!\n");

for (let index = 0; index < newPropertiesNames.length; ) {
  const properties = newPropertiesNames.slice(index, index + batchSize);

  console.info(
    `[${Math.floor(index / batchSize) + 1}/${Math.ceil(
      newPropertiesNames.length / batchSize
    )}] Generating properties descriptions.`
  );

  if (properties.length === 0) {
    index += batchSize;
    continue;
  }

  const result = await generateWithRetry(
    propertiesPrompt.replace(
      "{properties}",
      properties.map((name) => `- ${name}`).join("\n")
    )
  );
  const descriptions = grabDescriptions(result);

  if (properties.length !== descriptions.length) {
    console.info(
      "❌ Error: the number of generated descriptions does not match the amount of inputs. Retrying..."
    );

    console.info({ input: properties.join("\n"), output: result });
    continue;
  }

  properties.forEach((name, index) => {
    propertiesGenerated[name] = (descriptions[index] ?? "")
      .replace(new RegExp(`^\`?${name}\`?:`), "")
      .trim();
  });

  writeFile({
    propertiesGenerated,
    propertiesOverrides,
    propertySyntaxesGenerated,
    properties: `{ ...propertiesGenerated, ...propertiesOverrides }`,
    declarationsGenerated,
    declarationsOverrides,
    declarations: `{ ...declarationsGenerated, ...declarationsOverrides }`,
  });

  index += batchSize;
}
console.info("\n✅ Properties description generated!\n");

/**
 * Declarations descriptions
 */
const newDeclarationsDescriptions: Record<string, string> = {};
const propertyColors: Record<string, string[]> = {};

Object.entries(keywordValues)
  // Slice to generate only X - useful for testing.
  // .slice(0, 10)
  .forEach(([keyword, values]) => {
    return values.forEach((value) => {
      const descriptionKey = `${keyword}:${value}`;
      if (
        !forceRegenerate &&
        (typeof declarationsGenerated[descriptionKey] === "string" ||
          typeof declarationsOverrides[descriptionKey] === "string")
      ) {
        return;
      }

      const property = toKebabCase(keyword);

      const excludedProperties = ["boxShadow"];
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
      if (excludedProperties.includes(keyword)) {
        return;
      } else if (
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

const newDeclarationsDescriptionsEntries = Object.entries(
  newDeclarationsDescriptions
);

for (let index = 0; index < newDeclarationsDescriptionsEntries.length; ) {
  const batch = newDeclarationsDescriptionsEntries.slice(
    index,
    index + batchSize
  );

  const list = batch.map(
    ([_descriptionKey, declaration]) => `- ${declaration}`
  );

  console.info(
    `[${Math.floor(index / batchSize) + 1}/${Math.ceil(
      newDeclarationsDescriptionsEntries.length / batchSize
    )}] Generating declarations descriptions.`
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Fix this else it'll complain that we cannot use top-level await.
  const result = await generateWithRetry(
    declarationsPrompt.replace("{declarations}", list.join("\n"))
  );
  const descriptions = grabDescriptions(result);

  if (list.length !== descriptions.length) {
    console.info(
      "❌ Error: the number of generated descriptions does not match the amount of inputs. Retrying..."
    );

    console.info({ input: list.join("\n"), output: result });
    continue;
  }

  batch.forEach((value, index) => {
    const [descriptionKey, decl] = value;
    const description = (descriptions[index] ?? "")
      .replace(new RegExp(`^\`${decl}\` -`), "")
      .trim();
    if (descriptionKey.endsWith(":{color}")) {
      const colors = propertyColors[descriptionKey];
      if (colors) {
        colors.forEach((color) => {
          declarationsGenerated[descriptionKey.replace("{color}", color)] =
            description.replace("{color}", color);
        });
      } else {
        console.info(
          `❌ Error: Expanding the colors for ${descriptionKey} failed because we couldn't find it in propertyColors. Skipping...`
        );
      }
    } else {
      declarationsGenerated[descriptionKey] = description;
    }
  });

  writeFile({
    propertiesGenerated,
    propertiesOverrides,
    propertySyntaxesGenerated,
    properties: `{ ...propertiesGenerated, ...propertiesOverrides }`,
    declarationsGenerated,
    declarationsOverrides,
    declarations: `{ ...declarationsGenerated, ...declarationsOverrides }`,
  });

  index += batchSize;
}

console.info("\n✅ Declarations description generated!\n");
console.info("✨ Done.");

function writeFile(descriptions: Record<string, unknown>) {
  const autogeneratedHint = "// This file was auto-generated\n";

  const content =
    autogeneratedHint +
    Object.entries(descriptions)
      .map(
        ([binding, value]) =>
          `export const ${binding} = ` +
          (typeof value === "string" ? value : JSON.stringify(value, null, 2)) +
          " as Record<string, string | undefined>;"
      )
      .join("\n\n");

  fs.writeFileSync(path.join(targetPath, fileName), content, "utf-8");
}

async function generateWithRetry(message: string): Promise<string> {
  return pRetry(
    async (attempt) => {
      const result = await generate(message);

      // Check if result is an array (error response)
      if (Array.isArray(result)) {
        if (result[0] === 429) {
          console.info(
            `❌ Error: 429 ${result[1]}. Retrying attempt ${attempt}...`
          );
          throw new Error("Rate limit exceeded"); // Retry on rate limit exceeded
        } else {
          throw new Error(`❌ Error: ${result[0]} ${result[1]}`); // Retry on other errors
        }
      }

      // If the result isn't a string, retry
      if (typeof result !== "string") {
        console.info(
          `❌ Error: Unexpected result type. Retrying attempt ${attempt}...`
        );
        throw new Error("Unexpected result type");
      }

      // Return the result if it's a valid string
      return result;
    },
    {
      retries: 5, // Number of retries
      factor: 2, // Exponential backoff factor
      minTimeout: 1000, // Minimum wait between retries (1 second)
      maxTimeout: 5000, // Maximum wait between retries (5 seconds)
    }
  );
}

async function generate(message: string): Promise<string | [number, string]> {
  const { OPENAI_ORG, OPENAI_KEY } = process.env;

  if (OPENAI_KEY === undefined) {
    throw new Error("Missing OpenAI key (process.env.OPENAI_KEY)");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${OPENAI_KEY}`,
  };

  if (OPENAI_ORG?.startsWith("org-")) {
    headers["OpenAI-Organization"] = OPENAI_ORG;
  } else {
    warnOnce(
      true,
      "Missing OpenAI org (process.env.OPENAI_ORG) or invalid org"
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
      temperature: 1,
    }),
  });

  if (response.ok === false) {
    return [response.status, response.statusText];
  }

  const completion = (await response.json()) as CreateChatCompletionResponse;

  const content = completion.choices[0]?.message?.content.trim() || "";

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
