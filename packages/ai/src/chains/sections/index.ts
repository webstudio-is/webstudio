import { z } from "zod";
import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/sections.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/sections.user.prompt";

/**
 * Sections Description Chain.
 *
 * Given a description, this chain generates a list of LMM-friendly descriptions which contain title and description.
 */

// The response is an object where the key is the title and the value is the description.
export const SectionsSchema = z.record(z.string());

export type Sections = z.infer<typeof SectionsSchema>;

export const ContextSchema = z.object({
  // The prompt provides the original user request.
  prompt: z.string().max(1200),
});
export type Context = z.infer<typeof ContextSchema>;

export const ResponseSchema = SectionsSchema;
export type Response = z.infer<typeof ResponseSchema>;

export const createChain = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>,
  Context,
  Response
> =>
  async function chain({ model, context }) {
    const { prompt } = context;

    const systemMessage: ModelMessage = ["system", promptSystemTemplate];

    const userMessage: ModelMessage = [
      "user",
      formatPrompt({ prompt }, promptUserTemplate),
    ];

    const messages = model.generateMessages([systemMessage, userMessage]);

    const completion = await model.request({
      messages,
    });

    if (completion.success === false) {
      return completion;
    }

    const completionText = completion.choices[0];

    let sections: Sections = {};

    try {
      sections = JSON.parse(completionText);
    } catch (error) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: "Failed to parse the completion",
      };
    }

    // Validate parsed completion.
    if (SectionsSchema.safeParse(sections).success === false) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: "Invalid completion",
      };
    }

    return {
      success: true,
      tokens: completion.tokens.prompt + completion.tokens.completion,
      data: sections,
      llmMessages: [],
    };
  };
