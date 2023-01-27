import { z } from "zod";

const StyleSourcesToken = z.object({
  type: z.literal("token"),
  id: z.string(),
  treeId: z.string().optional(),
  name: z.string(),
});

const StyleSourcesLocal = z.object({
  type: z.literal("local"),
  id: z.string(),
  treeId: z.string(),
  name: z.string(),
});

export const StyleSourcesItem = z.union([StyleSourcesToken, StyleSourcesLocal]);

export type StyleSourcesItem = z.infer<typeof StyleSourcesItem>;

export const StyleSources = z.array(StyleSourcesItem);

export type StyleSources = z.infer<typeof StyleSources>;

export const StyleRefsItem = z.object({
  instanceId: z.string(),
  values: z.array(z.string()),
});

export type StyleRefsItem = z.infer<typeof StyleRefsItem>;

export const StyleRefs = z.array(StyleRefsItem);

export type StyleRefs = z.infer<typeof StyleRefs>;
