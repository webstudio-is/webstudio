import { z } from "zod";

export const Deployment = z.union([
  z.object({
    destination: z.literal("static"),
    name: z.string(),
    assetsDomain: z.string(),
    templates: z.array(z.string()),
  }),
  z.object({
    destination: z.literal("saas").optional(),
    domains: z.array(z.string()),
    projectDomain: z.string(),
  }),
]);

export type Deployment = z.infer<typeof Deployment>;
