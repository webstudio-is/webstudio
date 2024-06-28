import * as csstree from "css-tree";
import {
  LayersValue,
  StyleValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import { parseCssValue as parseCssValueLonghand } from "./parse-css-value";
import * as parsers from "./property-parsers/parsers";
import * as toLonghand from "./property-parsers/to-longhand";
import { camelCase } from "change-case";
import { expandShorthands } from "./shorthands";
import { parseBackground } from "./property-parsers";

/**
 * Store prefixed properties without change
 * and convert to camel case only unprefixed properties
 * @todo stop converting to camel case and use hyphenated format
 */
export const normalizePropertyName = (property: string) => {
  // these are manually added with pascal case
  if (property === "-webkit-font-smoothing") {
    return "WebkitFontSmoothing";
  }
  if (property === "-moz-osx-font-smoothing") {
    return "MozOsxFontSmoothing";
  }
  if (property.startsWith("-")) {
    return property;
  }
  return camelCase(property);
};

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

type Selector = string;

export type Styles = Record<Selector, Array<EmbedTemplateStyleDecl>>;

type Longhand = keyof typeof toLonghand;

const parseCssValue = (
  property: string,
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
    const normalizedProperty = normalizePropertyName(property);
    if (value === "") {
      // Keep the browser behavior when property is defined with an empty value e.g. `color:;`
      // It may override some existing value and effectively set it to "unset";
      final.set(normalizedProperty, { type: "keyword", value: "unset" });
      continue;
    }

    // @todo https://github.com/webstudio-is/webstudio/issues/3399
    if (value.startsWith("var(")) {
      final.set(normalizedProperty, { type: "keyword", value: "unset" });
      continue;
    }

    final.set(
      normalizedProperty,
      parseCssValueLonghand(normalizedProperty as StyleProperty, value)
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

const convertBackgroundProps = (styles: EmbedTemplateStyleDecl[]) => {
  const backgroundProps = [
    "backgroundAttachment",
    "backgroundClip",
    "backgroundBlendMode",
    "backgroundOrigin",
    "backgroundPosition",
    "backgroundRepeat",
    "backgroundSize",
  ];

  return styles
    .map((style) => {
      if (backgroundProps.includes(style.property)) {
        if (style.value.type !== "unparsed") {
          const safeStyle = LayersValue.safeParse({
            type: "layers",
            value: [style.value],
          });
          if (safeStyle.success) {
            return {
              property: style.property,
              value: safeStyle.data,
            };
          }
          return style;
        }

        const layersResult = LayersValue.safeParse({
          type: "layers",
          value: style.value.value
            .split(",")
            .map((val) => parseCssValueLonghand(style.property, val)),
        });

        if (layersResult.success) {
          return {
            property: style.property,
            value: layersResult.data,
          };
        }

        console.error(
          `Failed to convert background property ${
            style.property
          } with value ${JSON.stringify(style.value)} to layers`
        );
      }
      return style;
    })
    .map((style) => {
      if (style.property === "backgroundImage") {
        if (style.value.type !== "unparsed") {
          const safeStyle = LayersValue.safeParse({
            type: "layers",
            value: [style.value],
          });
          if (safeStyle.success) {
            return {
              property: style.property,
              value: safeStyle.data,
            };
          }
          return style;
        }

        const { backgroundImage } = parseBackground(style.value.value);

        return {
          property: style.property,
          value: backgroundImage,
        };
      }
      return style;
    });
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
        unprefixProperty(node.property),
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
              property: normalizePropertyName(
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

  const stylesResult: Styles = {};

  for (const [selector, declarations] of Object.entries(styles)) {
    stylesResult[selector] = convertBackgroundProps(declarations);
  }

  return stylesResult;
};
