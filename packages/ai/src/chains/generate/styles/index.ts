import { parseCss } from "@webstudio-is/css-data";
import type { Model as BaseModel } from "../../../models/types";
import { getCode } from "../../../post-process";
import { formatPrompt } from "../../format-prompt";
import { type Chain, type ChainMessage } from "../../types";
import { prompt as promptTemplate } from "./__generated__/generate.prompt";

export const create = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>
> =>
  async function chain({ model, context }) {
    const { prompts, messages } = context;

    if (prompts.style) {
      prompts.style = `in ${prompts.style.replace(/https?:\/\//, "")} style.`;
    }

    const userMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    const requestMessages = model.generateMessages([...messages, userMessage]);

    const response = await model.request({
      messages: requestMessages,
    });

    const css = getCode(response, "css");

    const json = parseCss(css);

    return {
      llmMessages: [[...messages, ["assistant", response]]],
      code: [css],
      json: [json],
    };
  };
