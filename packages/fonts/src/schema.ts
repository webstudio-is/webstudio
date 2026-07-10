import { z } from "zod";
import { FONT_STYLES } from "./constants";

export const fontFormat = z.union([
  z.literal("ttf"),
  z.literal("woff"),
  z.literal("woff2"),
]);
export type FontFormat = z.infer<typeof fontFormat>;

const axisName = z.enum([
  "wght",
  "wdth",
  "slnt",
  "opsz",
  "ital",
  "GRAD",
  "XTRA",
  "XOPQ",
  "YOPQ",
  "YTLC",
  "YTUC",
  "YTAS",
  "YTDE",
  "YTFI",
]);

const variationAxes = z.partialRecord(
  axisName,
  z.object({
    name: z.string(),
    min: z.number(),
    default: z.number(),
    max: z.number(),
  })
);

export type VariationAxes = z.infer<typeof variationAxes>;

export const fontMetaStatic = z.object({
  family: z.string(),
  style: z.enum(FONT_STYLES),
  weight: z.number(),
});

export type FontMetaStatic = z.infer<typeof fontMetaStatic>;

const fontMetaVariable = z.object({
  family: z.string(),
  variationAxes: variationAxes,
});

export const fontMeta = z.union([fontMetaStatic, fontMetaVariable]);

export type FontMeta = z.infer<typeof fontMeta>;
