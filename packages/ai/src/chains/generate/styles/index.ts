import { parseCss, type RgbValue } from "@webstudio-is/css-data";
import type { Model as BaseModel } from "../../../models/types";
import { findById } from "../../../utils/find-by-id";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { getPalette, rgbaToHex } from "../../../utils/get-palette";
import { type Chain, type ChainMessage, type ElementType } from "../../types";
import { prompt as palettePromptTemplate } from "../palette/__generated__/pick.prompt";
import { colors } from "../palette/colors";
import { gradients } from "../palette/gradients";
import { prompt as themePromptTemplate } from "../theme/__generated__/generate.prompt";
import { themeDefaults } from "../theme/theme-defaults";
import { prompt as promptTemplate } from "./__generated__/generate.prompt";

export const create = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>
> =>
  async function chain({ model, context }) {
    const { prompts, messages, api, projectId, buildId, instanceId } = context;

    const build = await api.getBuild({ projectId, buildId });

    type InstanceType = ElementType<typeof build.instances>[1];
    const rootInstance = findById<InstanceType>(build.instances, instanceId);

    if (rootInstance === undefined) {
      throw new Error("Instance does not exist");
    }

    if (prompts.components) {
      prompts.components = JSON.parse(prompts.components).join(", ");
      // .map((name: string) => ` - ${name}`)
      // .join("\n");
    }

    prompts.selectedInstance =
      rootInstance.component === "Body"
        ? ""
        : `- The selected instance component is \`${rootInstance.component}\``;

    const themeMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, themePromptTemplate),
    ];

    const themeRequestMessages = model.generateMessages([themeMessage]);

    const themeResponse = await model.request({
      messages: themeRequestMessages,
    });

    const { colorMode, theme } = JSON.parse(getCode(themeResponse, "json"));

    prompts.colorMode = colorMode;
    prompts.theme = JSON.stringify({ ...themeDefaults, ...theme });

    const userMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    console.log(userMessage[1]);

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
