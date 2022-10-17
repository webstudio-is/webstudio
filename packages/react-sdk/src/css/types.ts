import { z } from "zod";
import { properties } from "./properties";
import {
  BreakpointSchema,
  CssRuleSchema,
  InvalidValueSchema,
  KeywordValueSchema,
  StyleValueSchema,
  UnitSchema,
  UnitValueSchema,
  UnsetValueSchema,
} from "./schema";

type Properties = typeof properties;

export type StyleProperty = keyof Properties;

export type AppliesTo = Properties[StyleProperty]["appliesTo"];

export type Style = {
  [property in StyleProperty]?: StyleValue;
};

export type CssRule = z.infer<typeof CssRuleSchema>;

export type Unit = z.infer<typeof UnitSchema>;

export type StyleValue = z.infer<typeof StyleValueSchema>;
export type UnitValue = z.infer<typeof UnitValueSchema>;
export type KeywordValue = z.infer<typeof KeywordValueSchema>;
export type InvalidValue = z.infer<typeof InvalidValueSchema>;
export type UnsetValue = z.infer<typeof UnsetValueSchema>;

export type Breakpoint = z.infer<typeof BreakpointSchema>;
