import { z } from "zod";
import type {
  Model as BaseModel,
  ModelMessage,
  ChainStream,
} from "../../types";
import { formatPrompt } from "../../utils/format-prompt";
import { prompt as promptSystemTemplate } from "./__generated__/copy.system.prompt";
import { prompt as promptUserTemplate } from "./__generated__/copy.user.prompt";
import type { Instance, Instances } from "@webstudio-is/sdk";

/**
 * Copywriter chain.
 *
 * Given a description and an instance id,
 * this chain generates copy for the instance and all its descendant text nodes.
 */

export const TextInstanceSchema = z.object({
  instanceId: z.string(),
  index: z.number(),
  type: z.union([
    z.literal("Heading"),
    z.literal("Paragraph"),
    z.literal("Text"),
  ]),
  text: z.string(),
});

export type TextInstance = z.infer<typeof TextInstanceSchema>;

export const ContextSchema = z.object({
  // The prompt provides context about the copy to generate and comes from the user.
  prompt: z.string().max(1200),
  // An array of text nodes to generate copy for.
  textInstances: z.array(TextInstanceSchema),
});
export type Context = z.infer<typeof ContextSchema>;

export const ResponseSchema = z.array(TextInstanceSchema);
export type Response = z.infer<typeof ResponseSchema>;

export const createChain = <ModelMessageFormat>(): ChainStream<
  BaseModel<ModelMessageFormat>,
  Context
> =>
  async function chain({ model, context }) {
    const { prompt, textInstances } = context;

    if (textInstances.length === 0) {
      return {
        success: false,
        type: "genericError",
        status: 404,
        message: "No text nodes found for the instance",
      };
    }

    try {
      z.array(TextInstanceSchema).parse(textInstances);
    } catch (error) {
      return {
        success: false,
        type: "parseError",
        status: 500,
        message: "Invalid text nodes list",
      };
    }

    const systemMessage: ModelMessage = ["system", promptSystemTemplate];

    const userMessage: ModelMessage = [
      "user",
      formatPrompt(
        {
          prompt,
          text_nodes: JSON.stringify(textInstances),
        },
        promptUserTemplate
      ),
    ];

    const messages = model.generateMessages([systemMessage, userMessage]);

    return model.requestStream({
      messages,
    });
  };

export const collectTextInstances = ({
  instances,
  rootInstanceId,
  textComponents = new Set(["Heading", "Paragraph", "Text"]),
}: {
  instances: Instances;
  rootInstanceId: Instance["id"];
  textComponents?: Set<string>;
}) => {
  const textInstances: TextInstance[] = [];

  const rootInstance = instances.get(rootInstanceId);

  if (rootInstance === undefined) {
    return textInstances;
  }

  const nodeType =
    rootInstance.component === "Heading" ||
    rootInstance.component === "Paragraph"
      ? rootInstance.component
      : "Text";

  // Instances can have a number of text child nodes without interleaving components.
  // When this is the case we treat the child nodes as a single text node,
  // otherwise the AI would generate children.length chunks of separate text.
  // To signal that a textInstance is "joint" we set the index to -1.
  if (rootInstance.children.every((child) => child.type === "text")) {
    textInstances.push({
      instanceId: rootInstanceId,
      index: -1,
      type: nodeType,
      text: rootInstance.children.map((child) => child.value).join(" "),
    });
  } else {
    rootInstance.children.forEach((child, index) => {
      if (child.type === "text") {
        if (textComponents.has(rootInstance.component)) {
          textInstances.push({
            instanceId: rootInstanceId,
            index,
            type: nodeType,
            text: child.value,
          });
        }
      } else if (child.type === "id") {
        textInstances.push(
          ...collectTextInstances({
            instances,
            rootInstanceId: child.value,
            textComponents,
          })
        );
      }
    });
  }

  return textInstances;
};
