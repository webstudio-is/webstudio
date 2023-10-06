import { z } from "zod";
import type { ActionArgs } from "@remix-run/node";
import {
  operations,
  templateGenerator,
  createGptModel,
  type GPTModelMessageFormat,
  createErrorResponse,
  type ModelMessage,
  copywriter,
} from "@webstudio-is/ai";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { loadBuildByProjectId } from "@webstudio-is/project-build/index.server";

export const RequestParamsSchema = operations.ContextSchema.merge(
  z.object({
    projectId: z.string(),
    instanceId: z.string(),
  })
);

export const maxDuration = 120;

export const action = async ({ request }: ActionArgs) => {
  const llmMessages: ModelMessage[] = [];

  if (isFeatureEnabled("ai") === false) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "featureDisabled",
        status: 503,
        message: "The feature is not available",
        debug: "aiCopy feature disabled",
      }),
      llmMessages,
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
      llmMessages,
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
      llmMessages,
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
      llmMessages,
    };
  }

  const { prompt, components, jsx, projectId, instanceId } = parsed.data;

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
      llmMessages,
    };
  }

  let model = createGptModel({
    apiKey: env.OPENAI_KEY,
    organization: env.OPENAI_ORG,
    temperature: 0,
    model: "gpt-3.5-turbo",
  });

  // We first detect whether the request can be handled by the copywriter.
  const copywriterDetectChain =
    copywriterDetect.createChain<GPTModelMessageFormat>();
  const copywriterDetectResponse = await copywriterDetectChain({
    model,
    context: {
      prompt,
    },
  });

  llmMessages.push(...copywriterDetectResponse.llmMessages);

  // If this is indeed a copy request use the copywriter chain.
  if (
    copywriterDetectResponse.success &&
    copywriterDetectResponse.data === true
  ) {
    const canEdit = await authorizeProject.hasProjectPermit(
      { projectId: projectId, permit: "edit" },
      requestContext
    );

    if (canEdit === false) {
      return {
        id: copywriterDetectResponse.id,
        ...createErrorResponse({
          error: "unauthorized",
          status: 401,
          message: "You don't have edit access to this project",
          debug: "Unauthorized access attempt",
        }),
        llmMessages,
      };
    }

    const { instances } = await loadBuildByProjectId(projectId);
    const copywriterChain = copywriter.createChain<GPTModelMessageFormat>();
    const copywriterResponse = await copywriterChain({
      model,
      context: {
        prompt,
        textInstances: copywriter.collectTextInstances({
          instances: new Map(instances),
          rootInstanceId: instanceId,
        }),
      },
    });

    if (copywriterResponse.success) {
      // Return the copywriter generation stream.
      return copywriterResponse.data;
    }

    return {
      ...copywriterResponse,
      llmMessages,
    };
  }

  model = createGptModel({
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

  llmMessages.push(...response.llmMessages);

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
