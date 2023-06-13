import type { WritableDeep } from "type-fest";
import type { Html } from "./html";
import * as exportedHtml from "./html";
export const html: Html = exportedHtml;

export * from "./__generated__/keyword-values";
export * from "./__generated__/units";
export {
  properties as propertyDescriptions,
  declarations as declarationDescriptions,
} from "./__generated__/property-value-descriptions";
export * from "./schema";

// longhand property parsers
export * from "./property-parsers/index";
// shorthand property parsers
export * from "./parse-css-value";
export * from "./parse-css";

import { properties as generatedProperties } from "./__generated__/properties";

// convert to writable to avoid conflicts with schema type
export const properties = generatedProperties as WritableDeep<
  typeof generatedProperties
>;
