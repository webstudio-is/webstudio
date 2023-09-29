import { z } from "zod";
import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/edit.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/edit.user.prompt";

import {
  AiOperationsSchema,
  aiToWs,
  WsOperationsSchema,
  type WsOperations,
} from "./operations";
import { zodToJsonSchema } from "zod-to-json-schema";
import { postprocessTemplate } from "../../utils/jsx-to-template";

export * from "./operations";

/**
 * Operations Chain.
 *
 * Given a description, available components and an existing instance as JSX and CSS,
 * it generates a series of edit operations to fulfill an edit request coming from the user.
 */

export const ContextSchema = z.object({
  prompt: z.string().max(1200).describe("Edit request from the user"),
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
    const { prompt, components, jsx } = context;

    const llmMessages: ModelMessage[] = [];
    const tokens = { prompt: 0, completion: 0 };

    const operationsSchema = zodToJsonSchema(
      AiOperationsSchema.element,
      "AiOperationsSchema"
    );

    const systemMessage: ModelMessage = [
      "system",
      formatPrompt(
        {
          operationsSchema: JSON.stringify(operationsSchema),
          components: components
            .map((name) =>
              name.replace(
                "@webstudio-is/sdk-components-react-radix:",
                "Radix."
              )
            )
            .join(", "),
        },
        promptSystemTemplate
      ),
    ];
    llmMessages.push(systemMessage);

    const userMessage: ModelMessage = [
      "user",
      formatPrompt(
        {
          prompt,
          jsx,
        },
        promptUserTemplate
      ),
    ];
    llmMessages.push(userMessage);

    const messages = model.generateMessages(llmMessages);

    const completion = await model.request({
      messages,
    });

    if (completion.success === false) {
      return completion;
    }

    // @todo Refactor to send tokens usage with ErroResponse too.

    tokens.prompt += completion.tokens.prompt;
    tokens.completion += completion.tokens.completion;

    const completionText = completion.choices[0];
    llmMessages.push(["assistant", completionText]);

    const parsedCompletion = AiOperationsSchema.safeParse(
      JSON.parse(completionText)
    );
    if (parsedCompletion.success === false) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: `Failed to parse completion ${
          process.env.NODE_ENV === "development"
            ? parsedCompletion.error.message
            : ""
        }`.trim(),
        llmMessages,
      };
    }

    const aiOperations = parsedCompletion.data;

    let wsOperations: WsOperations = [];
    try {
      wsOperations = await Promise.all(aiToWs(aiOperations));

      // Clean up template and ensure valid components in templates
      wsOperations.forEach((operation) => {
        for (let index = 0; index < wsOperations.length; index++) {
          if (operation.operation !== "insertTemplate") {
            return;
          }

          postprocessTemplate(operation.template, components);
        }
      });
    } catch (error) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: `Failed to convert operations. ${
          process.env.NODE_ENV === "development" ? (error as Error) : ""
        }`.trim(),
        llmMessages,
      };
    }

    return {
      success: true,
      tokens: tokens.prompt + tokens.completion,
      data: wsOperations,
      llmMessages,
    };
  };
