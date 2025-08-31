import { z } from "zod";

const ResourceId = z.string();

const Method = z.union([
  z.literal("get"),
  z.literal("post"),
  z.literal("put"),
  z.literal("delete"),
]);

const SearchParam = z.object({
  name: z.string(),
  // expression
  value: z.string(),
});

const Header = z.object({
  name: z.string(),
  // expression
  value: z.string(),
});

export const Resource = z.object({
  id: ResourceId,
  name: z.string(),
  control: z.optional(z.union([z.literal("system"), z.literal("graphql")])),
  method: Method,
  // expression
  url: z.string(),
  searchParams: z.array(SearchParam).optional(),
  headers: z.array(Header),
  // expression
  body: z.optional(z.string()),
});

export type Resource = z.infer<typeof Resource>;

// evaluated variant of resource
export const ResourceRequest = z.object({
  id: ResourceId,
  name: z.string(),
  method: Method,
  url: z.string(),
  searchParams: z.array(SearchParam),
  headers: z.array(Header),
  body: z.optional(z.unknown()),
});

export type ResourceRequest = z.infer<typeof ResourceRequest>;

export const Resources = z.map(ResourceId, Resource);

export type Resources = z.infer<typeof Resources>;
