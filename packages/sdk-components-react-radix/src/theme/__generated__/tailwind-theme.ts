import type { StyleValue } from "@webstudio-is/css-engine";

export const spacing: Record<
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "14"
  | "16"
  | "20"
  | "24"
  | "28"
  | "32"
  | "36"
  | "40"
  | "44"
  | "48"
  | "52"
  | "56"
  | "60"
  | "64"
  | "72"
  | "80"
  | "96"
  | "px"
  | "0.5"
  | "1.5"
  | "2.5"
  | "3.5",
  StyleValue
> = {
  "0": { type: "unit", unit: "px", value: 0 },
  "1": { type: "unit", unit: "rem", value: 0.25 },
  "2": { type: "unit", unit: "rem", value: 0.5 },
  "3": { type: "unit", unit: "rem", value: 0.75 },
  "4": { type: "unit", unit: "rem", value: 1 },
  "5": { type: "unit", unit: "rem", value: 1.25 },
  "6": { type: "unit", unit: "rem", value: 1.5 },
  "7": { type: "unit", unit: "rem", value: 1.75 },
  "8": { type: "unit", unit: "rem", value: 2 },
  "9": { type: "unit", unit: "rem", value: 2.25 },
  "10": { type: "unit", unit: "rem", value: 2.5 },
  "11": { type: "unit", unit: "rem", value: 2.75 },
  "12": { type: "unit", unit: "rem", value: 3 },
  "14": { type: "unit", unit: "rem", value: 3.5 },
  "16": { type: "unit", unit: "rem", value: 4 },
  "20": { type: "unit", unit: "rem", value: 5 },
  "24": { type: "unit", unit: "rem", value: 6 },
  "28": { type: "unit", unit: "rem", value: 7 },
  "32": { type: "unit", unit: "rem", value: 8 },
  "36": { type: "unit", unit: "rem", value: 9 },
  "40": { type: "unit", unit: "rem", value: 10 },
  "44": { type: "unit", unit: "rem", value: 11 },
  "48": { type: "unit", unit: "rem", value: 12 },
  "52": { type: "unit", unit: "rem", value: 13 },
  "56": { type: "unit", unit: "rem", value: 14 },
  "60": { type: "unit", unit: "rem", value: 15 },
  "64": { type: "unit", unit: "rem", value: 16 },
  "72": { type: "unit", unit: "rem", value: 18 },
  "80": { type: "unit", unit: "rem", value: 20 },
  "96": { type: "unit", unit: "rem", value: 24 },
  px: { type: "unit", unit: "px", value: 1 },
  "0.5": { type: "unit", unit: "rem", value: 0.125 },
  "1.5": { type: "unit", unit: "rem", value: 0.375 },
  "2.5": { type: "unit", unit: "rem", value: 0.625 },
  "3.5": { type: "unit", unit: "rem", value: 0.875 },
};

export const padding: Record<keyof typeof spacing, StyleValue> = {
  ...spacing,
};

export const margin: Record<keyof typeof spacing | "auto", StyleValue> = {
  ...spacing,
  auto: { type: "keyword", value: "auto" },
};

export const width: Record<
  | keyof typeof spacing
  | "auto"
  | "1/2"
  | "1/3"
  | "2/3"
  | "1/4"
  | "2/4"
  | "3/4"
  | "1/5"
  | "2/5"
  | "3/5"
  | "4/5"
  | "1/6"
  | "2/6"
  | "3/6"
  | "4/6"
  | "5/6"
  | "1/12"
  | "2/12"
  | "3/12"
  | "4/12"
  | "5/12"
  | "6/12"
  | "7/12"
  | "8/12"
  | "9/12"
  | "10/12"
  | "11/12"
  | "full"
  | "screen"
  | "min"
  | "max"
  | "fit",
  StyleValue
