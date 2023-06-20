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
      prompts.style = `- The result style should be influenced by: ${prompts.style.replace(
        /https?:\/\//,
        ""
      )}`;
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

    const { palette, colorMode } = getPalette(
      build.styles.map(([name, value]) => value)
    );

    prompts.palette = palette.join(", ");
    prompts.colorMode = colorMode;
    prompts.gradients = "";

    if (prompts.palette === "") {
      console.log("Generating palette");
      const paletteMessage: ChainMessage = [
        "user",
        formatPrompt(
          {
            ...prompts,
            colors: colors
              .map(([name, shades]) => `  - ${name}: ${shades.join(", ")}`)
              .join("\n"),
          },
          palettePromptTemplate
        ),
      ];
      console.log(paletteMessage[1]);
      const paletteRequestMessages = model.generateMessages([paletteMessage]);

      try {
        const response = await model.request({
          messages: paletteRequestMessages,
        });

        const { palette, colorMode, gradients } = JSON.parse(
          getCode(response, "json")
        );

        if (palette) {
          prompts.palette = palette.map(rgbaToHex).join(", ");
        }

        if (colorMode) {
          prompts.colorMode = colorMode;
        }

        if (gradients) {
          prompts.gradients =
            `- Available background gradients (color stops sets):\n` +
            // gradients
            //   .sort(() => Math.random() - 0.5)
            //   .slice(0, 4)
            //   .map((g) => `  - ${g}`)
            //   .join("\n");
            (gradients as RgbValue[][])
              .map((colors) => `  - ${colors.map(rgbaToHex).join(", ")}`)
              .join("\n");
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
