import { z } from "zod";
import type { Model as BaseModel, ModelMessage, Chain } from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/template-generator.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/template-generator.user.prompt";
import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { jsxToWSEmbedTemplate } from "../../utils/jsx";
import { tailwindToWebstudio } from "../../utils/tw-to-ws";
import { traverseTemplate } from "../../utils/traverse-template";
import { getIcon } from "../../utils/get-icon";

/**
 * Template Generator Chain.
 *
 * Given a UI section or widget description, this chain generates a Webstudio Embed Template representing the UI.
 */

export const ContextSchema = z.object({
  // The prompt provides the original user request.
  prompt: z.string().max(1200),
  components: z.array(z.string()),
});
export type Context = z.infer<typeof ContextSchema>;

export const ResponseSchema = WsEmbedTemplate;
export type Response = z.infer<typeof ResponseSchema>;

export const createChain = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>,
  Context,
  Response
> =>
  async function chain({ model, context }) {
    const { prompt, components } = context;

    const systemMessage: ModelMessage = [
      "system",
      formatPrompt(
        {
          components: components
            .map((name) =>
              name.replace(
                "@webstudio-is/sdk-components-react-radix:",
                "Radix."
              )
            )
            .join(", "),
        },
        promptSystemTemplate
      ),
    ];

    const userMessage: ModelMessage = [
      "user",
      formatPrompt({ prompt }, promptUserTemplate),
    ];

    const messages = model.generateMessages([systemMessage, userMessage]);

    const completion = await model.request({
      messages,
    });

    if (completion.success === false) {
      return completion;
    }

    const completionText = completion.choices[0];

    let template: WsEmbedTemplate;

    try {
      template = jsxToWSEmbedTemplate(completionText);
    } catch (error) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: "Failed to parse the completion",
      };
    }

    try {
      await tailwindToWebstudio(template);
    } catch (error) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: "Failed to parse styles",
      };
    }

    traverseTemplate(template, (node) => {
      if (node.type === "instance") {
        if (node.component.startsWith("Radix.")) {
          node.component = node.component.replace(
            "Radix.",
            "@webstudio-is/sdk-components-react-radix:"
          );
        }

        if (node.component === "Heroicon") {
          if (Array.isArray(node.props)) {
            const nameProp = node.props.find((prop) => prop.name === "name");
            const typeProp = node.props.find((prop) => prop.name === "type");

            const name =
              nameProp && nameProp.type === "string" ? nameProp.value : null;

            const type =
              typeProp &&
              typeProp.type === "string" &&
              (typeProp.value === "outline" || typeProp.value === "solid")
                ? typeProp.value
                : "solid";

            const icon = name ? getIcon(name, type) : null;

            if (icon === null) {
              node.component = "Text";
              node.children = [
                { type: "text", value: name ? `Icon ${name}` : "Icon" },
              ];
            } else {
              node.component = "HtmlEmbed";

              node.label = `${name} icon`;

              node.props = [
                {
                  type: "string",
                  name: "code",
                  value: icon || "",
                },
              ];
            }
          } else {
            node.component = "Text";
            node.children = [{ type: "text", value: "Icon" }];
          }
        }
      }
    });

    // Validate parsed completion.
    if (
      template.length === 0 ||
      WsEmbedTemplate.safeParse(template).success === false
    ) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: "Invalid completion",
      };
    }

    return {
      success: true,
      tokens: completion.tokens.prompt + completion.tokens.completion,
      data: template,
      llmMessages: [],
    };
  };
