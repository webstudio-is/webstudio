/**
 * Quik and dirty implementation of tailwind classes conversion to webstudio styles.
 */
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import { theme } from "./tailwind-theme";
import { parseCssValue, parseBoxShadow } from "@webstudio-is/css-data";
import type { EvaluatedDefaultTheme } from "./radix-common-types";

// https://github.com/tailwindlabs/tailwindcss/blob/master/src/css/preflight.css
const preflight = (): EmbedTemplateStyleDecl[] => {
  const borderColorValue = parseCssValue("color", theme("colors")["border"]);

  return [
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
      value: borderColorValue,
    },
    {
      property: "borderRightColor",
      value: borderColorValue,
    },
    {
      property: "borderBottomColor",
      value: borderColorValue,
    },
    {
      property: "borderLeftColor",
      value: borderColorValue,
    },
  ];
};

export const z = (
  zIndex?: StringEnumToNumeric<keyof EvaluatedDefaultTheme["zIndex"]>
): EmbedTemplateStyleDecl[] => {
  const valueString = theme("zIndex")[zIndex ?? "auto"];
  const value = parseCssValue("zIndex", valueString);

  return [
    {
      property: "zIndex",
      value,
    },
  ];
};

export const overflow = (
  value: "hidden" | "visible" | "scroll" | "auto"
): EmbedTemplateStyleDecl[] => [
  {
    property: "overflow",
    value: { type: "keyword", value },
  },
];

export const rounded = (
  radius?: keyof EvaluatedDefaultTheme["borderRadius"]
): EmbedTemplateStyleDecl[] => {
  const valueString = theme("borderRadius")[radius ?? "DEFAULT"];
  const value = parseCssValue("borderTopWidth", valueString);

  return [
    {
      property: "borderTopLeftRadius",
      value,
    },
    {
      property: "borderTopRightRadius",
      value,
    },
    {
      property: "borderBottomRightRadius",
      value,
    },
    {
      property: "borderBottomLeftRadius",
      value,
    },
  ];
};

type StringEnumToNumeric<T extends string> = T extends `${infer Z extends
  number}`
  ? Z
  : never;

type NonNumeric<T extends string> = T extends `${infer Z extends number}`
  ? never
  : T;

