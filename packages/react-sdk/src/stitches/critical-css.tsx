import React from "react";
import { getCssText as getCssTextDefault } from "./css";

const criticalCssMarker = "__critical-css__";

export const CriticalCss = (): JSX.Element | null =>
  typeof document === "undefined" ? <>{criticalCssMarker}</> : null;

export const insertCriticalCss = (
  markup: string,
  getCssText: typeof getCssTextDefault = getCssTextDefault
): string => {
  return markup.replace(criticalCssMarker, `<style>${getCssText()}</style>`);
};
