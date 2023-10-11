import { z } from "zod";
import type { ActionArgs } from "@remix-run/node";
import {
  commandDetect,
  createGptModel,
  type GptModelMessageFormat,
  createErrorResponse,
  copywriter,
  operations,
} from "@webstudio-is/ai/index.server";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";

export const RequestParamsSchema = z.object({
  prompt: z.string().max(1200),
});

export const action = async ({ request }: ActionArgs) => {
  if (isFeatureEnabled("ai") === false) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "featureDisabled",
        status: 503,
        message: "The feature is not available",
        debug: "aiCopy feature disabled",
      }),
      llmMessages: [],
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
      llmMessages: [],
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
      llmMessages: [],
    };
  }

  const parsed = RequestParamsSchema.safeParse(await request.json());

  if (parsed.success === false) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "ai.invalidRequest",
        status: 401,
        debug: "Invalid request data",
      }),
      llmMessages: [],
    };
  }

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
      llmMessages: [],
    };
  }

  const { prompt } = parsed.data;

  const model = createGptModel({
    apiKey: env.OPENAI_KEY,
    organization: env.OPENAI_ORG,
    temperature: 0,
    model: "gpt-3.5-turbo",
  });

  const commandDetectChain = commandDetect.createChain<GptModelMessageFormat>();
  return commandDetectChain({
    model,
    context: {
      prompt,
      commands: {
        [copywriter.name]:
          "writes, rewrites, rephrases, shortens, increases length or translates text",
        [operations.editStyles.name]: "edits styles",
        [operations.generateTemplatePrompt.name]:
          "handles a user interface generation request",
        [operations.deleteInstance.name]: "deletes elements",
      },
    },
  });
};
