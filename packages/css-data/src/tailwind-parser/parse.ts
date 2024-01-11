import * as csstree from "css-tree";
import camelCase from "camelcase";
import { UnoGenerator, createGenerator } from "@unocss/core";
import { type Theme, presetUno } from "@unocss/preset-uno";
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import { expandTailwindShorthand } from "./shorthand";
import { substituteVariables } from "./substitute";
import warnOnce from "warn-once";
import { parseCssValue } from "../parse-css-value";
import { LayersValue, type StyleProperty } from "@webstudio-is/css-engine";
import { parseBoxShadow } from "../property-parsers/box-shadow";

let unoLazy: UnoGenerator<Theme> | undefined = undefined;

const uno = () => {
  unoLazy = createGenerator({
    presets: [presetUno()],
  });
  return unoLazy;
};

/**
 * Parses Tailwind classes to CSS by expanding shorthands and substituting variables.
 */
export const parseTailwindToCss = async (classes: string, warn = warnOnce) => {
  const expandedClasses = expandTailwindShorthand(classes);
  const generated = await uno().generate(expandedClasses, { preflights: true });

  const cssWithClasses = substituteVariables(generated.css, warn);
  return cssWithClasses;
};

/**
 * Convert CSS prepared by parseTailwindToCss to Webstudio format.
 */
const parseCssToWebstudio = (css: string) => {
  const ast = csstree.parse(css);
  const styles: EmbedTemplateStyleDecl[] = [];

  csstree.walk(ast, {
    enter: (node, item, list) => {
      if (node.type === "Declaration") {
        const property = camelCase(node.property.trim());
        const cssValue = csstree.generate(node.value);

        const style: EmbedTemplateStyleDecl = {
          property: property as StyleProperty,
          value: parseCssValue(property as StyleProperty, cssValue),
        };

        styles.push(style);
      }
    },
  });

  return styles;
};

/**
 * In WebStudio, background-related properties are managed using a specialized "layer" type.
 **/
const postprocessBackgrounds = (
  styles: EmbedTemplateStyleDecl[],
  warn = warnOnce
) => {
  const backgroundProps = [
    "backgroundAttachment",
    "backgroundClip",
    "backgroundBlendMode",
    "backgroundImage",
    "backgroundOrigin",
    "backgroundPosition",
    "backgroundRepeat",
    "backgroundSize",
  ];

  return styles.map((style) => {
    if (backgroundProps.includes(style.property)) {
      const layersResult = LayersValue.safeParse({
        type: "layers",
        value: [style.value],
      });

      if (layersResult.success) {
        return {
          property: style.property,
          value: layersResult.data,
        };
      }
      warn(
        true,
        `Failed to convert background property ${
          style.property
        } with value ${JSON.stringify(style.value)} to layers`
      );
    }
    return style;
  });
};

/**
 * Tailwind by default has border-style: solid, but WebStudio doesn't.
 * Provide boder-style: solid if border-width is provided.
 **/
const postprocessBorder = (styles: EmbedTemplateStyleDecl[]) => {
  const borderPairs = [
    ["borderTopWidth", "borderTopStyle"],
    ["borderRightWidth", "borderRightStyle"],
    ["borderBottomWidth", "borderBottomStyle"],
    ["borderLeftWidth", "borderLeftStyle"],
  ] as const;

  const resultStyles = [...styles];

  for (const [borderWidthProperty, borderStyleProperty] of borderPairs) {
    const hasWidth = styles.some(
      (style) => style.property === borderWidthProperty
    );
    const hasStyle = styles.some(
      (style) => style.property === borderStyleProperty
    );
    if (hasWidth && hasStyle === false) {
      resultStyles.push({
        property: borderStyleProperty,
        value: {
          type: "keyword",
          value: "solid",
        },
      });
    }
  }
  return resultStyles;
};

/**
 * In WebStudio, box-shadow property is managed using a specialized "layer" type.
 **/
const postprocessBoxShadows = (styles: EmbedTemplateStyleDecl[]) => {
  return styles.map((style) => {
    if (style.property === "boxShadow" && style.value.type === "unparsed") {
      const shadowStyle = parseBoxShadow(style.value.value);
      return {
        property: style.property,
        value: shadowStyle,
      };
    }
    return style;
  });
};

/**
 * Parses Tailwind classes to webstudio template format.
 */
export const parseTailwindToWebstudio = async (
  classes: string,
  warn = warnOnce
) => {
  const css = await parseTailwindToCss(classes, warn);
  let styles = parseCssToWebstudio(css);
  // postprocessing
  styles = postprocessBackgrounds(styles, warn);
  styles = postprocessBorder(styles);
  styles = postprocessBoxShadows(styles);

  return styles;
};
