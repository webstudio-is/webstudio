import type { ActionArgs } from "@remix-run/node";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { fromMarkdown as parseMarkdown } from "mdast-util-from-markdown";
import type { ChatCompletionRequestMessage } from "openai";
import { Configuration, OpenAIApi } from "openai";
import { visit } from "unist-util-visit";
import { z } from "zod";
import { zfd } from "zod-form-data";
import env from "~/env/env.server";

const schema = zfd.formData({
  prompt: zfd.text(z.string().max(140)),
});

type OpenAIConfig = {
  apiKey: string;
  organization: string;
  model: "gpt-3.5-turbo";
  maxTokens: number;
};

export const action = async ({ request }: ActionArgs) => {
  if (!isFeatureEnabled("ai")) {
    return { errors: ["Feature not available"] };
  }

  try {
    const { prompt: userPrompt } = schema.parse(await request.formData());

    if (!env.OPENAI_KEY) {
      throw new Error("OpenAI API missing");
    }

    if (!env.OPENAI_ORG) {
      throw new Error("OpenAI org missing");
    }

    const result = await generate({
      userPrompt,
      config: {
        apiKey: env.OPENAI_KEY,
        organization: env.OPENAI_ORG,
        model: "gpt-3.5-turbo",
        maxTokens: 1000,
      },
    });

    return result;
  } catch (error) {
    return { errors: error.message };
  }

  return { errors: "Unexpected error" };
};

export const generate = async function generate({
  userPrompt,
  config,
}: {
  userPrompt: string;
  config: OpenAIConfig;
}) {
  const { apiKey, organization, model, maxTokens }: OpenAIConfig = config;
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("OpenAI API missing");
  }

  if (typeof organization !== "string" || !organization.startsWith("org-")) {
    throw new Error("OpenAI org missing or invalid");
  }

  const configuration = new Configuration({
    apiKey,
    organization,
  });
  const openai = new OpenAIApi(configuration);

  let results;
  try {
    const chain = getChainForPrompt({
      prompt: userPrompt,
      steps,
      complete: (messages) =>
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
            "OpenAI-Organization": organization,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0,
            max_tokens: maxTokens,
          }),
        }).then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error(`${response.status}: ${response.statusText}`);
        }),
      // openai.createChatCompletion({
      //   model,
      //   messages,
      //   max_tokens: maxTokens,
      //   temperature: 0,
      // }),
    });
    results = await chain();
    console.log({ results });
    return Object.assign(results.map(getJSONCodeBlock));
  } catch (error) {
    const errorMessage = `Something went wrong. ${
      process.env.NODE_ENV === "production"
        ? ""
        : `${error.message}\n\n\n${results}`
    }`;
    if (process.env.NODE_ENV !== "production") {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
  }
};

const getJSONCodeBlock = (text: string) => {
  const errorMsg = ["Parsing failed"];

  try {
    return JSON.parse(text.trim());
  } catch (error) {}

  try {
    const tree = parseMarkdown(text);
    const codeBlocks: string[] = [];

    visit(tree, "code", (node) => {
      if (node.lang === "json") {
        codeBlocks.push(node.value.trim());
      }
    });

    if (codeBlocks.length > 0) {
      return JSON.parse(codeBlocks[0]);
    } else {
      errorMsg.push("No code blocks found");
    }
  } catch (error) {}

  if (process.env.NODE_ENV !== "production") {
    errorMsg.push(text);
  }

  throw new Error(errorMsg.join("\n\n"));
};

const getChainForPrompt = function getChainForPrompt({
  prompt,
  steps,
  complete,
}: {
  prompt: string;
  steps: string[];
  complete: (
    messages: ChatCompletionRequestMessage[]
  ) => ReturnType<OpenAIApi["createChatCompletion"]>;
}) {
  return async function chain() {
    const responses: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      const completionRequestMessages = [
        {
          role: "user",
          content: steps[i].replace(/<!--prompt-content-->/, prompt).trim(),
        } as ChatCompletionRequestMessage,
      ];

      if (i > 0) {
        completionRequestMessages.unshift({
          role: "assistant",
          content: responses[i - 1],
        });
      }

      const completion = await complete(completionRequestMessages);

      responses[i] = completion.data.choices[0].message?.content || "";
    }

    return responses;
  };
};

