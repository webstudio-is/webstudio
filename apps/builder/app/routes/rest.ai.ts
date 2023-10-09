import { z } from "zod";
import type { ActionArgs } from "@remix-run/node";
import {
  copywriter,
  commandDetect,
  operations,
  templateGenerator,
  createGptModel,
  type GptModelMessageFormat,
  createErrorResponse,
  type ModelMessage,
} from "@webstudio-is/ai/index.server";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { loadBuildByProjectId } from "@webstudio-is/project-build/index.server";

export const RequestParamsSchema = z.object({
  projectId: z.string(),
  instanceId: z.string(),
  prompt: z.string().max(1200),
  components: z.array(z.string()),
  jsx: z.string(),
});

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

  // Given a prompt, categorize the user request.
  // Based on that we can then decide whether we should execute standalone chains
  // or the operations chain which needs full context about the instances tree as JSX and CSS.
  const commandDetectChain = commandDetect.createChain<GptModelMessageFormat>();
  const commandDetectResponse = await commandDetectChain({
    model,
    context: {
      prompt,
      commands: [
        // @todo Find a good way to pass only the features we want/need to detect
        // without passing them all. As a safety measure we are currently passing them all
        // so that the LLM won't miscategorize the task and for example handle an "edit-style" request as a "write-copy" one.
        // During testing the LLM misdetected a stylistic request like "make it bold" as a request to rewrite the text to sound more "bold".
        "write-copy",
        "generate-images",
        "edit-styles",
        "generate-ui",
        "delete-elements",
      ],
    },
  });

  llmMessages.push(...commandDetectResponse.llmMessages);

  // If this is indeed a copy request use the copywriter chain.
  if (
    commandDetectResponse.success &&
    commandDetectResponse.data.some((command) => command === "write-copy")
  ) {
    const canEdit = await authorizeProject.hasProjectPermit(
      { projectId: projectId, permit: "edit" },
      requestContext
    );

    if (canEdit === false) {
      return {
        id: commandDetectResponse.id,
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
    const copywriterChain = copywriter.createChain<GptModelMessageFormat>();
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

  // If the request requires context about the instances tree use the Operations chain.

  model = createGptModel({
    apiKey: env.OPENAI_KEY,
    organization: env.OPENAI_ORG,
    temperature: 0,
    model: "gpt-3.5-turbo-16k",
  });

  const chain = operations.createChain<GptModelMessageFormat>();

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

  // The operations chain can detect a user interface generation request.
  // In such cases we let this chain select the insertion point
  // and then handle the generation request with a standalone chain called template-generator
  // that has a dedicate and comprehensive prompt.

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
      templateGenerator.createChain<GptModelMessageFormat>();

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

      // Replace generateTemplatePrompt.wsOperation with the AI-generated Webstudio template.
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
