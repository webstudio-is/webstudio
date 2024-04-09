import { z } from "zod";

export const name = "copywriter";

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
  prompt: z.string(),
  // An array of text nodes to generate copy for.
  textInstances: z.array(TextInstanceSchema),
});
export type Context = z.infer<typeof ContextSchema>;

export const ResponseSchema = z.array(TextInstanceSchema);
export type Response = z.infer<typeof ResponseSchema>;
