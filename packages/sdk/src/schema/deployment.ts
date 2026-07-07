import { z } from "zod";

export const templates = z.enum([
  "docker",
  "vercel",
  "netlify",
  "ssg",
  "ssg-netlify",
  "ssg-vercel",
]);

export type Templates = z.infer<typeof templates>;

export const deployment = z.union([
  z.object({
    destination: z.literal("static"),
    name: z.string(),
    assetsDomain: z.string(),
    // Must be validated very strictly
    templates: z.array(templates),
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

export type Deployment = z.infer<typeof deployment>;
