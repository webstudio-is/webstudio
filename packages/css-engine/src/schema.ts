import { z } from "zod";
import type {
  Property as GeneratedProperty,
  Unit as GeneratedUnit,
} from "./__generated__/types";

export type CustomProperty = `--${string}`;

export type StyleProperty = GeneratedProperty | CustomProperty;

const Unit = z.string() as z.ZodType<GeneratedUnit | "number">;

export type Unit = z.infer<typeof Unit>;

export const UnitValue = z.object({
  type: z.literal("unit"),
  unit: Unit,
  value: z.number(),
});

export type UnitValue = z.infer<typeof UnitValue>;

export const KeywordValue = z.object({
  type: z.literal("keyword"),
  // @todo use exact type
  value: z.string(),
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
});
export type FontFamilyValue = z.infer<typeof FontFamilyValue>;

const RgbValue = z.object({
  type: z.literal("rgb"),
  r: z.number(),
  g: z.number(),
  b: z.number(),
  alpha: z.number(),
});
export type RgbValue = z.infer<typeof RgbValue>;

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

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
export const InvalidValue = z.object({
  type: z.literal("invalid"),
  value: z.string(),
});
export type InvalidValue = z.infer<typeof InvalidValue>;

const UnsetValue = z.object({
  type: z.literal("unset"),
  value: z.literal(""),
});
export type UnsetValue = z.infer<typeof UnsetValue>;

export const TupleValueItem = z.union([
  UnitValue,
  KeywordValue,
  UnparsedValue,
  RgbValue,
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
  InvalidValue,
]);

export type LayerValueItem = z.infer<typeof LayerValueItem>;
// To support background layers https://developer.mozilla.org/en-US/docs/Web/CSS/background
// and similar comma separated css properties
// InvalidValue used in case of asset not found
export const LayersValue = z.object({
  type: z.literal("layers"),
  value: z.array(LayerValueItem),
});

export type LayersValue = z.infer<typeof LayersValue>;

const ValidStaticStyleValue = z.union([
  ImageValue,
  LayersValue,
  UnitValue,
  KeywordValue,
  FontFamilyValue,
  RgbValue,
  UnparsedValue,
  TupleValue,
]);

export type ValidStaticStyleValue = z.infer<typeof ValidStaticStyleValue>;

/**
 * All StyleValue types that going to need wrapping into a CSS variable when rendered
 * on canvas inside builder.
 * Values like InvalidValue, UnsetValue, VarValue don't need to be wrapped
 */
export const isValidStaticStyleValue = (
  styleValue: StyleValue
): styleValue is ValidStaticStyleValue => {
  // guard against invalid checks
  const staticStyleValue = styleValue as ValidStaticStyleValue;
  return (
    staticStyleValue.type === "image" ||
    staticStyleValue.type === "layers" ||
    staticStyleValue.type === "unit" ||
    staticStyleValue.type === "keyword" ||
    staticStyleValue.type === "fontFamily" ||
    staticStyleValue.type === "rgb" ||
    staticStyleValue.type === "unparsed" ||
    staticStyleValue.type === "tuple"
  );
};

const VarValue = z.object({
  type: z.literal("var"),
  value: z.string(),
  fallbacks: z.array(ValidStaticStyleValue),
});
export type VarValue = z.infer<typeof VarValue>;

export const StyleValue = z.union([
  ValidStaticStyleValue,
  InvalidValue,
  UnsetValue,
  VarValue,
]);

export type StyleValue = z.infer<typeof StyleValue>;

const Style = z.record(z.string(), StyleValue);

export type Style = {
  [property in StyleProperty]?: StyleValue;
} & { [property: CustomProperty]: StyleValue };
