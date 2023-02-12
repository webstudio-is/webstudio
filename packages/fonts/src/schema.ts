import { z } from "zod";
import { styles } from "./font-data";

export const FontFormat = z.union([
  z.literal("ttf"),
  z.literal("woff"),
  z.literal("woff2"),
  z.literal("otf"),
]);
export type FontFormat = z.infer<typeof FontFormat>;

const AxisName = z.enum([
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

const VariationAxes = z.record(
  AxisName,
  z.object({
    name: z.string(),
    min: z.number(),
    default: z.number(),
    max: z.number(),
  })
);

export type VariationAxes = z.infer<typeof VariationAxes>;

export const FontMetaStatic = z.object({
  family: z.string(),
  style: z.enum(styles),
  weight: z.number(),
});

export type FontMetaStatic = z.infer<typeof FontMetaStatic>;

const FontMetaVariable = z.object({
  family: z.string(),
  variationAxes: VariationAxes,
});

export const FontMeta = z.union([FontMetaStatic, FontMetaVariable]);

export type FontMeta = z.infer<typeof FontMeta>;
