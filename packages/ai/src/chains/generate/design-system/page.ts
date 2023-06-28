import {
  EmbedTemplateInstance,
  WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import type { Model as BaseModel } from "../../../models/types";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { convertThemeColorsToRgbValue } from "../../../utils/get-palette";
import {
  collectDescriptions,
  generateImagesUrlsUnsplash,
  insertImagesUrls,
} from "../../../utils/images";
import { jsxToWSEmbedTemplate } from "../../../utils/jsx";
import { traverseTemplate } from "../../../utils/traverse-template";
import { type Chain, type ChainMessage } from "../../types";
import { prompt as promptTemplate } from "./__generated__/page.prompt";
import { componentsStyles } from "./components-styles";

export const create = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>
> =>
  async function chain({ model, context }) {
    const { prompts } = context;

    if (prompts.components) {
      prompts.components = (JSON.parse(prompts.components) as string[])
        .map((componentName, index) => {
          const variants = Object.keys(
            componentsStyles[componentName] || {}
          ).filter((v) => v !== "base");
          if (variants.length > 0) {
            return `- ${componentName}: ${variants.join(", ")}`;
          }
          return `- ${componentName}`;
        })
        .join("\n");
    }

    const theme = JSON.parse(prompts.theme);

    prompts.theme = JSON.stringify(theme.theme);
    prompts.colorMode = theme.colorMode;

    const requestMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    // console.log(requestMessage[1]);

    const response = await model.request({
      messages: model.generateMessages([requestMessage]),
    });

    const jsx = getCode(response, "jsx").trim();

    if (
      jsx === "" ||
      jsx.startsWith("<") === false ||
      jsx.endsWith(">") === false
    ) {
      console.log(response);
      throw new Error("Invalid result");
    }

    let json;

    try {
      json = jsxToWSEmbedTemplate(jsx, { parseStyles: false });
    } catch (error) {
      console.log({ jsx });
      throw error;
    }

    // Resolve base styles, variants and inline styles.
    const actualTheme = convertThemeColorsToRgbValue(theme.theme);
    traverseTemplate(json, (node) => {
      if (node.type === "instance") {
        const variants = ["base"];
        if (node.props) {
          node.props = node.props.filter((prop) => {
            if (prop.name === "variants") {
              variants.push(...(prop.value as string[]));
              return false;
            }
            return true;
          });
        }
        const componentStyles = componentsStyles[node.component];
        if (variants.length > 0 && componentStyles !== undefined) {
          node.styles = node.styles || [];
          const applied = new Set(
            node.styles.map((styleDecl) => styleDecl.property)
          );
          variants
            .reverse()
            .flatMap((variant) =>
              componentStyles[variant]
                ? componentStyles[variant](actualTheme)
                : []
            )
            .forEach((styleDecl) => {
              if (applied.has(styleDecl.property) === false) {
                applied.add(styleDecl.property);
                node.styles.push(styleDecl);
              }
            });
        }
      }
    });

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
