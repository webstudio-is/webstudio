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

export const getTagTokenId = (tag: string) => `tag-token:${tag}`;

export const isTagTokenTag = (tag: string) =>
  tag !== "html" && tags.includes(tag);

export const getTagFromTokenId = (id: string) => {
  if (id.startsWith("tag-token:") === false) {
    return;
  }
  const tag = id.slice("tag-token:".length);
  return isTagTokenTag(tag) ? tag : undefined;
};

const styleSourceTagToken = z
  .object({
    type: z.literal("tagToken"),
    id: styleSourceId,
    tag: z.string().refine(isTagTokenTag),
  })
  .refine((source) => source.id === getTagTokenId(source.tag));

export type StyleSourceTagToken = z.infer<typeof styleSourceTagToken>;

const styleSourceLocal = z.object({
  type: z.literal("local"),
  id: styleSourceId,
});

export const styleSource = z.union([
  styleSourceToken,
  styleSourceTagToken,
  styleSourceLocal,
]);

export type StyleSource = z.infer<typeof styleSource>;

export const styleSources = z.map(styleSourceId, styleSource);

export type StyleSources = z.infer<typeof styleSources>;
