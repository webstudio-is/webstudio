import { z } from "zod";
import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/command-detect.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/command-detect.user.prompt";
import { createErrorResponse } from "../../utils/create-error-response";

/**
 * Command Detect Chain
 *
 * Given a prompt and a list of possible commands and descriptions, it returns an array of operations matching the prompt request.
 */

export const ContextSchema = z.object({
  // The prompt provides the original user request.
  prompt: z.string(),
  commands: z.array(z.string()),
});
export type Context = z.infer<typeof ContextSchema>;

export const ResponseSchema = z.array(z.string());
export type Response = z.infer<typeof ResponseSchema>;

export const createChain = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>,
  Context,
  Response
> =>
  async function chain({ model, context }) {
    const id = "command-detect";

    const { prompt, commands } = context;

    const llmMessages: ModelMessage[] = [
      [
        "system",
        formatPrompt(
          {
            commands: JSON.stringify(commands),
          },
          promptSystemTemplate
        ),
      ],
      ["user", formatPrompt({ prompt }, promptUserTemplate)],
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

    let detectedCommands = [];
    try {
      detectedCommands = ResponseSchema.parse(JSON.parse(completionText));
      const expectedCommands = new Set(commands);
      for (const command of detectedCommands) {
        if (expectedCommands.has(command) === false) {
          throw new Error("Invalid command name detected " + command);
        }
      }
    } catch (error) {
      return {
        id,
        ...createErrorResponse({
          status: 500,
          error: "ai.parseError",
          debug: (
            "Failed to parse the completion " +
            (error instanceof Error ? error.message : "")
          ).trim(),
        }),
        llmMessages,
      };
    }

    return {
      ...completion,
      data: detectedCommands,
      llmMessages,
    };
  };
