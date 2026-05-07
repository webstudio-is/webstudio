import { hyphenateProperty, toValue } from "@webstudio-is/css-engine";
import {
  camelCaseProperty,
  expandShorthands,
  parseCssValue,
} from "@webstudio-is/css-data";
import {
  getStyleDeclKey,
  type StyleDecl,
  type Styles,
} from "@webstudio-is/sdk";

const migratedShorthands = new Set([
  "overflow",
  "transition",
  "white-space",
  "background-position",
]);

export const migrateStylesMutable = (styles: Styles) => {
  for (const [styleDeclKey, styleDecl] of styles) {
    const property = hyphenateProperty(styleDecl.property) as string;

    if (migratedShorthands.has(property) === false) {
      continue;
    }

    styles.delete(styleDeclKey);
    const longhands = expandShorthands([[property, toValue(styleDecl.value)]]);
    for (const [hyphenedProperty, value] of longhands) {
      const longhandStyleDecl: StyleDecl = {
        ...styleDecl,
        property: camelCaseProperty(hyphenedProperty),
        value: parseCssValue(hyphenedProperty, value),
      };
      styles.set(getStyleDeclKey(longhandStyleDecl), longhandStyleDecl);
    }
  }
};