export const border = (
  borderWidth?: StringEnumToNumeric<keyof EvaluatedDefaultTheme["borderWidth"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${borderWidth ?? "DEFAULT"}` as const;

  const valueString = theme("borderWidth")?.[key] ?? "1px";

  const value = parseCssValue("borderTopWidth", valueString);
  return [
    ...preflight(),
    { property: "borderTopWidth", value },
    { property: "borderRightWidth", value },
    { property: "borderBottomWidth", value },
    { property: "borderLeftWidth", value },
  ];
};

export const px = (
  padding: StringEnumToNumeric<keyof EvaluatedDefaultTheme["padding"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${padding}` as const;
  const valueString = theme("padding")?.[key] ?? "0";
  const value = parseCssValue("paddingLeft", valueString);

  return [
    { property: "paddingLeft", value },
    { property: "paddingRight", value },
  ];
};

export const py = (
  padding: StringEnumToNumeric<keyof EvaluatedDefaultTheme["padding"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${padding}` as const;
  const valueString = theme("padding")[key];
  const value = parseCssValue("paddingTop", valueString);

  return [
    { property: "paddingTop", value },
    { property: "paddingBottom", value },
  ];
};

export const p = (
  padding: StringEnumToNumeric<keyof EvaluatedDefaultTheme["padding"]>
): EmbedTemplateStyleDecl[] => {
  return [...px(padding), ...py(padding)];
};

export const w = (
  spacing:
    | StringEnumToNumeric<keyof EvaluatedDefaultTheme["width"]>
    | NonNumeric<keyof EvaluatedDefaultTheme["width"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${spacing}` as const;
  const valueString = theme("width")?.[key] ?? "0";
  const value = parseCssValue("width", valueString);

  return [{ property: "width", value }];
};

export const maxW = (
  spacing:
    | StringEnumToNumeric<keyof EvaluatedDefaultTheme["maxWidth"]>
    | NonNumeric<keyof EvaluatedDefaultTheme["maxWidth"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${spacing}` as const;
  const valueString = theme("maxWidth")?.[key] ?? "0";
  const value = parseCssValue("width", valueString);

  return [{ property: "maxWidth", value }];
};

export const inset = (
  spacing: StringEnumToNumeric<keyof EvaluatedDefaultTheme["spacing"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${spacing}` as const;
  const valueString = theme("spacing")?.[key] ?? "0";
  const value = parseCssValue("left", valueString);

  return [
    { property: "top", value },
    { property: "right", value },
    { property: "bottom", value },
    { property: "left", value },
  ];
};

export const centerAbsolute = (): EmbedTemplateStyleDecl[] => [
  {
    property: "top",
    value: { type: "unit", value: 50, unit: "%" },
  },
  {
    property: "left",
    value: { type: "unit", value: 50, unit: "%" },
  },

  {
    property: "transform",
    value: {
      type: "tuple",
      value: [
        { type: "unparsed", value: "translateX(-50%)" },
        { type: "unparsed", value: "translateY(-50%)" },
      ],
    },
  },

  // translate-x-[-50%] translate-y-[-50%]
];

export const backdropBlur = (
  blur: keyof EvaluatedDefaultTheme["blur"]
): EmbedTemplateStyleDecl[] => {
  const valueString = theme("blur")[blur];
  const value = {
    type: "unparsed" as const,
    value: `blur(${valueString})`,
  };

  return [{ property: "backdropFilter", value }];
};

export const bg = (
  color: keyof EvaluatedDefaultTheme["colors"],
  alpha?: number
): EmbedTemplateStyleDecl[] => {
  const value = parseCssValue("backgroundColor", theme("colors")[color]);

  if (alpha !== undefined && value.type === "rgb") {
    value.alpha = alpha / 100;
  }

  return [
    {
      property: "backgroundColor",
      value,
    },
  ];
};

export const fixed = (): EmbedTemplateStyleDecl[] => {
  return [{ property: "position", value: { type: "keyword", value: "fixed" } }];
};

export const grid = (): EmbedTemplateStyleDecl[] => {
  return [{ property: "display", value: { type: "keyword", value: "grid" } }];
};

export const flex = (): EmbedTemplateStyleDecl[] => {
  return [{ property: "display", value: { type: "keyword", value: "flex" } }];
};

export const gap = (
  gapValue: StringEnumToNumeric<keyof EvaluatedDefaultTheme["spacing"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${gapValue}` as const;
  const valueString = theme("spacing")?.[key] ?? "0";
  const value = parseCssValue("rowGap", valueString);

  return [
    { property: "rowGap", value },
    { property: "columnGap", value },
  ];
};

export const outline = (value: "none"): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "outlineWidth",
      value: { type: "unit", value: 2, unit: "px" },
    },
    {
      property: "outlineStyle",
      value: { type: "keyword", value: "solid" },
    },
    {
      property: "outlineColor",
      value: { type: "keyword", value: "transparent" },
    },
    {
      property: "outlineOffset",
      value: { type: "unit", value: 2, unit: "px" },
    },
  ];
};

const textSizes = [
  "sm",
  "base",
  "lg",
  "xs",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
] as const satisfies readonly (keyof EvaluatedDefaultTheme["fontSize"])[];
type TextSize = keyof EvaluatedDefaultTheme["fontSize"];

const isTextSize = (value: string): value is TextSize =>
  textSizes.includes(value as TextSize);

export const text = (
  sizeOrColor: TextSize | keyof EvaluatedDefaultTheme["colors"]
): EmbedTemplateStyleDecl[] => {
  if (isTextSize(sizeOrColor)) {
    const valueArr = theme("fontSize")[sizeOrColor];
    const [fontSizeString, { lineHeight: lineHeightString }] = valueArr;

    const fontSize = parseCssValue("fontSize", fontSizeString);
    const lineHeight = parseCssValue("lineHeight", lineHeightString);
    return [
      { property: "fontSize", value: fontSize },
      { property: "lineHeight", value: lineHeight },
    ];
  }

  const value = parseCssValue("color", theme("colors")[sizeOrColor]);

  return [
    {
      property: "color",
      value,
    },
  ];
};

export const shadow = (
  shadowSize: keyof EvaluatedDefaultTheme["boxShadow"]
): EmbedTemplateStyleDecl[] => {
  const valueString = theme("boxShadow")[shadowSize];
  const value = parseBoxShadow(valueString);

  return [
    {
      property: "boxShadow",
      value,
    },
  ];
};
