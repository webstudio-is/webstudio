import { styleValue } from "@webstudio-is/css-engine";
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

export const rangeUnit = literalUnion(RANGE_UNITS);

export const rangeUnitValue = z.union([
  z.object({
    type: z.literal("unit"),
    value: z.number(),
    unit: rangeUnit,
  }),
  z.object({
    type: z.literal("unparsed"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("var"),
    value: z.string(),
  }),
]);

export const TIME_UNITS = ["ms", "s"] as const;
const timeUnit = literalUnion(TIME_UNITS);

export const durationUnitValue = z.union([
  z.object({
    type: z.literal("unit"),
    value: z.number(),
    unit: timeUnit,
  }),
  z.object({
    type: z.literal("var"),
    value: z.string(),
  }),
]);

const iterationsUnitValue = z.union([z.number(), z.literal("infinite")]);

// view-timeline-inset
export const insetUnitValue = z.union([
  rangeUnitValue,
  z.object({
    type: z.literal("keyword"),
    value: z.literal("auto"),
  }),
]);

// @todo: Fix Keyframe Styles
// Can we use CssStyleMap for this? This type ends up not enforcing kebab case like.
export const keyframeStyles = z.record(z.string(), styleValue);

// Animation Keyframe
export const animationKeyframe = z.object({
  offset: z.number().optional(),
  styles: keyframeStyles,
});

// Keyframe Effect Options
export const keyframeEffectOptions = z.object({
  easing: z.string().optional(),
  fill: z
    .union([
      z.literal("none"),
      z.literal("forwards"),
      z.literal("backwards"),
      z.literal("both"),
    ])
    .optional(), // FillMode
  duration: durationUnitValue.optional(),
  delay: durationUnitValue.optional(),
  iterations: iterationsUnitValue.optional(),
});

// Scroll Named Range
export const scrollNamedRange = z.union([z.literal("start"), z.literal("end")]);

// Scroll Range Value
export const scrollRangeValue = z.tuple([scrollNamedRange, rangeUnitValue]);

// Scroll Range Options
export const scrollRangeOptions = z.object({
  rangeStart: scrollRangeValue.optional(),
  rangeEnd: scrollRangeValue.optional(),
});

// Animation Axis
export const animationAxis = z.union([
  z.literal("block"),
  z.literal("inline"),
  z.literal("x"),
  z.literal("y"),
]);

// View Named Range
export const viewNamedRange = z.union([
  z.literal("contain"),
  z.literal("cover"),
  z.literal("entry"),
  z.literal("exit"),
  z.literal("entry-crossing"),
  z.literal("exit-crossing"),
]);

// View Range Value
export const viewRangeValue = z.tuple([viewNamedRange, rangeUnitValue]);

// View Range Options
export const viewRangeOptions = z.object({
  rangeStart: viewRangeValue.optional(),
  rangeEnd: viewRangeValue.optional(),
});

const baseAnimation = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  enabled: z
    .array(z.tuple([z.string().describe("breakpointId"), z.boolean()]))
    .optional(),
  keyframes: z.array(animationKeyframe),
});

export const scrollAnimation = baseAnimation.merge(
  z.object({
    timing: keyframeEffectOptions.merge(scrollRangeOptions),
  })
);

// Scroll Action
export const scrollAction = z.object({
  type: z.literal("scroll"),
  source: z
    .union([z.literal("closest"), z.literal("nearest"), z.literal("root")])
    .optional(),
  axis: animationAxis.optional(),
  animations: z.array(scrollAnimation),
  isPinned: z.boolean().optional(),
  debug: z.boolean().optional(),
});

export const viewAnimation = baseAnimation.merge(
  z.object({
    timing: keyframeEffectOptions.merge(viewRangeOptions),
  })
);

// View Action
export const viewAction = z.object({
  type: z.literal("view"),
  subject: z.string().optional(),
  axis: animationAxis.optional(),
  animations: z.array(viewAnimation),

  insetStart: insetUnitValue.optional(),

  insetEnd: insetUnitValue.optional(),

  isPinned: z.boolean().optional(),
  debug: z.boolean().optional(),
});

// Animation Action
export const animationAction = z.discriminatedUnion("type", [
  scrollAction,
  viewAction,
]);

// Helper function to check if a value is a valid range unit
export const isRangeUnit = (
  value: unknown
): value is z.infer<typeof rangeUnit> => rangeUnit.safeParse(value).success;

// Type exports
export type RangeUnit = z.infer<typeof rangeUnit>;
export type RangeUnitValue = z.infer<typeof rangeUnitValue>;
export type DurationUnitValue = z.infer<typeof durationUnitValue>;
export type IterationsUnitValue = z.infer<typeof iterationsUnitValue>;
export type TimeUnit = z.infer<typeof timeUnit>;
export type KeyframeStyles = z.infer<typeof keyframeStyles>;
export type AnimationKeyframe = z.infer<typeof animationKeyframe>;
export type ScrollNamedRange = z.infer<typeof scrollNamedRange>;
export type ScrollRangeValue = z.infer<typeof scrollRangeValue>;
export type ViewNamedRange = z.infer<typeof viewNamedRange>;
export type ViewRangeValue = z.infer<typeof viewRangeValue>;
export type AnimationActionScroll = z.infer<typeof scrollAction>;
export type AnimationActionView = z.infer<typeof viewAction>;
export type AnimationAction = z.infer<typeof animationAction>;
export type ScrollAnimation = z.infer<typeof scrollAnimation>;
export type ViewAnimation = z.infer<typeof viewAnimation>;
export type InsetUnitValue = z.infer<typeof insetUnitValue>;
