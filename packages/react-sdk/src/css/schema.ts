import { z } from "zod";
import { units } from "./units";

export const UnitSchema = z.union([z.enum(units), z.literal("number")]);

export const UnitValueSchema = z.object({
  type: z.literal("unit"),
  unit: UnitSchema,
  value: z.number(),
});

export const KeywordValueSchema = z.object({
  type: z.literal("keyword"),
  // @todo use exact type
  value: z.string(),
});

// We want to be able to render the invalid value
// and show it is invalid visually, without saving it to the db
export const InvalidValueSchema = z.object({
  type: z.literal("invalid"),
  value: z.string(),
});

export const UnsetValueSchema = z.object({
  type: z.literal("unset"),
  value: z.literal(""),
});

export const StyleValueSchema = z.union([
  UnitValueSchema,
  KeywordValueSchema,
  InvalidValueSchema,
  UnsetValueSchema,
]);

export const StyleSchema = z.record(z.string(), StyleValueSchema);

export const CssRuleSchema = z.object({
  style: StyleSchema,
  breakpoint: z.string(),
});

export const BreakpointSchema = z.object({
  id: z.string(),
  label: z.string(),
  minWidth: z.number(),
});

export const BreakpointsSchema = z.array(BreakpointSchema);
