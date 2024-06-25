/**
 * Hyphenates a camelcased CSS property name
 */
export const hyphenateProperty = (property: string) =>
  property.replace(/[A-Z]/g, (match) => "-" + match.toLowerCase());