> = {
  ...spacing,
  auto: { type: "keyword", value: "auto" },
  "1/2": { type: "unit", unit: "%", value: 50 },
  "1/3": { type: "unit", unit: "%", value: 33.333333 },
  "2/3": { type: "unit", unit: "%", value: 66.666667 },
  "1/4": { type: "unit", unit: "%", value: 25 },
  "2/4": { type: "unit", unit: "%", value: 50 },
  "3/4": { type: "unit", unit: "%", value: 75 },
  "1/5": { type: "unit", unit: "%", value: 20 },
  "2/5": { type: "unit", unit: "%", value: 40 },
  "3/5": { type: "unit", unit: "%", value: 60 },
  "4/5": { type: "unit", unit: "%", value: 80 },
  "1/6": { type: "unit", unit: "%", value: 16.666667 },
  "2/6": { type: "unit", unit: "%", value: 33.333333 },
  "3/6": { type: "unit", unit: "%", value: 50 },
  "4/6": { type: "unit", unit: "%", value: 66.666667 },
  "5/6": { type: "unit", unit: "%", value: 83.333333 },
  "1/12": { type: "unit", unit: "%", value: 8.333333 },
  "2/12": { type: "unit", unit: "%", value: 16.666667 },
  "3/12": { type: "unit", unit: "%", value: 25 },
  "4/12": { type: "unit", unit: "%", value: 33.333333 },
  "5/12": { type: "unit", unit: "%", value: 41.666667 },
  "6/12": { type: "unit", unit: "%", value: 50 },
  "7/12": { type: "unit", unit: "%", value: 58.333333 },
  "8/12": { type: "unit", unit: "%", value: 66.666667 },
  "9/12": { type: "unit", unit: "%", value: 75 },
  "10/12": { type: "unit", unit: "%", value: 83.333333 },
  "11/12": { type: "unit", unit: "%", value: 91.666667 },
  full: { type: "unit", unit: "%", value: 100 },
  screen: { type: "unit", unit: "vw", value: 100 },
  min: { type: "keyword", value: "min-content" },
  max: { type: "keyword", value: "max-content" },
  fit: { type: "keyword", value: "fit-content" },
};

export const maxWidth: Record<
  | "0"
  | "none"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl"
  | "full"
  | "min"
  | "max"
  | "fit"
  | "prose",
  StyleValue
> = {
  "0": { type: "unit", unit: "rem", value: 0 },
  none: { type: "keyword", value: "none" },
  xs: { type: "unit", unit: "rem", value: 20 },
  sm: { type: "unit", unit: "rem", value: 24 },
  md: { type: "unit", unit: "rem", value: 28 },
  lg: { type: "unit", unit: "rem", value: 32 },
  xl: { type: "unit", unit: "rem", value: 36 },
  "2xl": { type: "unit", unit: "rem", value: 42 },
  "3xl": { type: "unit", unit: "rem", value: 48 },
  "4xl": { type: "unit", unit: "rem", value: 56 },
  "5xl": { type: "unit", unit: "rem", value: 64 },
  "6xl": { type: "unit", unit: "rem", value: 72 },
  "7xl": { type: "unit", unit: "rem", value: 80 },
  full: { type: "unit", unit: "%", value: 100 },
  min: { type: "keyword", value: "min-content" },
  max: { type: "keyword", value: "max-content" },
  fit: { type: "keyword", value: "fit-content" },
  prose: { type: "unit", unit: "ch", value: 65 },
};

export const height: Record<
  | keyof typeof spacing
  | "auto"
  | "1/2"
  | "1/3"
  | "2/3"
  | "1/4"
  | "2/4"
  | "3/4"
  | "1/5"
  | "2/5"
  | "3/5"
  | "4/5"
  | "1/6"
  | "2/6"
  | "3/6"
  | "4/6"
  | "5/6"
  | "full"
  | "screen"
  | "min"
  | "max"
  | "fit",
  StyleValue
