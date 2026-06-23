import { z } from "zod";
import { FontFormat, FontMeta } from "@webstudio-is/fonts";

const AssetId = z.string();

const baseAsset = {
  id: AssetId,
  projectId: z.string(),
  size: z.number(),
  name: z.string(),
  filename: z.string().optional(),
  description: z.union([z.string().optional(), z.null()]),
  createdAt: z.string(),
};

export const AssetType = z.enum(["font", "image", "file"]);
export type AssetType = z.infer<typeof AssetType>;

export const FontAsset = z.object({
  ...baseAsset,
  format: FontFormat,
  meta: FontMeta,
  type: z.literal(AssetType.enum.font),
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
  type: z.literal(AssetType.enum.image),
});
export type ImageAsset = z.infer<typeof ImageAsset>;

export const FileAsset = z.object({
  ...baseAsset,
  format: z.string(),
  meta: z.object({}),
  type: z.literal(AssetType.enum.file),
});
export type FileAsset = z.infer<typeof FileAsset>;

export const Asset = z.union([FontAsset, ImageAsset, FileAsset]);
export type Asset = z.infer<typeof Asset>;

export const Assets = z.map(AssetId, Asset);
export type Assets = z.infer<typeof Assets>;
