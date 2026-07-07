import { z } from "zod";
import type {
  CamelCasedProperty,
  HyphenatedProperty,
  Unit as GeneratedUnit,
} from "./__generated__/types";
import { toValue, type TransformValue } from "./core/to-value";

export type CustomProperty = `--${string}`;

export type StyleProperty = CamelCasedProperty | CustomProperty;

export type CssProperty = HyphenatedProperty | CustomProperty;

export type CssStyleMap = Map<CssProperty, StyleValue>;

const unit = z.string() as z.ZodType<GeneratedUnit | "number">;

export type Unit = z.infer<typeof unit>;

export const unitValue = z.object({
  type: z.literal("unit"),
  unit: unit,
  value: z.number(),
  hidden: z.boolean().optional(),
});

export type UnitValue = z.infer<typeof unitValue>;

export const keywordValue = z.object({
  type: z.literal("keyword"),
  // @todo use exact type
  value: z.string(),
  hidden: z.boolean().optional(),
});
export type KeywordValue = z.infer<typeof keywordValue>;

/**
 * Valid unparsed css value
 **/
export const unparsedValue = z.object({
  type: z.literal("unparsed"),
  value: z.string(),
  // For the builder we want to be able to hide background-image
  hidden: z.boolean().optional(),
});

export type UnparsedValue = z.infer<typeof unparsedValue>;

const fontFamilyValue = z.object({
  type: z.literal("fontFamily"),
  value: z.array(z.string()),
  hidden: z.boolean().optional(),
});
export type FontFamilyValue = z.infer<typeof fontFamilyValue>;

const rgbValue = z.object({
  type: z.literal("rgb"),
  r: z.number(),
  g: z.number(),
  b: z.number(),
  alpha: z.number(),
  hidden: z.boolean().optional(),
});
export type RgbValue = z.infer<typeof rgbValue>;

// Explicit type declaration needed to break the ColorValue ↔ VarValue ↔ VarFallback cycle.
// VarValue (defined later) may appear as the alpha channel value.
export type ColorValue = {
  type: "color";
  colorSpace:
    | "hex"
    | "srgb"
    | "p3"
    | "srgb-linear"
    | "hsl"
    | "hwb"
    | "lab"
    | "lch"
    | "oklab"
    | "oklch"
    | "a98rgb"
    | "prophoto"
    | "rec2020"
    | "xyz-d65"
    | "xyz-d50";
  components: [number, number, number];
  alpha: number | VarValue;
  hidden?: boolean;
};

export const colorValue: z.ZodType<ColorValue> = z.object({
  type: z.literal("color"),
  // all these color spaces are defined by design tokens specification
  colorSpace: z.union([
    z.literal("hex"),
    z.literal("srgb"),
    z.literal("p3"),
    z.literal("srgb-linear"),
    z.literal("hsl"),
    z.literal("hwb"),
    z.literal("lab"),
    z.literal("lch"),
    z.literal("oklab"),
    z.literal("oklch"),
    z.literal("a98rgb"),
    z.literal("prophoto"),
    z.literal("rec2020"),
    z.literal("xyz-d65"),
    z.literal("xyz-d50"),
  ]),
  components: z.tuple([z.number(), z.number(), z.number()]),
  alpha: z.union([z.number(), z.lazy(() => varValue) as z.ZodType<VarValue>]),
  hidden: z.boolean().optional(),
});

export type FunctionValue = z.infer<typeof functionValue>;

export const functionValue: z.ZodType<{
  type: "function";
  name: string;
  args: StyleValue;
  hidden?: boolean;
}> = z.object({
  type: z.literal("function"),
  name: z.string(),
  args: z.lazy(() => styleValue),
  hidden: z.boolean().optional(),
});

export const imageValue = z.object({
  type: z.literal("image"),
  value: z.union([
    z.object({ type: z.literal("asset"), value: z.string() }),
    // url is not stored in db and only used by css-engine transformValue
    // to prepare image value for rendering
    z.object({ type: z.literal("url"), url: z.string() }),
  ]),
  // For the builder we want to be able to hide images
  hidden: z.boolean().optional(),
});

