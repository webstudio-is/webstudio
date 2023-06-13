import type { ActionArgs } from "@remix-run/node";
import {
  createEditTweakChain,
  createGenerateInstancesChain,
  createGenerateStylesChain,
  createGptModel,
  type ChainContext,
  type GPTModelMessageFormat,
} from "@webstudio-is/ai";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { prisma } from "@webstudio-is/prisma-client";
import {
  loadBuildByProjectId,
  parseBuild,
} from "@webstudio-is/project-build/index.server";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { z } from "zod";
import { zfd } from "zod-form-data";
import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";

const StepSchema = z.enum(["instances", "styles"]);
type StepName = z.infer<typeof StepSchema>;

const RequestSchema = zfd.formData(
  z.intersection(
    z.object({
      prompt: zfd.text(z.string().max(1380)),
      style: zfd.text(z.string().max(140).optional()).optional(),
      components: zfd.text(z.string().optional()).optional(),
      messages: zfd.repeatableOfType(zfd.text()).optional(),
      instanceId: zfd.text(),
      projectId: zfd.text(),
      buildId: zfd.text().optional(),
    }),
    z.union([
      z.object({
        _action: zfd.text(z.enum(["generate"])),
        steps: zfd.repeatableOfType(z.enum(["instances", "styles"])),
      }),
      z.object({
        _action: zfd.text(z.enum(["edit"])),
        steps: zfd.repeatableOfType(z.enum(["tweak"])),
      }),
    ])
  )
);
type RequestSchema = z.infer<typeof RequestSchema>;

const chains = {
  generate: {
    instances: createGenerateInstancesChain<GPTModelMessageFormat>(),
    styles: createGenerateStylesChain<GPTModelMessageFormat>(),
  },
  edit: {
    tweak: createEditTweakChain<GPTModelMessageFormat>(),
  },
};

export const action = async ({ request }: ActionArgs) => {
  if (!isFeatureEnabled("ai")) {
    return { errors: ["Feature not available"] };
  }

  if (!env.OPENAI_KEY) {
    throw new Error("Invalid OpenAI Key");
  }

  if (!env.OPENAI_ORG || !env.OPENAI_ORG.startsWith("org-")) {
    throw new Error("Invalid OpenAI Org");
  }

  const formData = RequestSchema.parse(await request.formData());

  /* Permissions check */
  const requestContext = await createContext(request);
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId: formData.projectId, permit: "edit" },
    requestContext
  );
  if (canEdit === false) {
    throw Error("You don't have edit access to this project");
  }
  /* End of Permissions check */

  const model = createGptModel({
    apiKey: env.OPENAI_KEY,
    organization: env.OPENAI_ORG,
    temperature: 0,
    model: "gpt-3.5-turbo-0613",
  });

  // @todo 1. Revisit this because technically every Chain could use a different Model
  const context: ChainContext = {
    api: {
      getBuild: async function getBuild({ projectId, buildId }) {
        let build;

        if (buildId) {
          const dbResult = await prisma.build.findUnique({
            where: { id_projectId: { projectId, id: buildId } },
          });

          if (!dbResult) {
            throw new Error("Build not found");
          }

          build = parseBuild(dbResult);
        } else {
          build = await loadBuildByProjectId(projectId);
        }

        if (!build) {
          throw new Error("Build not found");
        }

        return build;
      },
    },
    prompts: {
      request: formData.prompt,
      style: formData.style || "",
      components: formData.components || "",
    },
    messages: (formData.messages || []).map((message) => JSON.parse(message)),
    projectId: formData.projectId,
    buildId: formData.buildId,
    instanceId: formData.instanceId,
  };

  const responses = [];
  const action = formData._action;

  for (const step of formData.steps) {
    // @todo Remove this hard coded if/else see @todo 1.
    const chain =
      action === "generate"
        ? step === "instances" || step === "styles"
          ? chains[action][step]
          : null
        : action === "edit" && step === "tweak"
        ? chains[action][step]
        : null;

    if (typeof chain !== "function") {
      throw new Error(`Invalid step ${step}`);
    }

    const chainResponse = await chain({ model, context });

    responses.push([
      step,
      { json: chainResponse.json[0], code: chainResponse.code[0] },
    ]);
  }

  return responses;
};

// type ChainMessages = Array<["system" | "user" | "assistant", string]>;

// type Chain = (context: ChainContext) => Promise<ChainResponse>;

// type ChainContext = {
//   api: {
//     getBuild: (data: {
//       projectId: Project["id"];
//       buildId?: Build["id"];
//     }) => Promise<Build>;
//   };
//   request: ({ messages }: { messages: ChainMessages }) => Promise<LLMResponse>;
//   prompt: string;
//   messages: ChainMessages;
//   projectId: Project["id"];
//   buildId?: Build["id"];
//   instanceId: string;
// };

// type ChainResponse = {
//   json: JsonObject;
//   // collection of code snippets
//   code: string[];
//   // the LLM chat
//   llmMessages: ChainMessages[];
// };

// const ChainGenerationInstances: Chain =
//   async function ChainGenerationInstances({
//     api,
//     request,
//     prompt,
//     messages,
//     projectId,
//     buildId,
//     instanceId,
//   }) {
//     const build = await api.getBuild({
//       projectId,
//       buildId,
//     });

//     const root = build.instances.find(
//       ([id, instance]) => instance.id === instanceId
//     );

