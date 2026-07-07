import { z } from "zod";

const styleSourceId = z.string();

const styleSourceToken = z.object({
  type: z.literal("token"),
  id: styleSourceId,
  name: z.string(),
  locked: z.boolean().optional(),
});

export type StyleSourceToken = z.infer<typeof styleSourceToken>;

const styleSourceLocal = z.object({
  type: z.literal("local"),
  id: styleSourceId,
});

export const styleSource = z.union([styleSourceToken, styleSourceLocal]);

export type StyleSource = z.infer<typeof styleSource>;

export const styleSources = z.map(styleSourceId, styleSource);

export type StyleSources = z.infer<typeof styleSources>;
