import { z } from "zod";
import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/template-generator.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/template-generator.user.prompt";
import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import {
  jsxToTemplate,
  postProcessTemplate,
} from "../../utils/jsx-to-template.server";
import { createErrorResponse } from "../../utils/create-error-response";
import { getCode } from "../../utils/get-code";

/**
 * Template Generator Chain.
 *
 * Given a UI section or widget description, this chain generates a Webstudio Embed Template representing the UI.
 */

export const ContextSchema = z.object({
  // The prompt provides the original user request.
  prompt: z.string(),
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
    const id = "template-generator";

    const { prompt, components } = context;

    const llmMessages: ModelMessage[] = [
      [
        "system",
        formatPrompt(
          {
            components: components.join(", "),
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

    let template: WsEmbedTemplate;

    try {
      template = await jsxToTemplate(getCode(completionText, "jsx"));
    } catch (error) {
      return {
        id,
        ...createErrorResponse({
          status: 500,
          debug: (
            "Failed to parse the completion " +
            (error instanceof Error ? error.message : "")
          ).trim(),
        }),
        llmMessages,
      };
    }

    try {
      postProcessTemplate(template, components);
    } catch (error) {
      return {
        id,
        ...createErrorResponse({
          status: 500,
          debug: (
            "Invalid completion " +
            (error instanceof Error ? error.message : "")
          ).trim(),
        }),
        llmMessages,
      };
    }

    return {
      ...completion,
      data: template,
      llmMessages,
    };
  };
