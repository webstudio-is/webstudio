import { z } from "zod";
import { properties } from "./properties";
import { units } from "./units";

export const Unit = z.union([z.enum(units), z.literal("number")]);

const UnitValue = z.object({
  type: z.literal("unit"),
  unit: Unit,
  value: z.number(),
});

const KeywordValue = z.object({
  type: z.literal("keyword"),
  // @todo use exact type
  value: z.string(),
});

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
const InvalidValue = z.object({
  type: z.literal("invalid"),
  value: z.string(),
});

export const StyleValue = z.union([UnitValue, KeywordValue, InvalidValue]);

export const Style = z.record(z.string(), StyleValue);

export const CssRule = z.object({
  style: Style,
  breakpoint: z.string(),
});

export const Breakpoint = z.object({
  id: z.string(),
  label: z.string(),
  minWidth: z.number(),
});

export const Breakpoints = z.array(Breakpoint);

type Properties = typeof properties;

export type StyleProperty = keyof Properties;

export type AppliesTo = Properties[StyleProperty]["appliesTo"];

export type Style = {
  [property in StyleProperty]?: StyleValue;
};

export type CssRule = z.infer<typeof CssRule>;

export type Unit = z.infer<typeof Unit>;

export type StyleValue = z.infer<typeof StyleValue>;

export type Breakpoint = z.infer<typeof Breakpoint>;
