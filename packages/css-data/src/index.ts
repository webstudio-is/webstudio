import type { WritableDeep } from "type-fest";

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

export { parseTailwindToWebstudio } from "./tailwind-parser/parse";

import { properties as generatedProperties } from "./__generated__/properties";

// convert to writable to avoid conflicts with schema type
export const properties = generatedProperties as WritableDeep<
  typeof generatedProperties
>;
