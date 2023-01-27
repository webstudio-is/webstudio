import { z } from "zod";

const StyleSourceToken = z.object({
  type: z.literal("token"),
  id: z.string(),
  treeId: z.string().optional(),
  name: z.string(),
});

const StyleSourceLocal = z.object({
  type: z.literal("local"),
  id: z.string(),
  treeId: z.string(),
  name: z.string(),
});

export const StyleSource = z.union([StyleSourceToken, StyleSourceLocal]);

export type StyleSource = z.infer<typeof StyleSource>;

export const StyleSources = z.array(StyleSource);

export type StyleSources = z.infer<typeof StyleSources>;

export const StyleSourceSelection = z.object({
  instanceId: z.string(),
  values: z.array(z.string()),
});

export type StyleSourceSelection = z.infer<typeof StyleSourceSelection>;

export const StyleSourceSelections = z.array(StyleSourceSelection);

export type StyleSourceSelections = z.infer<typeof StyleSourceSelections>;
