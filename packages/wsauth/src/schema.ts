import { z } from "zod";

export const basicAuthInputSchema = z.union([
  z.object({
    method: z.literal("basic"),
    login: z.string(),
    password: z.string(),
  }),
  z.object({
    type: z.literal("basic"),
    login: z.string(),
    password: z.string(),
  }),
]);

export type BasicAuthInput = z.infer<typeof basicAuthInputSchema>;

export const wsAuthConfigSchema = z.object({
  version: z.literal(1),
  routes: z.record(basicAuthInputSchema),
});
export type WsAuthConfig = z.infer<typeof wsAuthConfigSchema>;
