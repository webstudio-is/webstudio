import type { StyleProperty } from "@webstudio-is/css-data";
import hyphenate from "hyphenate-style-name";

export const toProperty = (property: StyleProperty) => {
  // Currently its a non-standard property and is only officially supported via -webkit- prefix.
  // Safari illegally supports it without the prefix.
  // https://caniuse.com/background-clip-text
  if (property === "backgroundClip") {
    return "-webkit-background-clip";
  }
  return hyphenate(property);
};
