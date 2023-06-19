import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import type { Model as BaseModel } from "../../../models/types";
import { findById } from "../../../utils/find-by-id";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { getPalette, rgbaToHex } from "../../../utils/get-palette";
import { jsxToWSEmbedTemplate } from "../../../utils/jsx";
import { type Chain, type ChainMessage, type ElementType } from "../../types";
import { prompt as palettePromptTemplate } from "../palette/__generated__/generate.prompt";
import { prompt as promptSystem } from "./__generated__/system.prompt";
import { prompt as promptUser } from "./__generated__/user.prompt";

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
      prompts.components = (JSON.parse(prompts.components) as string[])
        .map(
          (componentName, index) =>
            `${index === 0 ? "" : "  "}- ${componentName}`
        )
        .join("\n");
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

    if (prompts.palette === "") {
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
      } catch (error) {
        prompts.palette = "generate an aesthetically pleasing one.";
      }
    }

    const systemMessage: ChainMessage = [
      "system",
      formatPrompt(prompts, promptSystem),
    ];

    console.log(systemMessage[1]);

    const userMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptUser),
    ];

    console.log(userMessage[1]);

    const requestMessages = model.generateMessages([
      ...messages,
      systemMessage,
      userMessage,
    ]);

    const response = await model.request({
      messages: requestMessages,
    });

    const jsx = getCode(response, "jsx");

    const json = jsxToWSEmbedTemplate(jsx);

    // @todo if there are Image instances with alt attribute
    // const descriptions = collectDescriptions(json);
    // const imageUrls = await generateImagesUrls(descriptions);
    // insertImageUrls(json, descriptions, imageUrls);

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
