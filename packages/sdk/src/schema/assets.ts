import { z } from "zod";
import { FontFormat, FontMeta } from "@webstudio-is/fonts";

const AssetId = z.string();

const baseAsset = {
  id: AssetId,
  projectId: z.string(),
  size: z.number(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  createdAt: z.string(),
};

export const FontAsset = z.object({
  ...baseAsset,
  format: FontFormat,
  meta: FontMeta,
  type: z.literal("font"),
});
export type FontAsset = z.infer<typeof FontAsset>;

export const ImageMeta = z.object({
  width: z.number(),
  height: z.number(),
});
export type ImageMeta = z.infer<typeof ImageMeta>;

export const ImageAsset = z.object({
  ...baseAsset,
  format: z.string(),
  meta: ImageMeta,
  type: z.literal("image"),
});
export type ImageAsset = z.infer<typeof ImageAsset>;

export const Asset = z.union([FontAsset, ImageAsset]);
export type Asset = z.infer<typeof Asset>;

export const Assets = z.map(AssetId, Asset);
export type Assets = z.infer<typeof Assets>;
