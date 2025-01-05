import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/template-generator.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/template-generator.user.prompt";
import { WsEmbedTemplate } from "@webstudio-is/sdk";
import {
  jsxToTemplate,
  postProcessTemplate,
} from "../../utils/jsx-to-template.server";
import { createErrorResponse } from "../../utils/create-error-response";
import { getCode } from "../../utils/get-code";
import { type Context, type Response, name } from "./schema";

/**
 * Template Generator Chain.
 *
 * Given a UI section or widget description, this chain generates a Webstudio Embed Template representing the UI.
 */

export { name };

export const createChain = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>,
  Context,
  Response
> =>
  async function chain({ model, context }) {
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

    let template: WsEmbedTemplate;

    try {
      template = await jsxToTemplate(getCode(completionText, "jsx"));
    } catch (error) {
      const debug = `Failed to parse the completion error="${
        error instanceof Error ? error.message : ""
      }" completionText="${completionText}"`.trim();
      return {
        id: name,
        ...createErrorResponse({
          status: 500,
          message: debug,
          debug,
        }),
        llmMessages,
      };
    }

    try {
      postProcessTemplate(template, components);
    } catch (error) {
      const debug = (
        "Invalid completion " + (error instanceof Error ? error.message : "")
      ).trim();

      return {
        id: name,
        ...createErrorResponse({
          status: 500,
          message: debug,
          debug,
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
