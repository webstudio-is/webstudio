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

const Unit = z.string() as z.ZodType<GeneratedUnit | "number">;

export type Unit = z.infer<typeof Unit>;

export const UnitValue = z.object({
  type: z.literal("unit"),
  unit: Unit,
  value: z.number(),
  hidden: z.boolean().optional(),
});

export type UnitValue = z.infer<typeof UnitValue>;

export const KeywordValue = z.object({
  type: z.literal("keyword"),
  // @todo use exact type
  value: z.string(),
  hidden: z.boolean().optional(),
});
export type KeywordValue = z.infer<typeof KeywordValue>;

/**
 * Valid unparsed css value
 **/
export const UnparsedValue = z.object({
  type: z.literal("unparsed"),
  value: z.string(),
  // For the builder we want to be able to hide background-image
  hidden: z.boolean().optional(),
});

export type UnparsedValue = z.infer<typeof UnparsedValue>;

const FontFamilyValue = z.object({
  type: z.literal("fontFamily"),
  value: z.array(z.string()),
  hidden: z.boolean().optional(),
});
export type FontFamilyValue = z.infer<typeof FontFamilyValue>;

const RgbValue = z.object({
  type: z.literal("rgb"),
  r: z.number(),
  g: z.number(),
  b: z.number(),
  alpha: z.number(),
  hidden: z.boolean().optional(),
});
export type RgbValue = z.infer<typeof RgbValue>;

export type FunctionValue = z.infer<typeof FunctionValue>;

export const FunctionValue: z.ZodType<{
  type: "function";
  name: string;
  args: StyleValue;
  hidden?: boolean;
}> = z.object({
  type: z.literal("function"),
  name: z.string(),
  args: z.lazy(() => StyleValue),
  hidden: z.boolean().optional(),
});

export const ImageValue = z.object({
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

export type ImageValue = z.infer<typeof ImageValue>;

// initial value of custom properties
// https://www.w3.org/TR/css-variables-1/#guaranteed-invalid
export const GuaranteedInvalidValue = z.object({
  type: z.literal("guaranteedInvalid"),
  hidden: z.boolean().optional(),
});
export type GuaranteedInvalidValue = z.infer<typeof GuaranteedInvalidValue>;

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
export const InvalidValue = z.object({
  type: z.literal("invalid"),
  value: z.string(),
  hidden: z.boolean().optional(),
});
export type InvalidValue = z.infer<typeof InvalidValue>;

/**
 * Use GuaranteedInvalidValue if you need a temp placeholder before user enters a value
 * @deprecated
 */
const UnsetValue = z.object({
  type: z.literal("unset"),
  value: z.literal(""),
  hidden: z.boolean().optional(),
});
export type UnsetValue = z.infer<typeof UnsetValue>;

export const VarFallback = z.union([
  UnparsedValue,
  KeywordValue,
  UnitValue,
  RgbValue,
]);
export type VarFallback = z.infer<typeof VarFallback>;

export const toVarFallback = (
  styleValue: StyleValue,
  transformValue?: TransformValue
): VarFallback => {
  if (
    styleValue.type === "unparsed" ||
    styleValue.type === "keyword" ||
    styleValue.type === "unit" ||
    styleValue.type === "rgb"
  ) {
    return styleValue;
  }
  styleValue satisfies Exclude<StyleValue, VarFallback>;
  return { type: "unparsed", value: toValue(styleValue, transformValue) };
};

const VarValue = z.object({
  type: z.literal("var"),
  value: z.string(),
  fallback: VarFallback.optional(),
  hidden: z.boolean().optional(),
});
export type VarValue = z.infer<typeof VarValue>;

export const TupleValueItem = z.union([
  UnitValue,
  KeywordValue,
  UnparsedValue,
  ImageValue,
  RgbValue,
  FunctionValue,
  VarValue,
]);
export type TupleValueItem = z.infer<typeof TupleValueItem>;

export const TupleValue = z.object({
  type: z.literal("tuple"),
  value: z.array(TupleValueItem),
  hidden: z.boolean().optional(),
});

export type TupleValue = z.infer<typeof TupleValue>;

const LayerValueItem = z.union([
  UnitValue,
  KeywordValue,
  UnparsedValue,
  ImageValue,
  TupleValue,
  RgbValue,
  InvalidValue,
  FunctionValue,
  VarValue,
]);

export type LayerValueItem = z.infer<typeof LayerValueItem>;
// To support background layers https://developer.mozilla.org/en-US/docs/Web/CSS/background
// and similar comma separated css properties
// InvalidValue used in case of asset not found
export const LayersValue = z.object({
  type: z.literal("layers"),
  value: z.array(LayerValueItem),
  hidden: z.boolean().optional(),
});

export type LayersValue = z.infer<typeof LayersValue>;

export const StyleValue = z.union([
  ImageValue,
  LayersValue,
  UnitValue,
  KeywordValue,
  FontFamilyValue,
  RgbValue,
  UnparsedValue,
  TupleValue,
  FunctionValue,
  GuaranteedInvalidValue,
  InvalidValue,
  UnsetValue,
  VarValue,
]);

export type StyleValue = z.infer<typeof StyleValue>;

const Style = z.record(z.string(), StyleValue);

export type Style = {
  [property in StyleProperty]?: StyleValue;
} & { [property: CustomProperty]: StyleValue };
