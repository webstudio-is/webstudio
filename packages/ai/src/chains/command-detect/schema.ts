import { z } from "zod";

export const name = "command-detect";

export const Context = z.object({
  // The prompt provides the original user request.
  prompt: z.string(),
  // Command name - description pairs.
  commands: z.record(z.string(), z.string()),
});
export type Context = z.infer<typeof Context>;

export const Response = z.array(z.string());
export type Response = z.infer<typeof Response>;
