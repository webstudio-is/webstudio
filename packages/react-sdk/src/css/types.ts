import { z } from "zod";
import { properties } from "./properties";
import {
  BreakpointSchema,
  CssRuleSchema,
  StyleValueSchema,
  UnitSchema,
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

export type Breakpoint = z.infer<typeof BreakpointSchema>;
