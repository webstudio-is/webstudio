import type { CssProperty } from "../schema";

/**
 * Hyphenates a camelcased CSS property name
 */
export const hyphenateProperty = (property: string): CssProperty =>
  property.replace(
    /[A-Z]/g,
    (match) => "-" + match.toLowerCase()
  ) as CssProperty;
