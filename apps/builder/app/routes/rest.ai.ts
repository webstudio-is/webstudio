import type { ActionArgs } from "@remix-run/node";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { fromMarkdown as parseMarkdown } from "mdast-util-from-markdown";
import type {
  ChatCompletionRequestMessage,
  CreateChatCompletionResponse,
} from "openai";
import { Configuration, OpenAIApi } from "openai";
import { visit } from "unist-util-visit";
import { z } from "zod";
import { zfd } from "zod-form-data";
import env from "~/env/env.server";

const StepSchema = z.enum(["instances", "styles"]);
type Step = z.infer<typeof StepSchema>;

type Steps = [Step, string][];
type Messages = (ChatCompletionRequestMessage[] | null)[];

const schema = zfd.formData({
  prompt: zfd.text(z.string().max(140)),
  steps: zfd.repeatableOfType(zfd.text(StepSchema)),
  messages: zfd.repeatableOfType(zfd.text().optional()),
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

  // @todo add session checks and rate limiting

  try {
    const formData = schema.parse(await request.formData());
    const userPrompt = formData.prompt;
    const steps: Steps = formData.steps.map((step) => [step, templates[step]]);
    const messages: Messages = steps.map((_, index) => {
      const m = formData.messages[index];
      return typeof m === "string" ? JSON.parse(m) : null;
    });

    if (!env.OPENAI_KEY) {
      throw new Error("OpenAI API missing");
    }

    if (!env.OPENAI_ORG) {
      throw new Error("OpenAI org missing");
    }

    const result = await generate({
      userPrompt,
      steps,
      messages,
      config: {
        apiKey: env.OPENAI_KEY,
        organization: env.OPENAI_ORG,
        model: "gpt-3.5-turbo",
        maxTokens: 2000,
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
  steps,
  messages,
  config,
}: {
  userPrompt: string;
  steps: Steps;
  messages: Messages;
  config: OpenAIConfig;
}) {
  const { apiKey, organization, model, maxTokens }: OpenAIConfig = config;
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("OpenAI API missing");
  }

  if (typeof organization !== "string" || !organization.startsWith("org-")) {
    throw new Error("OpenAI org missing or invalid");
  }

  try {
    const chain = getChainForPrompt({
      prompt: userPrompt,
      steps,
      messages,
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
    });

    const responses = await chain();
    return responses
      .map(([step, response]) => [
        step,
        // @todo validate code block against step's schema.
        getJSONCodeBlock(response),
      ])
      .map(([step, response]) => [
        step,
        Array.isArray(response) ? response : [response],
      ]);
  } catch (error) {
    const errorMessage = `Something went wrong. ${
      process.env.NODE_ENV === "production" ? "" : `${error.message}`
    }`;
    if (process.env.NODE_ENV !== "production") {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
  }
};

const getChainForPrompt = function getChainForPrompt({
  prompt,
  steps,
  messages,
  complete,
}: {
  prompt: string;
  steps: Steps;
  messages: Messages;
  complete: (
    messages: ChatCompletionRequestMessage[]
  ) => Promise<CreateChatCompletionResponse>;
}) {
  return async function chain() {
    const responses: [Steps, string][] = [];

    for (let i = 0; i < steps.length; i++) {
      const [step, template] = steps[i];

      const completionRequestMessages = [
        {
          role: "user",
          content: template.replace(/<!--prompt-content-->/, prompt).trim(),
        } as ChatCompletionRequestMessage,
      ];

      const messagesForStep = messages[i];
      if (messagesForStep !== null) {
        completionRequestMessages.unshift(...messagesForStep);
      } else if (i > 0 && responses[i - 1]) {
        completionRequestMessages.unshift({
          role: "assistant",
          content: responses[i - 1][1],
        });
      }

      const completion = await complete(completionRequestMessages);
      responses[i] = [step, completion.choices[0].message?.content || ""];
    }

    return responses;
  };
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
      if (!node.lang || node.lang === "json") {
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

const templates = {
  instances: `
You are WebstudioGPT a no-code tool for designers that generates a clean UI markup as single JSON code block.

Rules:

- Don't use any dependency or external library.
- Any of your answers can be parsed as JSON, therefore you will exclusively generate a single code block with valid JSON.
- Do not generate nor include any explanation.

The only available components (instances) are the following:

- Box: a container element
- Heading: typography element used for headings and titles
- Input: an input field component
- TextArea: a multi line input field component
- Button: a button component

Use only the components that you need to represent the following request:

<!--prompt-content-->

The produced JSON code block strictly follows the TypeScript definitions (spec) below:

\`\`\`typescript
type EmbedTemplateText = {
  type: "text";
  value: string;
};

type EmbedTemplateInstance = {
  type: "instance";
  component: string;
  children: Array<EmbedTemplateInstance | EmbedTemplateText>;
};
\`\`\`

Below is an example of **invalid** JSON because children cannot be of type "instance":

\`\`\`json
{
  "instances": [
    { type: "text", value: "hello" },
    {
      type: "instance",
      component: "Box",
      children: [
        { type: "instance", component: "Box", children: [] },
        { type: "text", value: "world" },
      ],
    },
  ]
}
\`\`\``,
  styles: `The JSON above describes <!--prompt-content-->.

Can you generate styles to it following the spec below?

- Use the JSON instances from your previous response.
- You generate styles as JSON that are linked to instances by instance id.
- StyleDecl properties are camel case eg. \`backgroundColor\`.
- Every StyleDecl must have a non-empty value.
- StyleSourceId \`id\` has the following format: \`styleSourceId-{number}\`.
- BreakpointId \`id\` has the following format: \`breakpointId-{number}\`.
- Any of your answers can be parsed as JSON, therefore you will exclusively generate a code block with valid JSON.
- Do not generate nor include any explanation.

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
};