> = {
  ...spacing,
  auto: { type: "keyword", value: "auto" },
  "1/2": { type: "unit", unit: "%", value: 50 },
  "1/3": { type: "unit", unit: "%", value: 33.333333 },
  "2/3": { type: "unit", unit: "%", value: 66.666667 },
  "1/4": { type: "unit", unit: "%", value: 25 },
  "2/4": { type: "unit", unit: "%", value: 50 },
  "3/4": { type: "unit", unit: "%", value: 75 },
  "1/5": { type: "unit", unit: "%", value: 20 },
  "2/5": { type: "unit", unit: "%", value: 40 },
  "3/5": { type: "unit", unit: "%", value: 60 },
  "4/5": { type: "unit", unit: "%", value: 80 },
  "1/6": { type: "unit", unit: "%", value: 16.666667 },
  "2/6": { type: "unit", unit: "%", value: 33.333333 },
  "3/6": { type: "unit", unit: "%", value: 50 },
  "4/6": { type: "unit", unit: "%", value: 66.666667 },
  "5/6": { type: "unit", unit: "%", value: 83.333333 },
  full: { type: "unit", unit: "%", value: 100 },
  screen: { type: "unit", unit: "vh", value: 100 },
  min: { type: "keyword", value: "min-content" },
  max: { type: "keyword", value: "max-content" },
  fit: { type: "keyword", value: "fit-content" },
};

export const minHeight: Record<
  "0" | "full" | "screen" | "min" | "max" | "fit",
  StyleValue
> = {
  "0": { type: "unit", unit: "px", value: 0 },
  full: { type: "unit", unit: "%", value: 100 },
  screen: { type: "unit", unit: "vh", value: 100 },
  min: { type: "keyword", value: "min-content" },
  max: { type: "keyword", value: "max-content" },
  fit: { type: "keyword", value: "fit-content" },
};

export const inset: Record<
  | keyof typeof spacing
  | "auto"
  | "1/2"
  | "1/3"
  | "2/3"
  | "1/4"
  | "2/4"
  | "3/4"
  | "full",
  StyleValue
> = {
  ...spacing,
  auto: { type: "keyword", value: "auto" },
  "1/2": { type: "unit", unit: "%", value: 50 },
  "1/3": { type: "unit", unit: "%", value: 33.333333 },
  "2/3": { type: "unit", unit: "%", value: 66.666667 },
  "1/4": { type: "unit", unit: "%", value: 25 },
  "2/4": { type: "unit", unit: "%", value: 50 },
  "3/4": { type: "unit", unit: "%", value: 75 },
  full: { type: "unit", unit: "%", value: 100 },
};

export const borderWidth: Record<
  "0" | "2" | "4" | "8" | "DEFAULT",
  StyleValue
> = {
  "0": { type: "unit", unit: "px", value: 0 },
  "2": { type: "unit", unit: "px", value: 2 },
  "4": { type: "unit", unit: "px", value: 4 },
  "8": { type: "unit", unit: "px", value: 8 },
  DEFAULT: { type: "unit", unit: "px", value: 1 },
};

export const borderRadius: Record<
  "none" | "sm" | "DEFAULT" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full",
  StyleValue
> = {
  none: { type: "unit", unit: "px", value: 0 },
  sm: { type: "unit", unit: "rem", value: 0.125 },
  DEFAULT: { type: "unit", unit: "rem", value: 0.5 },
  md: { type: "unit", unit: "rem", value: 0.375 },
  lg: { type: "unit", unit: "rem", value: 0.5 },
  xl: { type: "unit", unit: "rem", value: 0.75 },
  "2xl": { type: "unit", unit: "rem", value: 1 },
  "3xl": { type: "unit", unit: "rem", value: 1.5 },
  full: { type: "unit", unit: "px", value: 9999 },
};

export const colors: Record<
  | "transparent"
  | "current"
  | "inherit"
  | "popover"
  | "popoverForeground"
  | "border"
  | "background"
  | "foreground"
  | "ring"
  | "mutedForeground"
  | "muted"
  | "primary"
  | "primaryForeground"
  | "destructive"
  | "destructiveForeground"
  | "accent"
  | "accentForeground"
  | "input"
  | "secondary"
  | "secondaryForeground",
  StyleValue
