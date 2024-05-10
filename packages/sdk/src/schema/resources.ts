import { z } from "zod";

const ResourceId = z.string();

const Method = z.union([
  z.literal("get"),
  z.literal("post"),
  z.literal("put"),
  z.literal("delete"),
]);

const Header = z.object({
  name: z.string(),
  // expression
  value: z.string(),
});

export const Resource = z.object({
  id: ResourceId,
  name: z.string(),
  method: Method,
  // expression
  url: z.string(),
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
  headers: z.array(Header),
  body: z.optional(z.unknown()),
});

export type ResourceRequest = z.infer<typeof ResourceRequest>;

export const Resources = z.map(ResourceId, Resource);

export type Resources = z.infer<typeof Resources>;

const LOCAL_RESOURCE_PREFIX = "$resources";

/**
 * Prevents fetch cycles by prefixing local resources.
 */
export const isLocalResource = (pathname: string, resourceName?: string) => {
  const segments = pathname.split("/").filter(Boolean);

  if (resourceName === undefined) {
    return segments[0] === LOCAL_RESOURCE_PREFIX;
  }

  return segments.join("/") === `${LOCAL_RESOURCE_PREFIX}/${resourceName}`;
};

export const sitemapResourceUrl = `/${LOCAL_RESOURCE_PREFIX}/sitemap.xml`;
