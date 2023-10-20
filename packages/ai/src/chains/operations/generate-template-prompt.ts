import { z } from "zod";
import { idAttribute } from "@webstudio-is/react-sdk";

// Currently this operation is used to prepare a context for the insert-template operations.
// insert-template is processed as a regular chain in a separate LLM call. This is to produce better results.

export const name = "generate-template-prompt";

const wsId = z
  .string()
  .describe(
    `The ${idAttribute} value of the host element. The result will  be added to this element.`
  );

export const aiOperation = z.object({
  operation: z
    .literal("generateTemplatePrompt")
    .describe(
      "Provides instructions to LLM on how to generate new user interface elements and where to insert them"
    ),
  addTo: wsId,
  addAtIndex: z
    .number()
    .describe("The index at which the new instance must be inserted"),
  llmPrompt: z
    .string()
    .describe(
      `Enhanced user prompt from this chat. The description will be passed to another LLM to generate a user interface with JSX.`
    ),
  classNames: z
    .string()
    .optional()
    .describe(
      "A list of suggested Tailwind CSS classes matching the style of the request code. Always use the square brackets notation eg. mb-[10px] instead of mb-10"
    ),
});
export type aiOperation = z.infer<typeof aiOperation>;

export const wsOperation = aiOperation;
export type wsOperation = z.infer<typeof wsOperation>;

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => operation;
