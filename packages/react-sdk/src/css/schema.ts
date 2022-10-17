import { z } from "zod";
import { units } from "./units";
import { StyleProperty } from "./types";

export const Unit = z.union([z.enum(units), z.literal("number")]);

export type Unit = z.infer<typeof Unit>;

export const UnitValue = z.object({
  type: z.literal("unit"),
  unit: Unit,
  value: z.number(),
});

export const KeywordValue = z.object({
  type: z.literal("keyword"),
  // @todo use exact type
  value: z.string(),
});

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
export const InvalidValue = z.object({
  type: z.literal("invalid"),
  value: z.string(),
});

export const UnsetValue = z.object({
  type: z.literal("unset"),
  value: z.literal(""),
});

export type UnsetValue = z.infer<typeof UnsetValue>;

export const StyleValue = z.union([UnitValue, KeywordValue, InvalidValue, UnsetValue]);

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
