/**
 * Quik and dirty implementation of tailwind classes conversion to webstudio styles.
 */
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import * as variables from "./radix-variables";
import { theme } from "./tailwind-theme";
import { parseCssValue } from "@webstudio-is/css-data";

// https://github.com/tailwindlabs/tailwindcss/blob/master/src/css/preflight.css
export const preflight = (): EmbedTemplateStyleDecl[] => [
  {
    property: "borderTopStyle",
    value: { type: "keyword", value: "solid" },
  },
  {
    property: "borderRightStyle",
    value: { type: "keyword", value: "solid" },
  },
  {
    property: "borderBottomStyle",
    value: { type: "keyword", value: "solid" },
  },
  {
    property: "borderLeftStyle",
    value: { type: "keyword", value: "solid" },
  },

  {
    property: "borderTopColor",
    value: variables.border,
  },
  {
    property: "borderRightColor",
    value: variables.border,
  },
  {
    property: "borderBottomColor",
    value: variables.border,
  },
  {
    property: "borderLeftColor",
    value: variables.border,
  },
];

export const z = (value: number): EmbedTemplateStyleDecl[] => [
  {
    property: "zIndex",
    value: { type: "unit", value, unit: "number" },
  },
];

export const overflow = (
  value: "hidden" | "visible" | "scroll" | "auto"
): EmbedTemplateStyleDecl[] => [
  {
    property: "overflow",
    value: { type: "keyword", value },
  },
];

export const rounded = (value: "md"): EmbedTemplateStyleDecl[] => [
  {
    property: "borderTopLeftRadius",
    value: variables.radius,
  },
  {
    property: "borderTopRightRadius",
    value: variables.radius,
  },
  {
    property: "borderBottomRightRadius",
    value: variables.radius,
  },
  {
    property: "borderBottomLeftRadius",
    value: variables.radius,
  },
];

export const border = (borderWidth?: number): EmbedTemplateStyleDecl[] => {
  const key = `${borderWidth ?? "DEFAULT"}`;
  const valueString = theme("borderWidth")?.[key] ?? "1px";

  const value = parseCssValue("borderTopWidth", valueString);
  return [
    { property: "borderTopWidth", value },
    { property: "borderRightWidth", value },
    { property: "borderBottomWidth", value },
    { property: "borderLeftWidth", value },
  ];
};

export const px = (padding: number): EmbedTemplateStyleDecl[] => {
  const key = `${padding}`;
  const valueString = theme("padding")?.[key] ?? "0";
  const value = parseCssValue("paddingLeft", valueString);

  return [
    { property: "paddingLeft", value },
    { property: "paddingRight", value },
  ];
};

export const py = (padding: number): EmbedTemplateStyleDecl[] => {
  const key = `${padding}`;
  const valueString = theme("padding")?.[key] ?? "0";
  const value = parseCssValue("paddingTop", valueString);

  return [
    { property: "paddingTop", value },
    { property: "paddingBottom", value },
  ];
};

export const p = (padding: number): EmbedTemplateStyleDecl[] => {
  return [...px(padding), ...py(padding)];
};

export const bg = (color: "popover"): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "backgroundColor",
      value: variables[color],
    },
  ];
};

const textSizes = ["sm", "base", "lg"] as const;
type TextSize = (typeof textSizes)[number];

const isTextSize = (value: string): value is TextSize =>
  textSizes.includes(value as TextSize);

export const text = (
  sizeOrColor: TextSize | "popoverForeground"
): EmbedTemplateStyleDecl[] => {
  const result: EmbedTemplateStyleDecl[] = [];

  if (isTextSize(sizeOrColor)) {
    const valueArr = theme("fontSize")?.[sizeOrColor];
    // === false not working because of ts
    if (!Array.isArray(valueArr)) {
      return [];
    }

    const [fontSizeString, lineHeightStringOrObject] = valueArr;

    const fontSize = parseCssValue("fontSize", fontSizeString);
    const lineHeightString =
      typeof lineHeightStringOrObject === "string"
        ? lineHeightStringOrObject
        : lineHeightStringOrObject.lineHeight;

    result.push({ property: "fontSize", value: fontSize });
    if (lineHeightString !== undefined) {
      const lineHeight = parseCssValue("lineHeight", lineHeightString);
      result.push({ property: "lineHeight", value: lineHeight });
    }
    return result;
  }

  return [
    {
      property: "color",
      value: variables[sizeOrColor],
    },
  ];
};

export const shadow = (shadowSize: "md"): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "boxShadow",
      value: {
        type: "layers",

        value: [
          {
            type: "tuple",
            value: [
              { type: "unit", unit: "px", value: 0 },
              { type: "unit", unit: "px", value: 4 },
              { type: "unit", unit: "px", value: 6 },
              { type: "unit", unit: "px", value: -1 },
              { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
            ],
          },
          {
            type: "tuple",
            value: [
              { type: "unit", unit: "px", value: 0 },
              { type: "unit", unit: "px", value: 2 },
              { type: "unit", unit: "px", value: 4 },
              { type: "unit", unit: "px", value: -2 },
              { type: "rgb", alpha: 0.1, r: 0, g: 0, b: 0 },
            ],
          },
        ],
      },
    },
  ];
};