> = {
  transparent: { type: "keyword", value: "transparent" },
  current: { type: "keyword", value: "currentColor" },
  inherit: { type: "keyword", value: "inherit" },
  popover: { type: "rgb", alpha: 1, r: 255, g: 255, b: 255 },
  popoverForeground: { type: "rgb", alpha: 1, r: 2, g: 8, b: 23 },
  border: { type: "rgb", alpha: 1, r: 226, g: 232, b: 240 },
  background: { type: "rgb", alpha: 1, r: 255, g: 255, b: 255 },
  foreground: { type: "rgb", alpha: 1, r: 2, g: 8, b: 23 },
  ring: { type: "rgb", alpha: 1, r: 148, g: 163, b: 184 },
  mutedForeground: { type: "rgb", alpha: 1, r: 100, g: 116, b: 139 },
  muted: { type: "rgb", alpha: 1, r: 241, g: 245, b: 249 },
  primary: { type: "rgb", alpha: 1, r: 15, g: 23, b: 42 },
  primaryForeground: { type: "rgb", alpha: 1, r: 248, g: 250, b: 252 },
  destructive: { type: "rgb", alpha: 1, r: 239, g: 68, b: 68 },
  destructiveForeground: { type: "rgb", alpha: 1, r: 248, g: 250, b: 252 },
  accent: { type: "rgb", alpha: 1, r: 241, g: 245, b: 249 },
  accentForeground: { type: "rgb", alpha: 1, r: 15, g: 23, b: 42 },
  input: { type: "rgb", alpha: 1, r: 226, g: 232, b: 240 },
  secondary: { type: "rgb", alpha: 1, r: 241, g: 245, b: 249 },
  secondaryForeground: { type: "rgb", alpha: 1, r: 15, g: 23, b: 42 },
};

export const zIndex: Record<
  "0" | "10" | "20" | "30" | "40" | "50" | "auto",
  StyleValue
> = {
  "0": { type: "unit", unit: "number", value: 0 },
  "10": { type: "unit", unit: "number", value: 10 },
  "20": { type: "unit", unit: "number", value: 20 },
  "30": { type: "unit", unit: "number", value: 30 },
  "40": { type: "unit", unit: "number", value: 40 },
  "50": { type: "unit", unit: "number", value: 50 },
  auto: { type: "keyword", value: "auto" },
};

export const opacity: Record<
  | "0"
  | "5"
  | "10"
  | "20"
  | "25"
  | "30"
  | "40"
  | "50"
  | "60"
  | "70"
  | "75"
  | "80"
  | "90"
  | "95"
  | "100",
  StyleValue
> = {
  "0": { type: "unit", unit: "number", value: 0 },
  "5": { type: "unit", unit: "number", value: 0.05 },
  "10": { type: "unit", unit: "number", value: 0.1 },
  "20": { type: "unit", unit: "number", value: 0.2 },
  "25": { type: "unit", unit: "number", value: 0.25 },
  "30": { type: "unit", unit: "number", value: 0.3 },
  "40": { type: "unit", unit: "number", value: 0.4 },
  "50": { type: "unit", unit: "number", value: 0.5 },
  "60": { type: "unit", unit: "number", value: 0.6 },
  "70": { type: "unit", unit: "number", value: 0.7 },
  "75": { type: "unit", unit: "number", value: 0.75 },
  "80": { type: "unit", unit: "number", value: 0.8 },
  "90": { type: "unit", unit: "number", value: 0.9 },
  "95": { type: "unit", unit: "number", value: 0.95 },
  "100": { type: "unit", unit: "number", value: 1 },
};

export const cursor: Record<
  | "auto"
  | "default"
  | "pointer"
  | "wait"
  | "text"
  | "move"
  | "help"
  | "not-allowed"
  | "none"
  | "context-menu"
  | "progress"
  | "cell"
  | "crosshair"
  | "vertical-text"
  | "alias"
  | "copy"
  | "no-drop"
  | "grab"
  | "grabbing"
  | "all-scroll"
  | "col-resize"
  | "row-resize"
  | "n-resize"
  | "e-resize"
  | "s-resize"
  | "w-resize"
  | "ne-resize"
  | "nw-resize"
  | "se-resize"
  | "sw-resize"
  | "ew-resize"
  | "ns-resize"
  | "nesw-resize"
  | "nwse-resize"
  | "zoom-in"
  | "zoom-out",
  StyleValue
