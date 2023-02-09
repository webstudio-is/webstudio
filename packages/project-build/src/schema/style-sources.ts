import { z } from "zod";

const StyleSourceId = z.string();

const StyleSourceToken = z.object({
  type: z.literal("token"),
  id: StyleSourceId,
  treeId: z.string().optional(),
  name: z.string(),
});

const StyleSourceLocal = z.object({
  type: z.literal("local"),
  id: StyleSourceId,
  treeId: z.string(),
});

export const StyleSource = z.union([StyleSourceToken, StyleSourceLocal]);

export type StyleSource = z.infer<typeof StyleSource>;

export const StyleSourcesList = z.array(StyleSource);

export type StyleSourcesList = z.infer<typeof StyleSourcesList>;

export const StyleSources = z.map(StyleSourceId, StyleSource);

export type StyleSources = z.infer<typeof StyleSources>;