const steps = [
  `
You are WebstudioGPT a no-code tool for designers that generates a clean UI markup as single JSON code block.

Rules:

- Don't use any dependency or external library.
- \`instances\` are a shallow representation of the UI element components.
- Don't nest instances.
- Children components are at the same level of the parent element which references them by type \`id\` (instanceId).
- Instance \`id\` has the following format: \`instance-{ComponentName}-{number}\`.
- Any of your answers can be parsed as JSON, therefore you will exclusively generate a single code block with valid JSON.
- Do not generate nor include any explanation.

The only available components (instances) are the following:

- Box: a container element
- Heading: typography element used for headings and titles
- Input: an input field component
- TextArea: a multi line input field component
- Button: a button component

Use only the components are semantically correct to fulfill the following request:

<!--prompt-content-->

The produced JSON code block strictly follows the TypeScript definitions (spec) below:

\`\`\`typescript
type InstanceId = string;

type Instance = {
  type: "instance";
  id: InstanceId;
  component: string;
  label?: string | undefined;
  children: (
    | {
        type: "id";
        value: InstanceId;
      }
    | {
        type: "text";
        value: string;
      }
  )[];
};
\`\`\`

Below is an example of **invalid** JSON because children cannot be of type "instance":

\`\`\`json
{
  "instances": [
    {
      "type": "instance",
      "id": "id-Box-2",
      "component": "Box",
      "label": "main content",
      "children": [
        {
          "type": "instance",
          "id": "id-Heading-2",
          "component": "Heading",
          "label": "Main Content Heading",
          "children": [
            {
              "type": "text",
              "value": "Main Content"
            }
          ]
        }
      ]
    }
  ]
}
\`\`\``,
  `Can you add styles to this JSON?

- Use the JSON instances from your previous response.
- You generate JSON styles that are linked to instances by instance id.
- StyleDecl properties are camel case eg. \`backgroundColor\`.
- StyleSourceId \`id\` has the following format: \`styleSourceId-{number}\`.
- BreakpointId \`id\` has the following format: \`breakpointId-{number}\`.
- Any of your answers can be parsed as JSON, therefore you will exclusively generate a code block with valid JSON.
- Do not generate nor include any explanation.

<!--prompt-content-->

Use the following type definitions to generate the styles JSON:

\`\`\`typescript
type StyleSourceId = string;

type StyleSourceSelection = {
  instanceId: InstanceId;
  values: StyleSourceId[];
};

type StyleSource =
  | {
      type: "token";
      id: StyleSourceId;
      name: string;
    }
  | {
      type: "local";
      id: StyleSourceId;
    };

type StyleDecl = {
  styleSourceId: StyleSourceId;
  breakpointId: BreakpointId;
  state?: string | undefined;
  property: string;
  value:
    | {
        type: "keyword";
        value: string;
      }
    | {
        type: "fontFamily";
        value: string[];
      }
    | {
        type: "rgb";
        r: number;
        g: number;
        b: number;
        alpha: number;
      }
    | {
        type: "invalid";
        value: string;
      }
    | {
        type: "unset";
        value: "";
      }
    | Units;
};

type Units = {
  type: "unit";
  unit:
    | (
        | "%"
        | "deg"
        | "grad"
        | "rad"
        | "turn"
        | "db"
        | "fr"
        | "hz"
        | "khz"
        | "cm"
        | "mm"
        | "q"
        | "in"
        | "pt"
        | "pc"
        | "px"
        | "em"
        | "rem"
        | "ex"
        | "rex"
        | "cap"
        | "rcap"
        | "ch"
        | "rch"
        | "ic"
        | "ric"
        | "lh"
        | "rlh"
        | "vw"
        | "svw"
        | "lvw"
        | "dvw"
        | "vh"
        | "svh"
        | "lvh"
        | "dvh"
        | "vi"
        | "svi"
        | "lvi"
        | "dvi"
        | "vb"
        | "svb"
        | "lvb"
        | "dvb"
        | "vmin"
        | "svmin"
        | "lvmin"
        | "dvmin"
        | "vmax"
        | "svmax"
        | "lvmax"
        | "dvmax"
        | "cqw"
        | "cqh"
        | "cqi"typography
        | "cqb"
        | "cqmin"
        | "cqmax"
        | "dpi"
        | "dpcm"
        | "dppx"
        | "x"
        | "st"
        | "s"
        | "ms"
      )
    | "number";
  value: number;
};
\`\`\`
`,
];
