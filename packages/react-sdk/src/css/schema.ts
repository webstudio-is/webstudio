import { units } from "@webstudio-is/css-data";
import { z } from "zod";
import { StyleProperty } from "./types";

export const Unit = z.union([z.enum(units), z.literal("number")]);

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

export const FontFamilyValue = z.object({
  type: z.literal("fontFamily"),
  value: z.array(z.string()),
});
export type FontFamilyValue = z.infer<typeof FontFamilyValue>;

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
export const InvalidValue = z.object({
  type: z.literal("invalid"),
  value: z.string(),
});
export type InvalidValue = z.infer<typeof InvalidValue>;

export const UnsetValue = z.object({
  type: z.literal("unset"),
  value: z.literal(""),
});
export type UnsetValue = z.infer<typeof UnsetValue>;

export const validStaticValueTypes = ["unit", "keyword", "fontFamily"] as const;

export const ValidStaticStyleValue = z.union([
  UnitValue,
  KeywordValue,
  FontFamilyValue,
]);
export type ValidStaticStyleValue = z.infer<typeof ValidStaticStyleValue>;

export const VarValue = z.object({
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

export const Style = z.record(z.string(), StyleValue);

export type Style = {
  [property in StyleProperty]?: StyleValue;
};

export const CssRule = z.object({
  style: Style,
  breakpoint: z.string(),
});

export type CssRule = z.infer<typeof CssRule>;

export const Breakpoint = z.object({
  id: z.string(),
  label: z.string(),
  minWidth: z.number(),
});

export const Breakpoints = z.array(Breakpoint);

export type Breakpoint = z.infer<typeof Breakpoint>;
