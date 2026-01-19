export { html } from "./__generated__/html";
export * from "./__generated__/keyword-values";
export * from "./__generated__/units";
export {
  properties as propertyDescriptions,
  declarations as declarationDescriptions,
  propertySyntaxesGenerated as propertySyntaxes,
} from "./__generated__/property-value-descriptions";
export * from "./__generated__/animatable-properties";
export * from "./__generated__/pseudo-elements";
export * from "./__generated__/pseudo-classes";
export {
  pseudoClassDescriptions,
  pseudoElementDescriptions,
} from "./__generated__/pseudo-selector-descriptions";
export * from "./property-parsers";

// shorthand property parsers
export * from "./parse-css-value";
export * from "./parse-css";
export * from "./shorthands";
export { shorthandProperties } from "./__generated__/shorthand-properties";

export { properties as propertiesData } from "./__generated__/properties";

// Utility functions
import { pseudoElements } from "./__generated__/pseudo-elements";

/**
 * Check if a state string represents a pseudo-element (e.g., "::before", "::after")
 * rather than a pseudo-class (e.g., ":hover", ":focus")
 */
export const isPseudoElement = (state: string): boolean => {
  if (!state) {
    return false;
  }

  // Pseudo-elements start with :: (or single : for legacy syntax)
  // Remove the colons and check against the list
  const normalized = state.replace(/^::?/, "");
  return (pseudoElements as readonly string[]).includes(normalized);
};

export {
  validateSelector,
  type SelectorValidationResult,
} from "./selector-validation";
