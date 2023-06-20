import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import type { Model as BaseModel } from "../../../models/types";
import { findById } from "../../../utils/find-by-id";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { getPalette } from "../../../utils/get-palette";
import {
  collectDescriptions,
  generateImagesUrls,
  insertImagesUrls,
} from "../../../utils/images";
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
      prompts.style = `- The result style should be influenced by: ${prompts.style.replace(
        /https?:\/\//,
        ""
      )}`;
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

    prompts.palette =
      palette.join(", ") || "generate an aesthetically pleasing one.";
    prompts.colorMode = colorMode;

    const userMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    console.log(userMessage[1]);

    const requestMessages = model.generateMessages([...messages, userMessage]);

    const response = await model.request({
      messages: requestMessages,
    });

    const jsx = getCode(response, "jsx");

    let json;

    try {
      json = jsxToWSEmbedTemplate(jsx, { parseStyles: false });
    } catch (error) {
      console.log({ jsx });
      throw error;
    }

    // @todo if there are Image instances with alt attribute
    // try {
    //   const descriptions = collectDescriptions(json);
    //   console.log({ descriptions });
    //   const imageUrls = await Promise.all(
    //     descriptions.map((description) => model.generateImage(description))
    //   );
    //   console.log(descriptions, imageUrls);
    //   // generateImagesUrls(descriptions, model.generateImages);
    //   insertImagesUrls(json, descriptions, imageUrls);
    // } catch (error) {
    //   console.log("image generation failed", error);
    // }

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
