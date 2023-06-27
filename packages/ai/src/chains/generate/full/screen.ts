import {
  EmbedTemplateInstance,
  WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import type { Model as BaseModel } from "../../../models/types";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import {
  collectDescriptions,
  generateImagesUrlsUnsplash,
  insertImagesUrls,
} from "../../../utils/images";
import { jsxToWSEmbedTemplate } from "../../../utils/jsx";
import { traverseTemplate } from "../../../utils/traverse-template";
import { type Chain, type ChainMessage } from "../../types";
import { prompt as promptTemplate } from "./__generated__/screen.prompt";

export const create = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>
> =>
  async function chain({ model, context }) {
    const { prompts } = context;

    // Prepare prompt variables...
    if (prompts.style) {
      prompts.style = `- The result style should be influenced by: ${prompts.style.replace(
        /https?:\/\//,
        ""
      )}`;
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

    const response = await model.request({
      messages: model.generateMessages([requestMessage]),
    });

    const jsx = getCode(response, "jsx");

    let json;

    try {
      json = jsxToWSEmbedTemplate(jsx, { parseStyles: false });
    } catch (error) {
      console.log({ jsx });
      throw error;
    }

    try {
      // validate the template
      WsEmbedTemplate.parse(json);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log(jsx);
        // console.error(error);
      }
      throw new Error("FAILED BEFORE: Invalid template generation");
    }

    let componentsStyles = {};
    try {
      componentsStyles = JSON.parse(prompts.componentsStyles);
    } catch (error) {}

    // Apply component base styles.
    traverseTemplate(json, (node) => {
      if (node.type === "instance") {
        const nodeBaseStyles: EmbedTemplateInstance["styles"] =
          componentsStyles[node.component];

        if (nodeBaseStyles) {
          const customStylesProperties = new Set(
            (node.styles || []).map((s) => s.property)
          );
          nodeBaseStyles.forEach((decl) => {
            if (customStylesProperties.has(decl.property) === false) {
              if (node.styles === undefined) {
                node.styles = [];
              }

              node.styles.push(decl);
            }
          });
        }
      }
    });

    // Insert generated images.
    try {
      const descriptions = collectDescriptions(json);
      const imageUrls = await generateImagesUrlsUnsplash(descriptions);
      insertImagesUrls(json, descriptions, imageUrls);
    } catch (error) {
      console.log("image generation failed", error);
    }

    try {
      // validate the template
      WsEmbedTemplate.parse(json);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(json));
        // console.error(error);
      }
      throw new Error("FAILED AFTER: Invalid template generation");
    }

    return {
      llmMessages: [[requestMessage, ["assistant", response]]],
      code: [jsx],
      json: [json],
    };
  };
