import { z } from "zod";

export const basicAuthInput = z.union([
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

export type BasicAuthInput = z.infer<typeof basicAuthInput>;

export const wsAuthConfig = z.object({
  version: z.literal(1),
  routes: z.record(z.string(), basicAuthInput),
});
export type WsAuthConfig = z.infer<typeof wsAuthConfig>;
