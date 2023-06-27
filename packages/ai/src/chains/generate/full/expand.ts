import type { Model as BaseModel } from "../../../models/types";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { type Chain, type ChainMessage } from "../../types";
import { prompt as promptTemplate } from "./__generated__/expand.prompt";

export const create = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>
> =>
  async function chain({ model, context }) {
    const { prompts } = context;

    const requestMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    console.log(requestMessage[1]);

    const response = await model.request({
      messages: model.generateMessages([requestMessage]),
    });

    const code = getCode(response, "json");

    return {
      llmMessages: [[requestMessage, ["assistant", response]]],
      code: [code],
      json: [JSON.parse(code)],
    };
  };
