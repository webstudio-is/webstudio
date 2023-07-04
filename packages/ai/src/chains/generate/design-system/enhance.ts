import type { Model as BaseModel } from "../../../models/types";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { type Chain, type ChainMessage } from "../../types";
import { prompt as promptTemplate } from "./__generated__/enhance.prompt";
// import { prompt as promptSystemTemplate } from "./__generated__/enhance.system.prompt";
// import { prompt as promptUserTemplate } from "./__generated__/enhance.user.prompt";

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

    // const systemMessage: ChainMessage = [
    //   "system",
    //   formatPrompt(prompts, promptSystemTemplate),
    // ];

    // const requestMessage: ChainMessage = [
    //   "user",
    //   formatPrompt(prompts, promptUserTemplate),
    // ];

    // const messages = model.generateMessages([systemMessage, requestMessage]);

    // console.log(JSON.stringify(messages, null, 2));

    // const response = await model.request({
    //   messages,
    // });

    const code = getCode(response, "json");

    return {
      llmMessages: [[requestMessage, ["assistant", response]]],
      code: [code],
      json: [JSON.parse(code)],
    };
  };
