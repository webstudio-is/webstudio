import {
  getStyleDeclKey,
  type StyleDecl,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { hyphenateProperty, toValue } from "@webstudio-is/css-engine";
import {
  camelCaseProperty,
  expandShorthands,
  parseCssValue,
} from "@webstudio-is/css-data";

/**
 *
 * Transform loaded data and sync into server
 * before passing into application
 * should be idempotent because can be executed multiple times
 *
 * Very basic version of client migrations
 * Should be versioned eventually to avoid running every time
 *
 * For now patch is prevented by excluding empty transactions from sync queue
 *
 */
export const migrateWebstudioDataMutable = (data: WebstudioData) => {
  for (const [styleDeclKey, styleDecl] of data.styles) {
    const property = hyphenateProperty(styleDecl.property) as string;

    // expands overflow shorthand into overflow-x and overflow-y longhands
    // expands transition shorthand into transition-property, transition-duration, transition-timing-function, transition-delay longhands
    // expands white-space into white-space-collapse and text-wrap-mode
    if (
      property === "overflow" ||
      property === "transition" ||
      property === "white-space" ||
      property === "background-position"
    ) {
      data.styles.delete(styleDeclKey);
      const longhands = expandShorthands([
        [property, toValue(styleDecl.value)],
      ]);
      for (const [hyphenedProperty, value] of longhands) {
        const longhandStyleDecl: StyleDecl = {
          ...styleDecl,
          property: camelCaseProperty(hyphenedProperty),
          value: parseCssValue(hyphenedProperty, value),
        };
        data.styles.set(getStyleDeclKey(longhandStyleDecl), longhandStyleDecl);
      }
    }
  }
};