> = {
  auto: { type: "keyword", value: "auto" },
  default: { type: "keyword", value: "default" },
  pointer: { type: "keyword", value: "pointer" },
  wait: { type: "keyword", value: "wait" },
  text: { type: "keyword", value: "text" },
  move: { type: "keyword", value: "move" },
  help: { type: "keyword", value: "help" },
  "not-allowed": { type: "keyword", value: "not-allowed" },
  none: { type: "keyword", value: "none" },
  "context-menu": { type: "keyword", value: "context-menu" },
  progress: { type: "keyword", value: "progress" },
  cell: { type: "keyword", value: "cell" },
  crosshair: { type: "keyword", value: "crosshair" },
  "vertical-text": { type: "keyword", value: "vertical-text" },
  alias: { type: "keyword", value: "alias" },
  copy: { type: "keyword", value: "copy" },
  "no-drop": { type: "keyword", value: "no-drop" },
  grab: { type: "keyword", value: "grab" },
  grabbing: { type: "keyword", value: "grabbing" },
  "all-scroll": { type: "keyword", value: "all-scroll" },
  "col-resize": { type: "keyword", value: "col-resize" },
  "row-resize": { type: "keyword", value: "row-resize" },
  "n-resize": { type: "keyword", value: "n-resize" },
  "e-resize": { type: "keyword", value: "e-resize" },
  "s-resize": { type: "keyword", value: "s-resize" },
  "w-resize": { type: "keyword", value: "w-resize" },
  "ne-resize": { type: "keyword", value: "ne-resize" },
  "nw-resize": { type: "keyword", value: "nw-resize" },
  "se-resize": { type: "keyword", value: "se-resize" },
  "sw-resize": { type: "keyword", value: "sw-resize" },
  "ew-resize": { type: "keyword", value: "ew-resize" },
  "ns-resize": { type: "keyword", value: "ns-resize" },
  "nesw-resize": { type: "keyword", value: "nesw-resize" },
  "nwse-resize": { type: "keyword", value: "nwse-resize" },
  "zoom-in": { type: "keyword", value: "zoom-in" },
  "zoom-out": { type: "keyword", value: "zoom-out" },
};

export const lineHeight: Record<
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "none"
  | "tight"
  | "snug"
  | "normal"
  | "relaxed"
  | "loose",
  StyleValue
> = {
  "3": { type: "unit", unit: "rem", value: 0.75 },
  "4": { type: "unit", unit: "rem", value: 1 },
  "5": { type: "unit", unit: "rem", value: 1.25 },
  "6": { type: "unit", unit: "rem", value: 1.5 },
  "7": { type: "unit", unit: "rem", value: 1.75 },
  "8": { type: "unit", unit: "rem", value: 2 },
  "9": { type: "unit", unit: "rem", value: 2.25 },
  "10": { type: "unit", unit: "rem", value: 2.5 },
  none: { type: "unit", unit: "number", value: 1 },
  tight: { type: "unit", unit: "number", value: 1.25 },
  snug: { type: "unit", unit: "number", value: 1.375 },
  normal: { type: "unit", unit: "number", value: 1.5 },
  relaxed: { type: "unit", unit: "number", value: 1.625 },
  loose: { type: "unit", unit: "number", value: 2 },
};

export const letterSpacing: Record<
  "tighter" | "tight" | "normal" | "wide" | "wider" | "widest",
  StyleValue
> = {
  tighter: { type: "unit", unit: "em", value: -0.05 },
  tight: { type: "unit", unit: "em", value: -0.025 },
  normal: { type: "unit", unit: "em", value: 0 },
  wide: { type: "unit", unit: "em", value: 0.025 },
  wider: { type: "unit", unit: "em", value: 0.05 },
  widest: { type: "unit", unit: "em", value: 0.1 },
};

