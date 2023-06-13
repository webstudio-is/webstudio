import { parseCss } from "@webstudio-is/css-data";
import type { Model as BaseModel } from "../../../models/types";
import { findById } from "../../../utils/find-by-id";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { getPalette, rgbaToHex } from "../../../utils/get-palette";
import { type Chain, type ChainMessage, type ElementType } from "../../types";
import { prompt as palettePromptTemplate } from "../palette/__generated__/generate.prompt";
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

    // Prepare prompt variables...
    if (prompts.style) {
      prompts.style = `in ${prompts.style.replace(/https?:\/\//, "")} style.`;
    }

    if (prompts.components) {
      prompts.components = JSON.parse(prompts.components)
        .map((name: string) => `\t | "${name}"`)
        .join("\n");
    }

    prompts.selectedInstance =
      rootInstance.component === "Body"
        ? ""
        : `- The root instance's componens it \`${rootInstance.component}\``;

    const { palette, colorMode } = getPalette(
      build.styles.map(([name, value]) => value)
    );

    prompts.palette = palette.join(", ");
    prompts.colorMode = colorMode;

    if (prompts.palette === "") {
      console.log("Generating palette");
      const paletteRequestMessages = model.generateMessages([
        ["user", formatPrompt(prompts, palettePromptTemplate)],
      ]);

      try {
        const response = await model.request({
          messages: paletteRequestMessages,
        });

        const { palette, colorMode } = JSON.parse(getCode(response, "json"));

        if (palette) {
          prompts.palette = palette.map(rgbaToHex).join(", ");
        }

        if (colorMode) {
          prompts.colorMode = colorMode;
        }

        console.log({ prompts });
      } catch (error) {
        prompts.palette = "generate an aesthetically pleasing one.";
      }
    }

    const userMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    const requestMessages = model.generateMessages([...messages, userMessage]);

    console.log({ requestMessages });

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
