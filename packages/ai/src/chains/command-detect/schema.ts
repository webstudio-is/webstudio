import { z } from "zod";

export const name = "command-detect";

export const ContextSchema = z.object({
  // The prompt provides the original user request.
  prompt: z.string(),
  // Command name - description pairs.
  commands: z.record(z.string(), z.string()),
});
export type Context = z.infer<typeof ContextSchema>;

export const ResponseSchema = z.array(z.string());
export type Response = z.infer<typeof ResponseSchema>;
