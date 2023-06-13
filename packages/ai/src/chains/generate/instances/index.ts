import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import type { Model as BaseModel } from "../../../models/types";
import { findById } from "../../../utils/find-by-id";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { getPalette } from "../../../utils/get-palette";
import { jsxToWSEmbedTemplate } from "../../../utils/jsx";
import { traverseTemplate } from "../../../utils/traverse-template";
import { type Chain, type ChainMessage, type ElementType } from "../../types";
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

    prompts.palette =
      palette.join(", ") || "generate an aesthetically pleasing one.";
    prompts.colorMode = colorMode;

    const userMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    console.log({ userMessage });

    const requestMessages = model.generateMessages([...messages, userMessage]);

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
