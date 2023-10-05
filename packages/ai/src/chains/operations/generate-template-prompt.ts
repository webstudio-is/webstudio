import { z } from "zod";

// Currently this operation is used to prepare a context for the insert-template operations.
// insert-template is processed as a regular chain in a separate LLM call. This is to produce better results.

const wsId = z
  .string()
  .describe(
    "Add the generated code to the element with this data-ws-id. Don't use element names for this value."
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
});
export type aiOperation = z.infer<typeof aiOperation>;

export const wsOperation = aiOperation;
export type wsOperation = z.infer<typeof wsOperation>;

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => operation;
