import { flushCss } from "@webstudio-is/design-system";
import { CRITICAL_CSS_MARKER } from "./constants";

export const insertCriticalCss = (markup: string): string => {
  return markup.replace(CRITICAL_CSS_MARKER, `<style>${flushCss()}</style>`);
};
