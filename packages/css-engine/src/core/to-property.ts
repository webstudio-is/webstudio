import hyphenate from "hyphenate-style-name";
import type { StyleProperty } from "../schema";

export const toProperty = (property: StyleProperty) => {
  // chrome started to support unprefixed background-clip in December 2023
  // https://caniuse.com/background-clip-text
  // @todo stop prerfixed maybe one year later
  if (property === "backgroundClip") {
    return "-webkit-background-clip";
  }
  return hyphenate(property);
};
