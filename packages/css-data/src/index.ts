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

// longhand property parsers
export * from "./property-parsers/index";
// shorthand property parsers
export * from "./parse-css-value";
export * from "./parse-css";
export * from "./shorthands";
export { shorthandProperties } from "./__generated__/shorthand-properties";

export { parseTailwindToWebstudio } from "./tailwind-parser/parse";

export { properties as propertiesData } from "./__generated__/properties";
