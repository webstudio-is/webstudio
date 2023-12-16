import { z } from "zod";

const ResourceId = z.string();

export const Resource = z.union([
  // !!! this is prototype only resource type
  // build other resources before exposing to production
  z.object({
    type: z.literal("getjson"),
    id: ResourceId,
    instanceId: z.string(),
    // expression
    url: z.string(),
  }),
  z.never(),
]);

export type Resource = z.infer<typeof Resource>;

export const Resources = z.map(ResourceId, Resource);

export type Resources = z.infer<typeof Resources>;