export type ImageValue = z.infer<typeof imageValue>;

// initial value of custom properties
// https://www.w3.org/TR/css-variables-1/#guaranteed-invalid
export const guaranteedInvalidValue = z.object({
  type: z.literal("guaranteedInvalid"),
  hidden: z.boolean().optional(),
});
export type GuaranteedInvalidValue = z.infer<typeof guaranteedInvalidValue>;

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
export const invalidValue = z.object({
  type: z.literal("invalid"),
  value: z.string(),
  hidden: z.boolean().optional(),
});
export type InvalidValue = z.infer<typeof invalidValue>;

/**
 * Use GuaranteedInvalidValue if you need a temp placeholder before user enters a value
 * @deprecated
 */
const unsetValue = z.object({
  type: z.literal("unset"),
  value: z.literal(""),
  hidden: z.boolean().optional(),
});
export type UnsetValue = z.infer<typeof unsetValue>;

export const varFallback = z.union([
  unparsedValue,
  keywordValue,
  unitValue,
  colorValue,
  rgbValue,
]);
export type VarFallback = z.infer<typeof varFallback>;

export const toVarFallback = (
  styleValue: StyleValue,
  transformValue?: TransformValue
): VarFallback => {
  if (
    styleValue.type === "unparsed" ||
    styleValue.type === "keyword" ||
    styleValue.type === "unit" ||
    styleValue.type === "color" ||
    styleValue.type === "rgb"
  ) {
    return styleValue;
  }
  styleValue satisfies Exclude<StyleValue, VarFallback>;
  return { type: "unparsed", value: toValue(styleValue, transformValue) };
};

const varValue = z.object({
  type: z.literal("var"),
  value: z.string(),
  fallback: varFallback.optional(),
  hidden: z.boolean().optional(),
});
export type VarValue = z.infer<typeof varValue>;

export const tupleValueItem = z.union([
  unitValue,
  keywordValue,
  unparsedValue,
  imageValue,
  colorValue,
  rgbValue,
  functionValue,
  varValue,
]);
export type TupleValueItem = z.infer<typeof tupleValueItem>;

export const tupleValue = z.object({
  type: z.literal("tuple"),
  value: z.array(tupleValueItem),
  hidden: z.boolean().optional(),
});

export type TupleValue = z.infer<typeof tupleValue>;

export const shadowValue = z.object({
  type: z.literal("shadow"),
  hidden: z.boolean().optional(),
  position: z.union([z.literal("inset"), z.literal("outset")]),
  offsetX: z.union([unitValue, varValue]),
  offsetY: z.union([unitValue, varValue]),
  blur: z.union([unitValue, varValue]).optional(),
  spread: z.union([unitValue, varValue]).optional(),
  color: z.union([colorValue, rgbValue, keywordValue, varValue]).optional(),
});

export type ShadowValue = z.infer<typeof shadowValue>;

const layerValueItem = z.union([
  unitValue,
  keywordValue,
  unparsedValue,
  imageValue,
  tupleValue,
  shadowValue,
  colorValue,
  rgbValue,
  invalidValue,
  functionValue,
  varValue,
]);

export type LayerValueItem = z.infer<typeof layerValueItem>;
// To support background layers https://developer.mozilla.org/en-US/docs/Web/CSS/background
// and similar comma separated css properties
// InvalidValue used in case of asset not found
export const layersValue = z.object({
  type: z.literal("layers"),
  value: z.array(layerValueItem),
  hidden: z.boolean().optional(),
});

export type LayersValue = z.infer<typeof layersValue>;

export const styleValue = z.union([
  imageValue,
  layersValue,
  unitValue,
  keywordValue,
  fontFamilyValue,
  colorValue,
  rgbValue,
  unparsedValue,
  tupleValue,
  functionValue,
  guaranteedInvalidValue,
  invalidValue,
  unsetValue,
  varValue,
  shadowValue,
]);

export type StyleValue = z.infer<typeof styleValue>;
