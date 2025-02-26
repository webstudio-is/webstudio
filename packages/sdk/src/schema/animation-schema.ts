import { StyleValue } from "@webstudio-is/css-engine";
import { z } from "zod";

// Helper for creating union of string literals from array
const literalUnion = <T extends readonly string[]>(arr: T) =>
  z.union(
    arr.map((val) => z.literal(val)) as [
      z.ZodLiteral<T[0]>,
      z.ZodLiteral<T[1]>,
      ...z.ZodLiteral<T[number]>[],
    ]
  );

// Range Units
export const RANGE_UNITS = [
  "%",
  "px",
  "cm",
  "mm",
  "q",
  "in",
  "pt",
  "pc",
  "em",
  "rem",
  "ex",
  "rex",
  "cap",
  "rcap",
  "ch",
  "rch",
  "lh",
  "rlh",
  "vw",
  "svw",
  "lvw",
  "dvw",
  "vh",
  "svh",
  "lvh",
  "dvh",
  "vi",
  "svi",
  "lvi",
  "dvi",
  "vb",
  "svb",
  "lvb",
  "dvb",
  "vmin",
  "svmin",
  "lvmin",
  "dvmin",
  "vmax",
  "svmax",
  "lvmax",
  "dvmax",
] as const;

export const rangeUnitSchema = literalUnion(RANGE_UNITS);

export const rangeUnitValueSchema = z.union([
  z.object({
    type: z.literal("unit"),
    value: z.number(),
    unit: rangeUnitSchema,
  }),
  z.object({
    type: z.literal("unparsed"),
    value: z.string(),
  }),
]);

// view-timeline-inset
export const insetUnitValueSchema = z.union([
  rangeUnitValueSchema,
  z.object({
    type: z.literal("keyword"),
    value: z.literal("auto"),
  }),
]);

// @todo: Fix Keyframe Styles
export const keyframeStylesSchema = z.record(StyleValue);

// Animation Keyframe
export const animationKeyframeSchema = z.object({
  offset: z.number().optional(),
  styles: keyframeStylesSchema,
});

// Keyframe Effect Options
export const keyframeEffectOptionsSchema = z.object({
  easing: z.string().optional(),
  fill: z
    .union([
      z.literal("none"),
      z.literal("forwards"),
      z.literal("backwards"),
      z.literal("both"),
    ])
    .optional(), // FillMode
});

// Scroll Named Range
export const scrollNamedRangeSchema = z.union([
  z.literal("start"),
  z.literal("end"),
]);

// Scroll Range Value
export const scrollRangeValueSchema = z.tuple([
  scrollNamedRangeSchema,
  rangeUnitValueSchema,
]);

// Scroll Range Options
export const scrollRangeOptionsSchema = z.object({
  rangeStart: scrollRangeValueSchema.optional(),
  rangeEnd: scrollRangeValueSchema.optional(),
});

// Animation Axis
export const animationAxisSchema = z.union([
  z.literal("block"),
  z.literal("inline"),
  z.literal("x"),
  z.literal("y"),
]);

// View Named Range
export const viewNamedRangeSchema = z.union([
  z.literal("contain"),
  z.literal("cover"),
  z.literal("entry"),
  z.literal("exit"),
  z.literal("entry-crossing"),
  z.literal("exit-crossing"),
]);

// View Range Value
export const viewRangeValueSchema = z.tuple([
  viewNamedRangeSchema,
  rangeUnitValueSchema,
]);

// View Range Options
export const viewRangeOptionsSchema = z.object({
  rangeStart: viewRangeValueSchema.optional(),
  rangeEnd: viewRangeValueSchema.optional(),
});

const baseAnimation = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  keyframes: z.array(animationKeyframeSchema),
});

export const scrollAnimationSchema = baseAnimation.merge(
  z.object({
    timing: keyframeEffectOptionsSchema.merge(scrollRangeOptionsSchema),
  })
);

// Scroll Action
export const scrollActionSchema = z.object({
  type: z.literal("scroll"),
  source: z
    .union([z.literal("closest"), z.literal("nearest"), z.literal("root")])
    .optional(),
  axis: animationAxisSchema.optional(),
  animations: z.array(scrollAnimationSchema),
  isPinned: z.boolean().optional(),
  debug: z.boolean().optional(),
});

export const viewAnimationSchema = baseAnimation.merge(
  z.object({
    timing: keyframeEffectOptionsSchema.merge(viewRangeOptionsSchema),
  })
);

// View Action
export const viewActionSchema = z.object({
  type: z.literal("view"),
  subject: z.string().optional(),
  axis: animationAxisSchema.optional(),
  animations: z.array(viewAnimationSchema),

  insetStart: insetUnitValueSchema.optional(),

  insetEnd: insetUnitValueSchema.optional(),

  isPinned: z.boolean().optional(),
  debug: z.boolean().optional(),
});

// Animation Action
export const animationActionSchema = z.discriminatedUnion("type", [
  scrollActionSchema,
  viewActionSchema,
]);

// Helper function to check if a value is a valid range unit
export const isRangeUnit = (
  value: unknown
): value is z.infer<typeof rangeUnitSchema> =>
  rangeUnitSchema.safeParse(value).success;

// Type exports
export type RangeUnit = z.infer<typeof rangeUnitSchema>;
export type RangeUnitValue = z.infer<typeof rangeUnitValueSchema>;
export type KeyframeStyles = z.infer<typeof keyframeStylesSchema>;
export type AnimationKeyframe = z.infer<typeof animationKeyframeSchema>;
export type ScrollNamedRange = z.infer<typeof scrollNamedRangeSchema>;
export type ScrollRangeValue = z.infer<typeof scrollRangeValueSchema>;
export type ViewNamedRange = z.infer<typeof viewNamedRangeSchema>;
export type ViewRangeValue = z.infer<typeof viewRangeValueSchema>;
export type AnimationActionScroll = z.infer<typeof scrollActionSchema>;
export type AnimationActionView = z.infer<typeof viewActionSchema>;
export type AnimationAction = z.infer<typeof animationActionSchema>;
export type ScrollAnimation = z.infer<typeof scrollAnimationSchema>;
export type ViewAnimation = z.infer<typeof viewAnimationSchema>;
export type InsetUnitValue = z.infer<typeof insetUnitValueSchema>;
