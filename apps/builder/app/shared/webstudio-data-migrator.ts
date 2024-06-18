import { camelCase } from "change-case";
import {
  getStyleDeclKey,
  type StyleDecl,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import { expandShorthands, parseCssValue } from "@webstudio-is/css-data";

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
    const property = styleDecl.property as string;

    // expand overflow shorthand into overflow-x and overflow-y longhands
    if (property === "overflow") {
      data.styles.delete(styleDeclKey);
      const longhands = expandShorthands([
        [property, toValue(styleDecl.value)],
      ]);
      for (const [hyphenedProperty, value] of longhands) {
        const longhandProperty = camelCase(hyphenedProperty) as StyleProperty;
        const longhandStyleDecl: StyleDecl = {
          ...styleDecl,
          property: longhandProperty,
          value: parseCssValue(longhandProperty, value),
        };
        data.styles.set(getStyleDeclKey(longhandStyleDecl), longhandStyleDecl);
      }
    }
  }
};
