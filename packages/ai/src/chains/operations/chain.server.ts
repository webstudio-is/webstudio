import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/operations.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/operations.user.prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import { postProcessTemplate } from "../../utils/jsx-to-template.server";
import { createErrorResponse } from "../../utils/create-error-response";
import {
  type Context,
  type Response,
  type AiOperations,
  type WsOperations,
  AiOperationsSchema,
  name,
} from "./schema";
import * as editStyles from "./edit-styles.server";
import * as generateTemplatePrompt from "./generate-template-prompt.server";
// import * as generateInsertTemplate from "./generate-insert-template.server";
import * as deleteInstance from "./delete-instance.server";

export * as editStyles from "./edit-styles.server";
export * as generateTemplatePrompt from "./generate-template-prompt.server";
export * as generateInsertTemplate from "./generate-insert-template.server";
export * as deleteInstance from "./delete-instance.server";

/**
 * Operations Chain.
 *
 * Given a description, available components and an existing instance as JSX and CSS,
 * it generates a series of edit operations to fulfill an edit request coming from the user.
 */

export { name };

const aiToWs = (aiOperations: AiOperations) => {
  return aiOperations
    .map((aiOperation) => {
      if (aiOperation.operation === "editStylesWithTailwindCSS") {
        return editStyles.aiOperationToWs(aiOperation);
      }
      if (aiOperation.operation === "generateTemplatePrompt") {
        return generateTemplatePrompt.aiOperationToWs(aiOperation);
      }
      // if (aiOperation.operation === "generateInstanceWithTailwindStyles") {
      //   return generateInsertTemplate.aiOperationToWs(aiOperation);
      // }
      if (aiOperation.operation === "deleteInstance") {
        return deleteInstance.aiOperationToWs(aiOperation);
      }
    })
    .filter(function <T>(value: T): value is NonNullable<T> {
      return value !== undefined;
    });
};

export const createChain = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>,
  Context,
  Response
> =>
  async function chain({ model, context }) {
    const { prompt, components, jsx } = context;

    // @todo Make it so this chain can run only for
    // a specific operation among the supported ones.
    // This could be passed as context.operations.
    const operationsSchema = zodToJsonSchema(
      AiOperationsSchema.element,
      "AiOperationsSchema"
    );

    const llmMessages: ModelMessage[] = [
      [
        "system",
        formatPrompt(
          {
            operationsSchema: JSON.stringify(operationsSchema),
            components: components.join(", "),
          },
          promptSystemTemplate
        ),
      ],
      [
        "user",
        formatPrompt(
          {
            prompt,
            jsx,
          },
          promptUserTemplate
        ),
      ],
    ];

    const messages = model.generateMessages(llmMessages);

    const completion = await model.completion({
      id: name,
      messages,
    });

    if (completion.success === false) {
      return {
        ...completion,
        llmMessages,
      };
    }

    const completionText = completion.data.choices[0];
    llmMessages.push(["assistant", completionText]);

    let parsedCompletion;

    try {
      parsedCompletion = AiOperationsSchema.safeParse(
        JSON.parse(completionText)
      );
    } catch (error) {
      return {
        id: name,
        ...createErrorResponse({
          status: 500,
          error: "ai.parseError",
          message: `Failed to parse completion JSON ${error}`,
          debug: `Failed to parse completion JSON ${error}`,
        }),
        tokens: completion.tokens,
        llmMessages,
      } as const;
    }

    if (parsedCompletion.success === false) {
      return {
        id: name,
        ...createErrorResponse({
          status: 500,
          error: "ai.parseError",
          message: `Failed to parse completion ${parsedCompletion.error.message}`,
          debug: `Failed to parse completion ${parsedCompletion.error.message}`,
        }),
        tokens: completion.tokens,
        llmMessages,
      } as const;
    }

    const aiOperations = parsedCompletion.data;

    let wsOperations: WsOperations = [];
    try {
      wsOperations = await Promise.all(aiToWs(aiOperations));

      for (const wsOperation of wsOperations) {
        if (wsOperation.operation === "insertTemplate") {
          // Clean up template and ensure valid components in templates
          postProcessTemplate(wsOperation.template, components);
        }
      }
    } catch (error) {
      return {
        id: name,
        ...createErrorResponse({
          status: 500,
          error: "ai.parseError",
          message:
            error instanceof Error
              ? error.message
              : "Failed to parse the completion",

          debug: (
            "Failed to convert operations. " +
            (error instanceof Error ? error.message : "")
          ).trim(),
          tokens: completion.tokens,
        }),
        llmMessages,
      } as const;
    }

    const { data, ...response } = completion;
    return {
      ...response,
      data: wsOperations,
      llmMessages,
    };
  };
