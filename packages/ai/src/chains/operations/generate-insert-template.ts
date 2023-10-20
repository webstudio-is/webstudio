import { z } from "zod";
import { WsEmbedTemplate, idAttribute } from "@webstudio-is/react-sdk";
import { jsxToTemplate } from "../../utils/jsx-to-template.server";

// Currently this operation is used is a separate LLM call after the main one has returned an insert-instance operation. This is to produce better results.
// Effectively the aiOperation from this module is not used. The separate chain will call the LLM and we use the resulting completion to construct an aiOperation by hand
// and pass it to this file's aiOperationToWs, replacing the initial insert-instance operation.

export const name = "generate-insert-template";

const wsId = z
  .string()
  .describe(
    `The ${idAttribute} value of the host element. The result will  be added to this element.`
  );

export const aiOperation = z.object({
  operation: z
    .literal("generateInstanceWithTailwindStyles")
    .describe(
      "Using the provided components, it generates a high-end beautiful UI as JSX. Eg <Box><Heading>Hi</Heading></Box> The JSX to insert. Every JSX element must be styled with Tailwind CSS. For icons use the Heroicon component setting a name prop and a type one that can be solid or outline. For images set an alt text for screen readers, width and height props but omit the src prop. Exclusively use the following components: ```{components}```"
    ),
  addTo: wsId,
  addAtIndex: z
    .number()
    .describe("The index at which the new instance must be inserted"),
  jsx: z.string().describe(`The generated JSX`),
});
export type aiOperation = z.infer<typeof aiOperation>;

export const wsOperation = z.object({
  operation: z.literal("insertTemplate"),
  addTo: wsId,
  addAtIndex: z.number(),
  template: WsEmbedTemplate,
});
export type wsOperation = z.infer<typeof wsOperation>;

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => {
  return {
    operation: "insertTemplate",
    addTo: operation.addTo,
    addAtIndex: operation.addAtIndex,
    template: await jsxToTemplate(operation.jsx),
  };
};
