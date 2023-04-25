import { parseJsx } from "@builder.io/mitosis";
import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import type { Model as BaseModel } from "../../../models/types";
import { getCode, mitosisJSONToWsEmbedTemplate } from "../../../post-process";
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

    const jsx = getCode(response, "jsx");

    const parsed = parseJsx(
      `export default function App() {\n return ${jsx}\n}`,
      {
        typescript: false,
      }
    );

    const json = JSON.parse(
      mitosisJSONToWsEmbedTemplate()({ component: parsed })
    );

    // @todo if there are Image instances with alt attribute
    // use the alt to get random images from upslash
    // https://source.unsplash.com/random/?<query>&w=960

    try {
      // validate the template
      WsEmbedTemplate.parse(json);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(error);
      }
      throw new Error("Invalid instances generation");
    }

    return {
      llmMessages: [[...messages, ["assistant", response]]],
      code: [jsx],
      json: [json],
    };
  };