export const listStyleType: Record<"none" | "disc" | "decimal", StyleValue> = {
  none: { type: "keyword", value: "none" },
  disc: { type: "keyword", value: "disc" },
  decimal: { type: "keyword", value: "decimal" },
};

export const lineClamp: Record<"1" | "2" | "3" | "4" | "5" | "6", StyleValue> =
  {
    "1": { type: "unit", unit: "number", value: 1 },
    "2": { type: "unit", unit: "number", value: 2 },
    "3": { type: "unit", unit: "number", value: 3 },
    "4": { type: "unit", unit: "number", value: 4 },
    "5": { type: "unit", unit: "number", value: 5 },
    "6": { type: "unit", unit: "number", value: 6 },
  };

export const textUnderlineOffset: Record<
  "0" | "1" | "2" | "4" | "8" | "auto",
  StyleValue
> = {
  "0": { type: "unit", unit: "px", value: 0 },
  "1": { type: "unit", unit: "px", value: 1 },
  "2": { type: "unit", unit: "px", value: 2 },
  "4": { type: "unit", unit: "px", value: 4 },
  "8": { type: "unit", unit: "px", value: 8 },
  auto: { type: "keyword", value: "auto" },
};

export const ringWidth: Record<
  "0" | "1" | "2" | "4" | "8" | "DEFAULT",
  StyleValue
> = {
  "0": { type: "unit", unit: "px", value: 0 },
  "1": { type: "unit", unit: "px", value: 1 },
  "2": { type: "unit", unit: "px", value: 2 },
  "4": { type: "unit", unit: "px", value: 4 },
  "8": { type: "unit", unit: "px", value: 8 },
  DEFAULT: { type: "unit", unit: "px", value: 3 },
};

export const ringOffsetWidth: Record<"0" | "1" | "2" | "4" | "8", StyleValue> =
  {
    "0": { type: "unit", unit: "px", value: 0 },
    "1": { type: "unit", unit: "px", value: 1 },
    "2": { type: "unit", unit: "px", value: 2 },
    "4": { type: "unit", unit: "px", value: 4 },
    "8": { type: "unit", unit: "px", value: 8 },
  };

export const boxShadow: Record<
  "sm" | "DEFAULT" | "md" | "lg" | "xl" | "2xl" | "inner" | "none",
  StyleValue
> = {
  sm: {
    type: "layers",
    value: [
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 1, unit: "px" },
          { type: "unit", value: 2, unit: "px" },
          { type: "unit", value: 0, unit: "number" },
          { type: "rgb", alpha: 0.05, r: 0, g: 0, b: 0 },
        ],
      },
    ],
  },
  DEFAULT: {
    type: "layers",
    value: [
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 1, unit: "px" },
          { type: "unit", value: 3, unit: "px" },
          { type: "unit", value: 0, unit: "number" },
          { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
        ],
      },
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 1, unit: "px" },
          { type: "unit", value: 2, unit: "px" },
          { type: "unit", value: -1, unit: "px" },
          { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
        ],
      },
    ],
  },
  md: {
    type: "layers",
    value: [
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 4, unit: "px" },
          { type: "unit", value: 6, unit: "px" },
          { type: "unit", value: -1, unit: "px" },
          { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
        ],
      },
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 2, unit: "px" },
          { type: "unit", value: 4, unit: "px" },
          { type: "unit", value: -2, unit: "px" },
          { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
        ],
      },
    ],
  },
  lg: {
    type: "layers",
    value: [
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 10, unit: "px" },
          { type: "unit", value: 15, unit: "px" },
          { type: "unit", value: -3, unit: "px" },
          { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
        ],
      },
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 4, unit: "px" },
          { type: "unit", value: 6, unit: "px" },
          { type: "unit", value: -4, unit: "px" },
          { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
        ],
      },
    ],
  },
  xl: {
    type: "layers",
    value: [
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 20, unit: "px" },
          { type: "unit", value: 25, unit: "px" },
          { type: "unit", value: -5, unit: "px" },
          { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
        ],
      },
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 8, unit: "px" },
          { type: "unit", value: 10, unit: "px" },
          { type: "unit", value: -6, unit: "px" },
          { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
        ],
      },
    ],
  },
  "2xl": {
    type: "layers",
    value: [
      {
        type: "tuple",
        value: [
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 25, unit: "px" },
          { type: "unit", value: 50, unit: "px" },
          { type: "unit", value: -12, unit: "px" },
          { type: "rgb", alpha: 0.25, r: 0, g: 0, b: 0 },
        ],
      },
    ],
  },
  inner: {
    type: "layers",
    value: [
      {
        type: "tuple",
        value: [
          { type: "keyword", value: "inset" },
          { type: "unit", value: 0, unit: "number" },
          { type: "unit", value: 2, unit: "px" },
          { type: "unit", value: 4, unit: "px" },
          { type: "unit", value: 0, unit: "number" },
          { type: "rgb", alpha: 0.05, r: 0, g: 0, b: 0 },
        ],
      },
    ],
  },
  none: {
    type: "layers",
    value: [{ type: "tuple", value: [{ type: "keyword", value: "none" }] }],
  },
};

