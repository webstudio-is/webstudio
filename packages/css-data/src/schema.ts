import { units } from "./__generated__/units";
import type { properties } from "./__generated__/properties";
import { z } from "zod";
import { ImageAsset } from "@webstudio-is/asset-uploader";

type Properties = typeof properties & {
  [custom: CustomProperty]: {
    appliesTo: "allElements";
    initial: string;
    inherited: boolean;
  };
};

export type StyleProperty = keyof Properties;

type CustomProperty = `--${string}`;

export type AppliesTo = Properties[StyleProperty]["appliesTo"];

export type UnitGroup = keyof typeof units;

type UnitEnum = typeof units[UnitGroup][number];

const Unit = z.union([
  // expected tuple with at least single element
  // so cast to tuple with single union element to get correct inference
  z.enum(Object.values(units).flat() as [UnitEnum]),
  z.literal("number"),
]);

export type Unit = z.infer<typeof Unit>;

const UnitValue = z.object({
  type: z.literal("unit"),
  unit: Unit,
  value: z.number(),
});

export type UnitValue = z.infer<typeof UnitValue>;

const KeywordValue = z.object({
  type: z.literal("keyword"),
  // @todo use exact type
  value: z.string(),
});
export type KeywordValue = z.infer<typeof KeywordValue>;

/**
 * Valid unparsed css value
 **/
const UnparsedValue = z.object({
  type: z.literal("unparsed"),
  value: z.string(),
});

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
  value: z.array(z.object({ type: z.literal("asset"), value: ImageAsset })),
});

export type ImageValue = z.infer<typeof ImageValue>;

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
const InvalidValue = z.object({
  type: z.literal("invalid"),
  value: z.string(),
});
export type InvalidValue = z.infer<typeof InvalidValue>;

const UnsetValue = z.object({
  type: z.literal("unset"),
  value: z.literal(""),
});
export type UnsetValue = z.infer<typeof UnsetValue>;

export const validStaticValueTypes = [
  "unit",
  "keyword",
  "fontFamily",
  "rgb",
  "image",
  "unparsed",
] as const;

/**
 * Shared zod types with DB types.
 * ImageValue in DB has a different type
 */
const SharedStaticStyleValue = z.union([
  UnitValue,
  KeywordValue,
  FontFamilyValue,
  RgbValue,
  UnparsedValue,
]);

const ValidStaticStyleValue = z.union([ImageValue, SharedStaticStyleValue]);

export type ValidStaticStyleValue = z.infer<typeof ValidStaticStyleValue>;

const VarValue = z.object({
  type: z.literal("var"),
  value: z.string(),
  fallbacks: z.array(ValidStaticStyleValue),
});
export type VarValue = z.infer<typeof VarValue>;

const StyleValue = z.union([
  ValidStaticStyleValue,
  InvalidValue,
  UnsetValue,
  VarValue,
]);

/**
 * Shared types with DB types
 */
export const SharedStyleValue = z.union([
  SharedStaticStyleValue,
  InvalidValue,
  UnsetValue,
  VarValue,
]);

export type StyleValue = z.infer<typeof StyleValue>;

const Style = z.record(z.string(), StyleValue);

export type Style = {
  [property in StyleProperty]?: StyleValue;
} & { [property: CustomProperty]: StyleValue };

export const CssRule = z.object({
  style: Style,
  breakpoint: z.optional(z.string()),
});

export type CssRule = z.infer<typeof CssRule>;