//     if (!root) {
//       throw new Error(`Instance with id ${instanceId} not found`);
//     }
//   };

// const ChainEdit: Chain = async function ChainEdit({
//   api,
//   request,
//   prompt,
//   messages,
//   projectId,
//   buildId,
//   instanceId,
// }) {
//   const build = await api.getBuild({
//     projectId,
//     buildId,
//   });

//   const root = build.instances.find(
//     ([id, instance]) => instance.id === instanceId
//   );

//   if (!root) {
//     throw new Error(`Instance with id ${instanceId} not found`);
//   }
// };

// // @todo Add end-to-end types.

// const templates = templateJsx;

// export const actionz = async ({ request }: ActionArgs) => {
//   if (!isFeatureEnabled("ai")) {
//     return { errors: ["Feature not available"] };
//   }

//   // @todo Add session checks and rate limiting.

//   // @todo Incorporate embeddings to provide context to each step:
//   // instances -> pick relevant components metadata with description etc.
//   // props     -> pick props definitions for used components? This payload can be very long.
//   // styles    -> pick examples?

//   try {
//     const formData = schema.parse(await request.formData());
//     const userPrompt = formData.prompt.trim().replace(/`/g, "\\`");
//     const steps: Steps = formData.steps.map((step, index) => {
//       const m = formData.messages[index];
//       return {
//         name: step,
//         template: templates[formData._action][step],
//         messages: typeof m === "string" ? JSON.parse(m) : null,
//       };
//     });

//     const result = await generate({
//       userPrompt,
//       steps,
//       config: {
//         apiKey: env.OPENAI_KEY || "",
//         organization: env.OPENAI_ORG || "",
//         model: "gpt-3.5-turbo",
//       },
//     });

//     return result;
//   } catch (error) {
//     return { errors: error.message };
//   }

//   return { errors: "Unexpected error" };
// };

// // @todo replace with langchain
// export const generate = async function generate({
//   userPrompt,
//   steps,
//   config,
// }: {
//   userPrompt: string;
//   steps: Steps;
//   config: OpenAIConfig;
// }) {
//   const { apiKey, organization, model }: OpenAIConfig = config;
//   if (apiKey.trim().length === 0) {
//     throw new Error("OpenAI API missing");
//   }

//   if (!organization.startsWith("org-")) {
//     throw new Error("OpenAI org missing or invalid");
//   }

//   try {
//     const chain = getChainForPrompt({
//       prompt: userPrompt,
//       steps,
//       complete: (step, messages) =>
//         fetch("https://api.openai.com/v1/chat/completions", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//             Authorization: `Bearer ${apiKey}`,
//             "OpenAI-Organization": organization,
//           },
//           body: JSON.stringify({
//             model,
//             messages,
//             temperature: step.template.temperature,
//             max_tokens: step.template.maxTokens,
//           }),
//         }).then((response) => {
//           if (response.ok) {
//             return response.json();
//           }
//           throw new Error(`${response.status}: ${response.statusText}`);
//         }),
//     });

//     const responses = await chain();
//     return responses.map(([stepName, response]) => {
//       const step = steps.find((s) => s.name === stepName);
//       if (step === undefined) {
//         throw new Error("Invalid response handler");
//       }
//       const { template } = step;
//       const code = template.getCode(response);
//       let json;
//       try {
//         json = template.transform(code);

//         if (typeof template.validate === "function") {
//           template.validate(json);
//           return [stepName, { code, json }];
//         }
//       } catch (error) {
//         const errorMessage = `Invalid ${step} generation. ${
//           process.env.NODE_ENV === "production"
//             ? ""
//             : // : `${JSON.stringify(json, null, 2)}\n\n${error.message}`
//               `${JSON.stringify(json, null, 2)}\n\n${error.message}`
//         }`;

//         throw new Error(errorMessage);
//       }
//     });
//   } catch (error) {
//     const errorMessage = `Something went wrong. ${
//       process.env.NODE_ENV === "production" ? "" : `${(error as Error).message}`
//     }`;
//     if (process.env.NODE_ENV !== "production") {
//       console.error(errorMessage);
//     }
//     throw new Error(errorMessage);
//   }
// };

// const getChainForPrompt = function getChainForPrompt({
//   prompt,
//   steps,
//   complete,
// }: {
//   prompt: string;
//   steps: Steps;
//   complete: (
//     step: Step,
//     messages: ChatCompletionRequestMessage[]
//   ) => Promise<CreateChatCompletionResponse>;
// }) {
//   return async function chain() {
//     const responses: [StepName, string][] = [];

//     for (let i = 0; i < steps.length; i++) {
//       const { name: step, template, messages } = steps[i];

//       const completionRequestMessages = [
//         {
//           role: "user",
//           content: template.prompt.replace(/{prompt-content}/, prompt).trim(),
//         } as ChatCompletionRequestMessage,
//       ];

//       if (Array.isArray(messages)) {
//         completionRequestMessages.unshift(...messages);
//       } else if (i > 0 && responses[i - 1]) {
//         completionRequestMessages.unshift({
//           role: "assistant",
//           content: responses[i - 1][1],
//         });
//       }

//       console.log({
//         completionRequestMessages: JSON.stringify(
//           completionRequestMessages,
//           null,
//           2
//         ),
//       });

//       const completion = await complete(steps[i], completionRequestMessages);
//       responses[i] = [step, completion.choices[0].message?.content || ""];
//     }

//     return responses;
//   };
// };
