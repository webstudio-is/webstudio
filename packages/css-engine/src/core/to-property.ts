import type { StyleProperty } from "../schema";

/**
 * Hyphenates a camelcased CSS property name
 */
export const hyphenateProperty = (property: string) =>
  property.replace(/[A-Z]/g, (match) => "-" + match.toLowerCase());

export const toProperty = (property: StyleProperty) => {
  // chrome started to support unprefixed background-clip in December 2023
  // https://caniuse.com/background-clip-text
  // @todo stop prerfixed maybe one year later
  if (property === "backgroundClip") {
    return "-webkit-background-clip";
  }
  return hyphenateProperty(property);
};
