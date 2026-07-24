import { z } from "zod";

const resourceId = z.string();

const method = z.union([
  z.literal("get"),
  z.literal("post"),
  z.literal("put"),
  z.literal("delete"),
]);

export const resource = z.object({
  id: resourceId,
  name: z.string(),
  control: z.optional(z.union([z.literal("system"), z.literal("graphql")])),
  method: method,
  // expression
  url: z.string(),
  searchParams: z
    .array(
      z.object({
        name: z.string(),
        // expression
        value: z.string(),
      })
    )
    .optional(),
  headers: z.array(
    z.object({
      name: z.string(),
      // expression
      value: z.string(),
    })
  ),
  // expression
  body: z.optional(z.string()),
});

export type Resource = z.infer<typeof resource>;

// evaluated variant of resource
export const resourceRequest = z.object({
  name: z.string(),
  control: z.optional(z.union([z.literal("system"), z.literal("graphql")])),
  method: method,
  url: z.string(),
  searchParams: z.array(
    z.object({
      name: z.string(),
      // can be string or object which should be serialized
      value: z.unknown(),
    })
  ),
  headers: z.array(
    z.object({
      name: z.string(),
      // can be string or object which should be serialized
      value: z.unknown(),
    })
  ),
  body: z.optional(z.unknown()),
});

export type ResourceRequest = z.infer<typeof resourceRequest>;

export const resources = z.map(resourceId, resource);

export type Resources = z.infer<typeof resources>;
