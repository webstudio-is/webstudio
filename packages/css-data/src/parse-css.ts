import * as csstree from "css-tree";
import { StyleValue, type StyleProperty } from "@webstudio-is/css-engine";
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import { parseCssValue as parseCssValueLonghand } from "./parse-css-value";
import * as parsers from "./property-parsers/parsers";
import * as toLonghand from "./property-parsers/to-longhand";
import { camelCase } from "change-case";
import { expandShorthands } from "./shorthands";

// @todo we don't parse correctly most of them if not all
const prefixedProperties = [
  "-webkit-box-orient",
  "-webkit-line-clamp",
  "-webkit-font-smoothing",
  "-moz-osx-font-smoothing",
  "-webkit-tap-highlight-color",
  "-webkit-overflow-scrolling",
];
const prefixes = ["webkit", "moz", "ms", "o"];
const prefixRegex = new RegExp(`^-(${prefixes.join("|")})-`);

const unprefixProperty = (property: string) => {
  if (prefixedProperties.includes(property)) {
    return property;
  }
  return property.replace(prefixRegex, "");
};

const camelCaseProperty = (property: string) => {
  let camelcased = camelCase(property);
  if (property[0] === "-") {
    camelcased = camelcased[0].toLocaleUpperCase() + camelcased.slice(1);
  }
  return camelcased;
};

type Selector = string;

export type Styles = Record<Selector, Array<EmbedTemplateStyleDecl>>;

type Longhand = keyof typeof toLonghand;

const parseCssValue = (
  property: Longhand | StyleProperty,
  value: string
): Map<StyleProperty, StyleValue> => {
  const unwrap = toLonghand[property as Longhand];

  if (typeof unwrap === "function") {
    const longhands = unwrap(value);

    return new Map(
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
    ) as Map<StyleProperty, StyleValue>;
  }

  const expanded = new Map(expandShorthands([[property, value]]));
  const final = new Map();
  for (const [property, value] of expanded) {
    if (value === "") {
      // Keep the browser behavior when property is defined with an empty value e.g. `color:;`
      // It may override some existing value and effectively set it to "unset";
      final.set(property, { type: "keyword", value: "unset" });
      continue;
    }

    // @todo https://github.com/webstudio-is/webstudio/issues/3399
    if (value.startsWith("var(")) {
      final.set(property, { type: "keyword", value: "unset" });
      continue;
    }

    final.set(
      property,
      parseCssValueLonghand(property as StyleProperty, value)
    );
  }
  return final;
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
  let states = new Map<Selector, Array<string | undefined>>();
  const styles: Styles = {};

  if (ast === undefined) {
    return styles;
  }

  csstree.walk(ast, (node, item) => {
    if (node.type === "SelectorList") {
      selectors = [];
      states = new Map();
    }

    if (node.type === "ClassSelector" || node.type === "TypeSelector") {
      // We don't support nesting yet.
      if (
        (item?.prev && item.prev.data.type === "Combinator") ||
        (item?.next && item.next.data.type === "Combinator")
      ) {
        return;
      }

      selectors.push(node.name);

      const statesArray = states.get(node.name) ?? [];
      states.set(node.name, statesArray);
      if (item?.next && item.next.data.type === "PseudoElementSelector") {
        statesArray.push(`::${item.next.data.name}`);
      } else if (item?.next && item.next.data.type === "PseudoClassSelector") {
        statesArray.push(`:${item.next.data.name}`);
      } else {
        statesArray.push(undefined);
      }

      return;
    }

    if (node.type === "Declaration") {
      const stringValue = csstree.generate(node.value);

      const parsedCss = parseCssValue(
        unprefixProperty(node.property) as Longhand | StyleProperty,
        stringValue
      );

      for (const [property, value] of parsedCss) {
        try {
          StyleValue.parse(value);
          selectors.forEach((selector, index) => {
            let declarations = styles[selector];
            if (declarations === undefined) {
              declarations = styles[selector] = [];
            }
            const styleDecl: EmbedTemplateStyleDecl = {
              property: camelCaseProperty(
                unprefixProperty(property)
              ) as StyleProperty,
              value,
            };

            const statesArray = states.get(selector) ?? [];
            if (statesArray[index]) {
              styleDecl.state = statesArray[index];
            }

            // Checks if there is already a prorperty that is exactly the same and will be overwritten,
            // so we may as well remove it from the data.
            const existingIndex = declarations.findIndex(
              (decl) =>
                decl.property === styleDecl.property &&
                decl.state === styleDecl.state
            );
            if (existingIndex !== -1) {
              declarations.splice(existingIndex, 1);
            }
            declarations.push(styleDecl);
          });
        } catch (error) {
          console.error("Bad CSS declaration", error, parsedCss);
        }
      }
    }
  });

  return styles;
};
