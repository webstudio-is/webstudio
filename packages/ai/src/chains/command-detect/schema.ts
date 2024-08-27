import { z } from "zod";

export const name = "command-detect";

export const AiContext = z.object({
  // The prompt provides the original user request.
  prompt: z.string(),
  // Command name - description pairs.
  commands: z.record(z.string(), z.string()),
});
export type AiContext = z.infer<typeof AiContext>;

export const AiResponse = z.array(z.string());
export type AiResponse = z.infer<typeof AiResponse>;
