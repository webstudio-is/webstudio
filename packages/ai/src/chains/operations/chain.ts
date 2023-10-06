import { z } from "zod";
import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/operations.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/operations.user.prompt";

import {
  AiOperationsSchema,
  aiToWs,
  WsOperationsSchema,
  type WsOperations,
} from "./shared";
import { zodToJsonSchema } from "zod-to-json-schema";
import { postProcessTemplate } from "../../utils/jsx-to-template.server";
import { createErrorResponse } from "../../utils/create-error-response";

/**
 * Operations Chain.
 *
 * Given a description, available components and an existing instance as JSX and CSS,
 * it generates a series of edit operations to fulfill an edit request coming from the user.
 */

export const ContextSchema = z.object({
  prompt: z.string().describe("Edit request from the user"),
  components: z.array(z.string()).describe("Available Webstudio components"),
  jsx: z.string().describe("Input JSX to edit"),
});
export type Context = z.infer<typeof ContextSchema>;

export const ResponseSchema = WsOperationsSchema;
export type Response = z.infer<typeof ResponseSchema>;

export const createChain = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>,
  Context,
  Response
> =>
  async function chain({ model, context }) {
    const id = "operations";

    const { prompt, components, jsx } = context;

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
      id,
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

    const parsedCompletion = AiOperationsSchema.safeParse(
      JSON.parse(completionText)
    );
    if (parsedCompletion.success === false) {
      return {
        id,
        ...createErrorResponse({
          status: 500,
          error: "ai.parseError",
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
        id,
        ...createErrorResponse({
          status: 500,
          error: "ai.parseError",
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
