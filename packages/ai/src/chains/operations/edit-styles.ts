import { z } from "zod";
import { EmbedTemplateStyleDecl } from "@webstudio-is/sdk";
import { idAttribute } from "@webstudio-is/react-sdk";

export const name = "edit-styles";

const wsId = z
  .string()
  .describe(`The ${idAttribute} value of the element being edited.`);

export const aiOperation = z.object({
  operation: z.literal("editStylesWithTailwindCSS"),
  wsIds: z.array(wsId),
  className: z
    .string()
    .describe(
      "A list of Tailwind CSS classes to add or override existing styles. Always use the square brackets notation eg. mb-[10px] instead of mb-10"
    ),
});
export type aiOperation = z.infer<typeof aiOperation>;

export const wsOperation = z.object({
  operation: z.literal("applyStyles"),
  instanceIds: z.array(wsId),
  styles: z.array(EmbedTemplateStyleDecl),
});
export type wsOperation = z.infer<typeof wsOperation>;
