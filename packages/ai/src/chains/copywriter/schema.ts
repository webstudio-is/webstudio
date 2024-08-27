import { z } from "zod";

export const name = "copywriter";

export const TextInstance = z.object({
  instanceId: z.string(),
  index: z.number(),
  type: z.union([
    z.literal("Heading"),
    z.literal("Paragraph"),
    z.literal("Text"),
  ]),
  text: z.string(),
});

export type TextInstance = z.infer<typeof TextInstance>;

export const Context = z.object({
  // The prompt provides context about the copy to generate and comes from the user.
  prompt: z.string(),
  // An array of text nodes to generate copy for.
  textInstances: z.array(TextInstance),
});
export type Context = z.infer<typeof Context>;

export const Response = z.array(TextInstance);
export type Response = z.infer<typeof Response>;
