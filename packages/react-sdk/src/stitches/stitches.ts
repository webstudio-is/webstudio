import { createStitches, type CSS } from "@stitches/core";
import type { Breakpoint } from "../css";

let media = {};

const createStitchesInstance = () => createStitches({ media });

type StitchesInstance = ReturnType<typeof createStitchesInstance>;

let stitches: StitchesInstance | undefined;

export { type CSS };

const getCachedConfig = () => {
  if (stitches === undefined) {
    stitches = createStitchesInstance();
  }
  return stitches;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const css: StitchesInstance["css"] = (...args: any[]) => {
  return getCachedConfig().css(...args);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const globalCss: StitchesInstance["globalCss"] = (...args: any[]) => {
  return getCachedConfig().globalCss(...args);
};

export const flushCss = () => {
  const config = getCachedConfig();
  const css = config.getCssText();
  config.reset();
  return css;
};

export const setBreakpoints = (breakpoints: Array<Breakpoint>) => {
  const nextMedia: Record<string, string> = {};
  for (const breakpoint of breakpoints) {
    nextMedia[breakpoint.id] = `(min-width: ${breakpoint.minWidth}px)`;
  }
  media = nextMedia;
  stitches = undefined;
};
