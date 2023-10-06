import { z } from "zod";
import { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import { parseTailwindToWebstudio } from "@webstudio-is/css-data";

const wsId = z
  .string()
  .describe("The element's ws-id that must get the new styles");

export const aiOperation = z.object({
  operation: z.literal("editStylesWithTailwindCSS"),
  wsIds: z.array(wsId),
  className: z
    .string()
    .describe(
      "A list of Tailwind CSS classes to add or override existing styles"
    ),
});
export type aiOperation = z.infer<typeof aiOperation>;

export const wsOperation = z.object({
  operation: z.literal("applyStyles"),
  instanceIds: z.array(wsId),
  styles: z.array(EmbedTemplateStyleDecl),
});
export type wsOperation = z.infer<typeof wsOperation>;

export const aiOperationToWs = async (
  operation: aiOperation
): Promise<wsOperation> => {
  if (operation.className === "") {
    throw new Error("Invalid response");
  }
  const styles = await parseTailwindToWebstudio(operation.className);
  return {
    operation: "applyStyles",
    instanceIds: operation.wsIds,
    styles: styles,
  };
};
