import { z } from "zod";
import { assetFolderId } from "./asset-folders";
import { fontFormat, fontMeta } from "@webstudio-is/fonts";

const assetId = z.string();

const baseAsset = {
  id: assetId,
  projectId: z.string(),
  size: z.number(),
  name: z.string(),
  filename: z.string().optional(),
  description: z.union([z.string().optional(), z.null()]),
  folderId: assetFolderId.optional(),
  createdAt: z.string(),
};

export const assetType = z.enum(["font", "image", "file"]);
export type AssetType = z.infer<typeof assetType>;

export const fontAsset = z.object({
  ...baseAsset,
  format: fontFormat,
  meta: fontMeta,
  type: z.literal(assetType.enum.font),
});
export type FontAsset = z.infer<typeof fontAsset>;

export const imageMeta = z.object({
  width: z.number(),
  height: z.number(),
});
export type ImageMeta = z.infer<typeof imageMeta>;

export const imageAsset = z.object({
  ...baseAsset,
  format: z.string(),
  meta: imageMeta,
  type: z.literal(assetType.enum.image),
});
export type ImageAsset = z.infer<typeof imageAsset>;

export const fileAsset = z.object({
  ...baseAsset,
  format: z.string(),
  meta: z.object({}),
  type: z.literal(assetType.enum.file),
});
export type FileAsset = z.infer<typeof fileAsset>;

export const asset = z.union([fontAsset, imageAsset, fileAsset]);
export type Asset = z.infer<typeof asset>;

export const assets = z.map(assetId, asset);
export type Assets = z.infer<typeof assets>;
