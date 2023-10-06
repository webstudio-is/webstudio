import type { ActionArgs } from "@remix-run/node";
import {
  copywriter,
  createErrorResponse,
  createGptModel,
  type GPTModelMessageFormat,
} from "@webstudio-is/ai";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { z } from "zod";
import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";

const RequestSchema = copywriter.ContextSchema.extend({
  projectId: z.string(),
});

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

  const { projectId, prompt, textInstances } = parsed.data;

  // Permissions check
  const requestContext = await createContext(request);
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId: projectId, permit: "edit" },
    requestContext
  );

  if (canEdit === false) {
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
  // End of Permissions check

  const model = createGptModel({
    apiKey: env.OPENAI_KEY,
    organization: env.OPENAI_ORG,
    temperature: 0.5,
    model: "gpt-3.5-turbo",
  });

  const chain = copywriter.createChain<GPTModelMessageFormat>();

  const response = await chain({
    model,
    context: {
      prompt,
      textInstances,
    },
  });

  if (response.success) {
    return response.data;
  }

  return response;
};