export const blur: Record<
  "sm" | "DEFAULT" | "md" | "lg" | "xl" | "2xl" | "inner" | "none",
  StyleValue
> = {
  sm: { type: "unparsed", value: "blur(0 1px 2px 0 rgb(0 0 0 / 0.05))" },
  DEFAULT: {
    type: "unparsed",
    value:
      "blur(0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1))",
  },
  md: {
    type: "unparsed",
    value:
      "blur(0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1))",
  },
  lg: {
    type: "unparsed",
    value:
      "blur(0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))",
  },
  xl: {
    type: "unparsed",
    value:
      "blur(0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1))",
  },
  "2xl": {
    type: "unparsed",
    value: "blur(0 25px 50px -12px rgb(0 0 0 / 0.25))",
  },
  inner: {
    type: "unparsed",
    value: "blur(inset 0 2px 4px 0 rgb(0 0 0 / 0.05))",
  },
  none: { type: "unparsed", value: "blur(none)" },
};

export const fontSize: Record<
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl"
  | "8xl"
  | "9xl",
  StyleValue
> = {
  xs: { type: "unit", unit: "rem", value: 0.75 },
  sm: { type: "unit", unit: "rem", value: 0.875 },
  base: { type: "unit", unit: "rem", value: 1 },
  lg: { type: "unit", unit: "rem", value: 1.125 },
  xl: { type: "unit", unit: "rem", value: 1.25 },
  "2xl": { type: "unit", unit: "rem", value: 1.5 },
  "3xl": { type: "unit", unit: "rem", value: 1.875 },
  "4xl": { type: "unit", unit: "rem", value: 2.25 },
  "5xl": { type: "unit", unit: "rem", value: 3 },
  "6xl": { type: "unit", unit: "rem", value: 3.75 },
  "7xl": { type: "unit", unit: "rem", value: 4.5 },
  "8xl": { type: "unit", unit: "rem", value: 6 },
  "9xl": { type: "unit", unit: "rem", value: 8 },
};

export const fontSizeLineHeight: Record<
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl"
  | "8xl"
  | "9xl",
  StyleValue
> = {
  xs: { type: "unit", unit: "rem", value: 1 },
  sm: { type: "unit", unit: "rem", value: 1.25 },
  base: { type: "unit", unit: "rem", value: 1.5 },
  lg: { type: "unit", unit: "rem", value: 1.75 },
  xl: { type: "unit", unit: "rem", value: 1.75 },
  "2xl": { type: "unit", unit: "rem", value: 2 },
  "3xl": { type: "unit", unit: "rem", value: 2.25 },
  "4xl": { type: "unit", unit: "rem", value: 2.5 },
  "5xl": { type: "unit", unit: "number", value: 1 },
  "6xl": { type: "unit", unit: "number", value: 1 },
  "7xl": { type: "unit", unit: "number", value: 1 },
  "8xl": { type: "unit", unit: "number", value: 1 },
  "9xl": { type: "unit", unit: "number", value: 1 },
};
