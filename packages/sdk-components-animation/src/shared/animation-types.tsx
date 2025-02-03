import type { StyleValue, UnitValue } from "@webstudio-is/css-engine";

export type KeyframeStyles = { [property: string]: StyleValue | undefined };

export type AnimationKeyframe = {
  offset: number | undefined;
  // We are using composite: auto as the default value for now
  // composite?: CompositeOperationOrAuto;
  styles: KeyframeStyles;
};

const RANGE_UNITS = [
  "%",
  "px",
  // Does not supported by polyfill and we are converting it to px ourselfs
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

export type RangeUnit = (typeof RANGE_UNITS)[number];

export const isRangeUnit = (value: unknown): value is RangeUnit =>
  RANGE_UNITS.includes(value as RangeUnit);

export type RangeUnitValue = { type: "unit"; value: number; unit: RangeUnit };

({}) as RangeUnitValue satisfies UnitValue;

type KeyframeEffectOptions = {
  easing?: string;
  fill?: FillMode;
};

/**
 * Scroll does not support https://drafts.csswg.org/scroll-animations/#named-ranges
 * However, for simplicity and type unification with the view, we will use the names "start" and "end,"
 * which will be transformed as follows:
 * - "start" → `calc(0% + range)`
 * - "end" → `calc(100% - range)`
 */
export type ScrollNamedRange = "start" | "end";

/**
 * Scroll does not support https://drafts.csswg.org/scroll-animations/#named-ranges
 * However, for simplicity and type unification with the view, we will use the names "start" and "end,"
 * See ScrollNamedRange type for more information.
 */
export type ScrollRangeValue = [name: ScrollNamedRange, value: RangeUnitValue];

type ScrollRangeOptions = {
  rangeStart?: ScrollRangeValue | undefined;
  rangeEnd?: ScrollRangeValue | undefined;
};

/*
type AnimationTiming = {
  delay?: number;
  duration?: number;
  easing?: string;
  fill?: FillMode;
};
*/

type AnimationAxis = "block" | "inline" | "x" | "y";

type ScrollAction = {
  type: "scroll";
  source?: "closest" | "nearest" | "root";
  axis?: AnimationAxis;
  animations: {
    timing: KeyframeEffectOptions & ScrollRangeOptions;
    keyframes: AnimationKeyframe[];
  }[];
};

export type ViewNamedRange =
  | "contain"
  | "cover"
  | "entry"
  | "exit"
  | "entry-crossing"
  | "exit-crossing";

export type ViewRangeValue = [name: ViewNamedRange, value: RangeUnitValue];

type ViewRangeOptions = {
  rangeStart?: ViewRangeValue | undefined;
  rangeEnd?: ViewRangeValue | undefined;
};

type ViewAction = {
  type: "view";
  subject?: string;

  axis?: AnimationAxis;
  animations: {
    timing: KeyframeEffectOptions & ViewRangeOptions;
    keyframes: AnimationKeyframe[];
  }[];
};

export type AnimationAction = ScrollAction | ViewAction;
