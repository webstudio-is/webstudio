import * as csstree from "css-tree";
import {
  StyleValue,
  type Style as S,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import { parseCssValue as parseCssValueLonghand } from "./parse-css-value";
import * as parsers from "./property-parsers/parsers";
import * as toLonghand from "./property-parsers/to-longhand";
import { camelCase } from "change-case";

type Selector = string;

export type Styles = Record<Selector, Array<EmbedTemplateStyleDecl>>;

type Longhand = keyof typeof toLonghand;

const parseCssValue = (
  property: Longhand | StyleProperty,
  value: string
): S => {
  const unwrap = toLonghand[property as Longhand];

  if (typeof unwrap === "function") {
    const longhands = unwrap(value);

    return Object.fromEntries(
      Object.entries(longhands).map(([property, value]) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore @todo remove this ignore: property is a `keyof typeof longhands` which is a key in parsers but TS can't infer the link
        const valueParser = parsers[property];

        if (typeof valueParser === "function") {
          return [property, valueParser(value)];
        }

        if (Array.isArray(value)) {
          return [
            property,
            {
              type: "invalid",
              value: value.join(""),
            },
          ];
        }

        if (value === undefined || value === "") {
          return [property, { type: "invalid", value: "" }];
        }

        return [
          property,
          parseCssValueLonghand(property as StyleProperty, value),
        ];
      })
    );
  }

  return {
    [property]: parseCssValueLonghand(property as StyleProperty, value),
  };
};

const cssTreeTryParse = (input: string) => {
  try {
    const ast = csstree.parse(input);
    return ast;
  } catch {
    return;
  }
};

export const parseCss = (css: string) => {
  const ast = cssTreeTryParse(css);
  let selectors: Selector[] = [];
  let states = new Map<Selector, string>();
  const styles: Styles = {};

  if (ast === undefined) {
    return styles;
  }

  const addToLastSelector = (name: string) => {
    selectors[selectors.length - 1] =
      `${selectors[selectors.length - 1]}${name}`;
  };

  csstree.walk(ast, (node, item) => {
    if (node.type === "SelectorList") {
      selectors = [];
    }

    if (node.type === "Selector") {
      states = new Map();
    }

    if (node.type === "Combinator") {
      addToLastSelector(node.name);
    }

    if (node.type === "ClassSelector" || node.type === "TypeSelector") {
      if (item?.prev && item.prev.data.type === "Combinator") {
        addToLastSelector(node.name);
      } else {
        selectors.push(node.name);
      }
      if (item?.next && item.next.data.type === "PseudoClassSelector") {
        states.set(node.name, `:${item.next.data.name}`);
      }
      return;
    }

    if (node.type === "Declaration") {
      const stringValue = csstree.generate(node.value);

      const parsedCss = parseCssValue(
        node.property as Longhand | StyleProperty,
        stringValue
      );

      (Object.entries(parsedCss) as [StyleProperty, StyleValue][]).forEach(
        ([property, value]) => {
          try {
            StyleValue.parse(value);
            property = camelCase(property) as StyleProperty;
            selectors.forEach((selector) => {
              if (styles[selector] === undefined) {
                styles[selector] = [];
              }
              const style: EmbedTemplateStyleDecl = {
                property,
                value,
              };
              if (states.has(selector)) {
                style.state = states.get(selector);
                states.delete(selector);
                styles[selector].push(style);
                return;
              }
              styles[selector].unshift(style);
            });
          } catch (error) {
            console.error("Bad CSS declaration", error, parsedCss);
          }
        }
      );
    }
  });

  return styles;
};
