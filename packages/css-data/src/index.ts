import type { WritableDeep } from "type-fest";
import type { Html } from "./html";
import * as exportedHtml from "./html";
export const html: Html = exportedHtml;

export * from "./__generated__/keyword-values";
export * from "./__generated__/units";
export * from "./schema";

import { properties as generatedProperties } from "./__generated__/properties";

// convert to writable to avoid conflicts with schema type
export const properties = generatedProperties as WritableDeep<
  typeof generatedProperties
>;
