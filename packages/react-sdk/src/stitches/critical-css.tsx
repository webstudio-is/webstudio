import React from "react";
import { flushCss as flushCssDefault } from "./css";

const criticalCssMarker = "__critical-css__";

export const CriticalCss = (): JSX.Element | null =>
  typeof document === "undefined" ? <>{criticalCssMarker}</> : null;

export const insertCriticalCss = (
  markup: string,
  flushCss: typeof flushCssDefault = flushCssDefault
): string => {
  return markup.replace(criticalCssMarker, `<style>${flushCss()}</style>`);
};
