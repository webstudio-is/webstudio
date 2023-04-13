import { z } from "zod";
import { FontFormat, FontMeta } from "@webstudio-is/fonts";
import { MAX_UPLOAD_SIZE } from "./constants";
import { toBytes } from "./utils/to-bytes";

export const ImageMeta = z.object({
  width: z.number(),
  height: z.number(),
});
export type ImageMeta = z.infer<typeof ImageMeta>;

export const MaxSize = z
  .string()
  .default(MAX_UPLOAD_SIZE)
  // user inputs the max value in mb and we transform it to bytes
  .transform(toBytes);

export const MaxAssets = z.string().default("50").transform(Number.parseFloat);

export const Location = z.union([z.literal("FS"), z.literal("REMOTE")]);
export type Location = z.infer<typeof Location>;

const AssetId = z.string();

const BaseAsset = z.object({
  id: AssetId,
  projectId: z.string(),
  format: z.string(),
  size: z.number(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  location: Location,
  createdAt: z.string(),
});

export const FontAsset = BaseAsset.omit({ format: true }).extend({
  format: FontFormat,
  meta: FontMeta,
  type: z.literal("font"),
});
export type FontAsset = z.infer<typeof FontAsset>;

export const ImageAsset = BaseAsset.extend({
  meta: ImageMeta,
  type: z.literal("image"),
});
export type ImageAsset = z.infer<typeof ImageAsset>;

export const Asset = z.union([FontAsset, ImageAsset]);
export type Asset = z.infer<typeof Asset>;

export const idsFormDataFieldName = "ids";

// undefined is necessary to represent uploading state
// to be able to upload data while preserving order
export const Assets = z.map(AssetId, z.union([z.undefined(), Asset]));
export type Assets = z.infer<typeof Assets>;
