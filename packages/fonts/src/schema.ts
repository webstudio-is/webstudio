import { z } from "zod";
import { FONT_STYLES } from "./constants";

const fontStyle = z.enum(FONT_STYLES);

export const fontFormat = z.union([
  z.literal("ttf"),
  z.literal("woff"),
  z.literal("woff2"),
]);
export type FontFormat = z.infer<typeof fontFormat>;

// OpenType variation axis tags contain four ASCII characters. Registered tags
// and foundry-defined custom tags use the same identifier format.
const axisName = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9]* *$/)
  .length(4);

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
  style: fontStyle,
  weight: z.number(),
});

export type FontMetaStatic = z.infer<typeof fontMetaStatic>;

export const fontMetaVariable = z.object({
  family: z.string(),
  style: fontStyle.default("normal"),
  variationAxes: variationAxes,
});

export const fontMeta = z.union([fontMetaStatic, fontMetaVariable]);

export const fontMetaUpdate = z.union([
  fontMetaStatic.partial().strict(),
  z
    .object({
      family: fontMetaVariable.shape.family.optional(),
      style: fontStyle.optional(),
      variationAxes: fontMetaVariable.shape.variationAxes.optional(),
    })
    .strict(),
]);

export type FontMeta = z.infer<typeof fontMeta>;

export const mergeFontMeta = (
  current: FontMeta,
  override: unknown
): FontMeta | undefined => {
  const result = fontMetaUpdate.safeParse(override);
  if (result.success === false) {
    return;
  }
  const { family } = result.data;
  if ("variationAxes" in current) {
    const style = "style" in result.data ? result.data.style : undefined;
    const variationAxes =
      "variationAxes" in result.data ? result.data.variationAxes : undefined;
    return {
      ...current,
      ...(family === undefined ? {} : { family }),
      ...(style === undefined ? {} : { style }),
      ...(variationAxes === undefined ? {} : { variationAxes }),
    };
  }
  const style = "style" in result.data ? result.data.style : undefined;
  const weight = "weight" in result.data ? result.data.weight : undefined;
  return {
    ...current,
    ...(family === undefined ? {} : { family }),
    ...(style === undefined ? {} : { style }),
    ...(weight === undefined ? {} : { weight }),
  };
};
