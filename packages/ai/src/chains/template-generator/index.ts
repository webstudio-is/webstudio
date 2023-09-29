import { z } from "zod";
import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/template-generator.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/template-generator.user.prompt";
import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import {
  jsxToTemplate,
  postprocessTemplate,
} from "../../utils/jsx-to-template";

/**
 * Template Generator Chain.
 *
 * Given a UI section or widget description, this chain generates a Webstudio Embed Template representing the UI.
 */

export const ContextSchema = z.object({
  // The prompt provides the original user request.
  prompt: z.string().max(1200),
  components: z.array(z.string()),
});
export type Context = z.infer<typeof ContextSchema>;

export const ResponseSchema = WsEmbedTemplate;
export type Response = z.infer<typeof ResponseSchema>;

export const createChain = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>,
  Context,
  Response
> =>
  async function chain({ model, context }) {
    const { prompt, components } = context;

    const llmMessages: ModelMessage[] = [];

    const systemMessage: ModelMessage = [
      "system",
      formatPrompt(
        {
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
      formatPrompt({ prompt }, promptUserTemplate),
    ];
    llmMessages.push(userMessage);

    const messages = model.generateMessages(llmMessages);

    const completion = await model.request({
      messages,
    });

    if (completion.success === false) {
      return completion;
    }

    const completionText = completion.choices[0];
    llmMessages.push(["assistant", completionText]);

    let template: WsEmbedTemplate;

    try {
      template = await jsxToTemplate(completionText);
    } catch (error) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: "Failed to parse the completion " + error,
        llmMessages,
      };
    }

    try {
      postprocessTemplate(template, components);
    } catch (error) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: "Invalid completion",
        llmMessages,
      };
    }

    return {
      success: true,
      tokens: completion.tokens.prompt + completion.tokens.completion,
      data: template,
      llmMessages,
    };
  };
