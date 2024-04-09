import { z } from "zod";
import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/copy.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/copy.user.prompt";
import { createErrorResponse } from "../../utils/create-error-response";
import type { RemixStreamingTextResponse } from "../../utils/remix-streaming-text-response";
import { type Context, name, TextInstanceSchema } from "./schema";

export { collectTextInstances } from "./schema";

export { name };

export const createChain = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>,
  Context,
  RemixStreamingTextResponse
> =>
  async function chain({ model, context }) {
    const { prompt, textInstances } = context;

    if (textInstances.length === 0) {
      const message = "No text nodes found for the instance";
      return {
        id: name,
        ...createErrorResponse({
          status: 404,
          error: "ai.copywriter.textNodesNotFound",
          message,
          debug: message,
        }),
        llmMessages: [],
      };
    }

    if (
      z.array(TextInstanceSchema).safeParse(textInstances).success === false
    ) {
      const message = "Invalid nodes list";
      return {
        id: name,
        ...createErrorResponse({
          status: 404,
          error: `ai.${name}.parseError`,
          message,
          debug: message,
        }),
        llmMessages: [],
      };
    }

    const llmMessages: ModelMessage[] = [
      ["system", promptSystemTemplate],
      [
        "user",
        formatPrompt(
          {
            prompt,
            text_nodes: JSON.stringify(textInstances),
          },
          promptUserTemplate
        ),
      ],
    ];

    const messages = model.generateMessages(llmMessages);

    const response = await model.completionStream({
      id: name,
      messages,
    });

    return {
      ...response,
      llmMessages,
    };
  };
