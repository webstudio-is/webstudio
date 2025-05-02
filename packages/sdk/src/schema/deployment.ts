import { z } from "zod";

export const Templates = z.enum([
  "docker",
  "vercel",
  "netlify",
  "ssg",
  "ssg-netlify",
  "ssg-vercel",
]);

export type Templates = z.infer<typeof Templates>;

export const Deployment = z.union([
  z.object({
    destination: z.literal("static"),
    name: z.string(),
    assetsDomain: z.string(),
    // Must be validated very strictly
    templates: z.array(Templates),
  }),
  z.object({
    destination: z.literal("saas").optional(),
    domains: z.array(z.string()),
    assetsDomain: z.string().optional(),
    /**
     * @deprecated This field is deprecated, use `domains` instead.
     */
    projectDomain: z.string().optional(),
    excludeWstdDomainFromSearch: z.boolean().optional(),
  }),
]);

export type Deployment = z.infer<typeof Deployment>;
