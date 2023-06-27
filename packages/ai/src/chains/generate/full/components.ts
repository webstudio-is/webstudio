import { parseCss } from "@webstudio-is/css-data";
import type { Model as BaseModel } from "../../../models/types";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { type Chain, type ChainMessage } from "../../types";
import { prompt as promptTemplate } from "./__generated__/components.prompt";

export const create = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>
> =>
  async function chain({ model, context }) {
    const { prompts } = context;

    // Prepare prompt variables...
    if (prompts.style) {
      prompts.style = `in ${prompts.style.replace(/https?:\/\//, "")} style.`;
    }

    if (prompts.components) {
      prompts.components = (JSON.parse(prompts.components) as string[])
        .map((componentName, index) => `- ${componentName}`)
        .join("\n");
    }

    const theme = JSON.parse(prompts.theme);

    prompts.theme = JSON.stringify(theme.theme);
    prompts.colorMode = theme.colorMode;

    const requestMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    console.log(requestMessage[1]);

    const requestMessages = model.generateMessages([requestMessage]);

    const response = await model.request({
      messages: requestMessages,
    });

    const css = getCode(response, "css");

    const json = parseCss(css);

    return {
      llmMessages: [[requestMessage, ["assistant", response]]],
      code: [css],
      json: [json],
    };
  };
