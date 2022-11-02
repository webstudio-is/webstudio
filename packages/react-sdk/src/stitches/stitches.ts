import { createStitches, type CSS } from "@stitches/core";
import type { FontFace } from "@webstudio-is/fonts";
import type { Breakpoint } from "../css";

let media = {};

const createStitchesInstance = () => createStitches({ media });

type StitchesInstance = ReturnType<typeof createStitchesInstance>;

let stitches: StitchesInstance | undefined;

let fontsCss = "";

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
  const css = config.getCssText() + fontsCss;
  config.reset();
  fontsCss = "";
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

let styleElement: HTMLStyleElement | undefined;

/**
 * Stitches doesn't update fonts over globalCss
 */
export const renderFontFaces = (fontFaces: Array<FontFace>) => {
  fontsCss = fontFaces
    .map(
      (fontFace) =>
        `
@font-face {
  font-family: ${fontFace.fontFamily};
  font-style: ${fontFace.fontStyle};
  font-weight: ${fontFace.fontWeight};
  font-display: ${fontFace.fontDisplay};
  src: ${fontFace.src};
}`
    )
    .join("");

  if (
    typeof document !== "undefined" &&
    typeof document.createElement === "function"
  ) {
    if (styleElement === undefined) {
      styleElement = document.createElement("style");
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = fontsCss;
  }
};
