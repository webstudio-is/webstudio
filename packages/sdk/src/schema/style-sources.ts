import { z } from "zod";
import { tags } from "../__generated__/tags";

const styleSourceId = z.string();

const styleSourceToken = z.object({
  type: z.literal("token"),
  id: styleSourceId,
  name: z.string(),
  locked: z.boolean().optional(),
});

export type StyleSourceToken = z.infer<typeof styleSourceToken>;

export const getTagStyleId = (tag: string) => `tag-style:${tag}`;

export const isTagStyleTag = (tag: string) => tags.includes(tag);

export const getTagFromStyleId = (id: string) => {
  if (id.startsWith("tag-style:") === false) {
    return;
  }
  const tag = id.slice("tag-style:".length);
  return isTagStyleTag(tag) ? tag : undefined;
};

const styleSourceTagStyle = z
  .object({
    type: z.literal("tag"),
    id: styleSourceId,
    tag: z.string().refine(isTagStyleTag),
  })
  .refine((source) => source.id === getTagStyleId(source.tag));

export type StyleSourceTagStyle = z.infer<typeof styleSourceTagStyle>;

const styleSourceLocal = z.object({
  type: z.literal("local"),
  id: styleSourceId,
});

export const styleSource = z.union([
  styleSourceToken,
  styleSourceTagStyle,
  styleSourceLocal,
]);

export type StyleSource = z.infer<typeof styleSource>;

export const styleSources = z.map(styleSourceId, styleSource);

export type StyleSources = z.infer<typeof styleSources>;
