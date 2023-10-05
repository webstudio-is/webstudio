import type { ActionArgs } from "@remix-run/node";
import {
  operations,
  templateGenerator,
  createGptModel,
  type GPTModelMessageFormat,
  createErrorResponse,
} from "@webstudio-is/ai";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";

const RequestSchema = operations.ContextSchema;

export const maxDuration = 120;

export const action = async ({ request }: ActionArgs) => {
  if (isFeatureEnabled("aiCopy") === false) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "featureDisabled",
        status: 503,
        message: "The feature is not available",
        debug: "aiCopy feature disabled",
      }),
    };
  }

  if (env.OPENAI_KEY === undefined) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "ai.invalidApiKey",
        status: 401,
        debug: "Invalid OpenAI API key",
      }),
    };
  }

  if (
    env.OPENAI_ORG === undefined ||
    env.OPENAI_ORG.startsWith("org-") === false
  ) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "ai.invalidOrg",
        status: 401,
        debug: "Invalid OpenAI API organization",
      }),
    };
  }

  const parsed = RequestSchema.safeParse(await request.json());

  if (parsed.success === false) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "ai.invalidRequest",
        status: 401,
        debug: "Invalid request data",
      }),
    };
  }

  const { prompt, components, jsx } = parsed.data;

  const requestContext = await createContext(request);

  if (requestContext.authorization.userId === undefined) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "unauthorized",
        status: 401,
        message: "You don't have edit access to this project",
        debug: "Unauthorized access attempt",
      }),
    };
  }

  const model = createGptModel({
    apiKey: env.OPENAI_KEY,
    organization: env.OPENAI_ORG,
    temperature: 0,
    model: "gpt-3.5-turbo-16k",
  });

  const chain = operations.createChain<GPTModelMessageFormat>();

  const response = await chain({
    model,
    context: {
      prompt,
      components,
      jsx,
    },
  });

  if (response.success === false) {
    return response;
  }

  const { llmMessages } = response;

  const generateTemplatePrompts = response.data.filter(
    (operation) => operation.operation === "generateTemplatePrompt"
  ) as operations.generateTemplatePrompt.wsOperation[];

  if (generateTemplatePrompts.length > 0) {
    const generationModel = createGptModel({
      apiKey: env.OPENAI_KEY,
      organization: env.OPENAI_ORG,
      temperature: 0,
      model: "gpt-4",
    });

    const generationChain =
      templateGenerator.createChain<GPTModelMessageFormat>();

    const results = await Promise.all(
      generateTemplatePrompts.map((operation, index) =>
        generationChain({
          model: generationModel,
          context: {
            prompt: operation.llmPrompt,
            components,
          },
        }).then((result) => [index, result] as const)
      )
    );

    for (const [index, result] of results) {
      llmMessages.push(...result.llmMessages);

      if (result.success === false) {
        return {
          ...result,
          llmMessages,
        };
      }

      // Replace generateTemplatePrompt.wsOperation with actual generated template
      const generateTemplatePrompt = generateTemplatePrompts[index];
      response.data[index] = {
        operation: "insertTemplate",
        addTo: generateTemplatePrompt.addTo,
        addAtIndex: generateTemplatePrompt.addAtIndex,
        template: result.data,
      };
    }
  }

  return {
    ...response,
    llmMessages,
  };
};
