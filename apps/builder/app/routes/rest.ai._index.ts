import { z } from "zod";
import type { ActionArgs } from "@remix-run/node";
import {
  copywriter,
  operations,
  templateGenerator,
  createGptModel,
  type GptModelMessageFormat,
  createErrorResponse,
  type ModelMessage,
} from "@webstudio-is/ai/index.server";
import {
  copywriter as clientCopywriter,
  operations as clientOperations,
  queryImagesAndMutateTemplate,
} from "@webstudio-is/ai";
import env from "~/env/env.server";
import { createContext } from "~/shared/context.server";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { loadBuildByProjectId } from "@webstudio-is/project-build/index.server";

export const RequestParamsSchema = z.object({
  projectId: z.string().min(1, "nonempty"),
  instanceId: z.string().min(1, "nonempty"),
  prompt: z.string().min(1, "nonempty").max(1200),
  components: z.array(z.string()),
  jsx: z.string().min(1, "nonempty"),
  command: z.union([
    // Using client* friendly imports because RequestParamsSchema
    // is used to parse the form data on the client too.
    z.literal(clientCopywriter.name),
    z.literal(clientOperations.editStylesName),
    z.literal(clientOperations.generateTemplatePromptName),
    z.literal(clientOperations.deleteInstanceName),
  ]),
});

// Override Vercel's default serverless functions timeout.
export const config = {
  maxDuration: 180, // seconds
};

export const action = async ({ request }: ActionArgs) => {
  // @todo Reinstate isFeatureEnabled('ai')

  if (env.OPENAI_KEY === undefined) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "ai.invalidApiKey",
        status: 401,
        message: "Invalid OpenAI API key",
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
        message: "Invalid OpenAI API organization",
        debug: "Invalid OpenAI API organization",
      }),
      llmMessages: [],
    };
  }

  if (env.PEXELS_API_KEY === undefined) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "ai.invalidApiKey",
        status: 401,
        message: "Invalid Pexels API key",
        debug: "Invalid Pexels API key",
      }),
      llmMessages: [],
    };
  }
  const PEXELS_API_KEY = env.PEXELS_API_KEY;

  const parsed = RequestParamsSchema.safeParse(await request.json());

  if (parsed.success === false) {
    return {
      id: "ai",
      ...createErrorResponse({
        error: "ai.invalidRequest",
        status: 401,
        message: "Invalid request data",
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

  const { prompt, components, jsx, projectId, instanceId, command } =
    parsed.data;

  if (command === copywriter.name) {
    const canEdit = await authorizeProject.hasProjectPermit(
      { projectId: projectId, permit: "edit" },
      requestContext
    );

    if (canEdit === false) {
      return {
        id: copywriter.name,
        ...createErrorResponse({
          error: "unauthorized",
          status: 401,
          message: "You don't have edit access to this project",
          debug: "Unauthorized access attempt",
        }),
        llmMessages: [],
      };
    }

    const { instances } = await loadBuildByProjectId(projectId);

    const model = createGptModel({
      apiKey: env.OPENAI_KEY,
      organization: env.OPENAI_ORG,
      temperature: 0,
      model: "gpt-3.5-turbo",
    });

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

    if (copywriterResponse.success === false) {
      return copywriterResponse;
    }

    // Return the copywriter generation stream.
    return copywriterResponse.data;
  }

  // If the request requires context about the instances tree use the Operations chain.

  const llmMessages: ModelMessage[] = [];

  const model = createGptModel({
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

  const generateTemplatePrompts: {
    dataIndex: number;
    operation: operations.generateTemplatePrompt.wsOperation;
  }[] = [];
  response.data.forEach((operation, dataIndex) => {
    if (operation.operation === "generateTemplatePrompt") {
      // preserve the index in response.data to update it after executing operations
      generateTemplatePrompts.push({ dataIndex, operation });
    }
  });

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
      generateTemplatePrompts.map(async ({ dataIndex, operation }) => {
        const result = await generationChain({
          model: generationModel,
          context: {
            prompt:
              operation.llmPrompt +
              (operation.classNames && operation.classNames.length > 0
                ? `.\nSuggested Tailwind classes: ${operation.classNames}`
                : ""),

            components,
          },
        });
        if (result.success) {
          await queryImagesAndMutateTemplate({
            template: result.data,
            apiKey: PEXELS_API_KEY,
          });
        }
        return {
          dataIndex,
          operation,
          result,
        };
      })
    );

    for (const { dataIndex, operation, result } of results) {
      llmMessages.push(...result.llmMessages);

      if (result.success === false) {
        return {
          ...result,
          llmMessages,
        };
      }

      // Replace generateTemplatePrompt.wsOperation with the AI-generated Webstudio template.
      response.data[dataIndex] = {
        operation: "insertTemplate",
        addTo: operation.addTo,
        addAtIndex: operation.addAtIndex,
        template: result.data,
      };
    }
  }

  return {
    ...response,
    llmMessages,
  };
};
