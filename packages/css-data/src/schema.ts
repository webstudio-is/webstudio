import { units } from "./__generated__/units";
import { properties } from "./__generated__/properties";
import { z } from "zod";

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

const Unit = z.union([z.enum(units), z.literal("number")]);

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
] as const;

const ValidStaticStyleValue = z.union([
  UnitValue,
  KeywordValue,
  FontFamilyValue,
  RgbValue,
]);
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
  RgbValue,
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

export const Breakpoint = z.object({
  id: z.string(),
  label: z.string(),
  minWidth: z.number(),
});

export const Breakpoints = z.array(Breakpoint);

export type Breakpoint = z.infer<typeof Breakpoint>;
