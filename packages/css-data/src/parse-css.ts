import * as csstree from "css-tree";
import { parseCssValue } from "./parse-css-value";
import { type StyleProperty, StyleValue } from "./schema";

type Selector = string;
type Style = {
  // @todo add support for states and media queries in addition to declarations
  property: StyleProperty;
  value: StyleValue;
};

export type Styles = Record<Selector, Style[]>;
export const parseCss = function cssToWS(css: string) {
  const ast = csstree.parse(css);

  let selectors: Selector[] = [];
  const styles: Styles = {};

  csstree.walk(ast, (node, item) => {
    if (node.type === "SelectorList") {
      selectors = [];
    }
    if (node.type === "ClassSelector") {
      if (!item.prev && !item.next) {
        selectors.push(node.name);
        return;
      }
      return;
    }

    if (node.type === "Declaration") {
      const property = node.property as StyleProperty;
      const stringValue = csstree.generate(node.value);
      const value = parseCssValue(property, stringValue);
      try {
        StyleValue.parse(value);
        selectors.forEach((selector) => {
          if (Array.isArray(styles[selector])) {
            styles[selector].push({ property, value });
          } else {
            styles[selector] = [{ property, value }];
          }
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(
            true,
            `Declaration parsing for \`${selectors.join(
              ", "
            )}.${property}: ${stringValue}\` failed:\n\n${JSON.stringify(
              value,
              null,
              2
            )}`
          );
        }
      }
    }
  });

  return styles;
};
