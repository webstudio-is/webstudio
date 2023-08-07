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
  padding:
    | StringEnumToNumeric<keyof EvaluatedDefaultTheme["padding"]>
    | NonNumeric<keyof EvaluatedDefaultTheme["padding"]>
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
  padding:
    | StringEnumToNumeric<keyof EvaluatedDefaultTheme["padding"]>
    | NonNumeric<keyof EvaluatedDefaultTheme["padding"]>
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
  padding:
    | StringEnumToNumeric<keyof EvaluatedDefaultTheme["padding"]>
    | NonNumeric<keyof EvaluatedDefaultTheme["padding"]>
): EmbedTemplateStyleDecl[] => {
  return [...px(padding), ...py(padding)];
};

const marginProperty =
  (property: "marginTop" | "marginRight" | "marginBottom" | "marginLeft") =>
  (
    margin:
      | StringEnumToNumeric<keyof EvaluatedDefaultTheme["margin"]>
      | NonNumeric<keyof EvaluatedDefaultTheme["margin"]>
  ): EmbedTemplateStyleDecl[] => {
    const key = `${margin}` as const;
    const valueString = theme("margin")?.[key] ?? "0";
    const value = parseCssValue(property, valueString);

    return [{ property, value }];
  };

export const ml: ReturnType<typeof marginProperty> = (margin) => {
  return marginProperty("marginLeft")(margin);
};

export const mr: ReturnType<typeof marginProperty> = (margin) => {
  return marginProperty("marginRight")(margin);
};

export const mt: ReturnType<typeof marginProperty> = (margin) => {
  return marginProperty("marginTop")(margin);
};

export const mb: ReturnType<typeof marginProperty> = (margin) => {
  return marginProperty("marginBottom")(margin);
};

export const mx: ReturnType<typeof marginProperty> = (margin) => {
  return [ml(margin), mr(margin)].flat();
};

export const my: ReturnType<typeof marginProperty> = (margin) => {
  return [mt(margin), mb(margin)].flat();
};

export const m: ReturnType<typeof marginProperty> = (margin) => {
  return [mx(margin), my(margin)].flat();
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

export const h = (
  spacing:
    | StringEnumToNumeric<keyof EvaluatedDefaultTheme["height"]>
    | NonNumeric<keyof EvaluatedDefaultTheme["height"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${spacing}` as const;
  const valueString = theme("height")?.[key] ?? "0";
  const value = parseCssValue("height", valueString);

  return [{ property: "height", value }];
};

export const opacity = (
  opacity: StringEnumToNumeric<keyof EvaluatedDefaultTheme["opacity"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${opacity}` as const;
  const valueString = theme("opacity")?.[key] ?? "0";
  const value = parseCssValue("opacity", valueString);

  return [
    {
      property: "opacity",
      value,
    },
  ];
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

const positionStyle = (
  property: "left" | "right" | "top" | "bottom",
  spacing: StringEnumToNumeric<keyof EvaluatedDefaultTheme["spacing"]>
): EmbedTemplateStyleDecl => {
  const key = `${spacing}` as const;
  const valueString = theme("spacing")?.[key] ?? "0";
  const value = parseCssValue(property, valueString);

  return { property, value };
};

export const top = (
  spacing: StringEnumToNumeric<keyof EvaluatedDefaultTheme["spacing"]>
): EmbedTemplateStyleDecl[] => [positionStyle("top", spacing)];

export const right = (
  spacing: StringEnumToNumeric<keyof EvaluatedDefaultTheme["spacing"]>
): EmbedTemplateStyleDecl[] => [positionStyle("right", spacing)];

export const bottom = (
  spacing: StringEnumToNumeric<keyof EvaluatedDefaultTheme["spacing"]>
): EmbedTemplateStyleDecl[] => [positionStyle("bottom", spacing)];

export const left = (
  spacing: StringEnumToNumeric<keyof EvaluatedDefaultTheme["spacing"]>
): EmbedTemplateStyleDecl[] => [positionStyle("left", spacing)];

export const inset = (
  spacing: StringEnumToNumeric<keyof EvaluatedDefaultTheme["spacing"]>
): EmbedTemplateStyleDecl[] => [
  positionStyle("left", spacing),
  positionStyle("right", spacing),
  positionStyle("top", spacing),
  positionStyle("bottom", spacing),
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

export const relative = (): EmbedTemplateStyleDecl[] => {
  return [
    { property: "position", value: { type: "keyword", value: "relative" } },
  ];
};

export const absolute = (): EmbedTemplateStyleDecl[] => {
  return [
    { property: "position", value: { type: "keyword", value: "absolute" } },
  ];
};

export const grid = (): EmbedTemplateStyleDecl[] => {
  return [{ property: "display", value: { type: "keyword", value: "grid" } }];
};

const alignItems = {
  start: "flex-start",
  end: "flex-end",
  center: "center",
  baseline: "baseline",
  stretch: "stretch",
} as const;
type AlignItems = keyof typeof alignItems;

export const items = (
  alignItemsParam: AlignItems
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "alignItems",
      value: {
        type: "keyword",
        value: alignItems[alignItemsParam],
      },
    },
  ];
};

const justifyContent = {
  start: "flex-start",
  end: "flex-end",
  center: "center",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
  stretch: "stretch",
} as const;
type JustifyContent = keyof typeof justifyContent;

export const justify = (
  justifyContentParam: JustifyContent
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "justifyContent",
      value: {
        type: "keyword",
        value: justifyContent[justifyContentParam],
      },
    },
  ];
};

const flexDirection = { row: "row", col: "column" } as const;
type FlexDirection = keyof typeof flexDirection;

export const flex = (flexParam?: FlexDirection): EmbedTemplateStyleDecl[] => {
  if (flexParam === undefined) {
    return [{ property: "display", value: { type: "keyword", value: "flex" } }];
  }

  return [
    {
      property: "flexDirection",
      value: {
        type: "keyword",
        value: flexDirection[flexParam],
      },
    },
  ];
};

export const grow = (): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "flexGrow",
      value: {
        type: "unit",
        value: 1,
        unit: "number",
      },
    },
  ];
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

export const leading = (
  lineHeight:
    | StringEnumToNumeric<keyof EvaluatedDefaultTheme["lineHeight"]>
    | NonNumeric<keyof EvaluatedDefaultTheme["lineHeight"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${lineHeight}` as const;
  const valueString = theme("lineHeight")[key];
  const value = parseCssValue("lineHeight", valueString);

  return [{ property: "lineHeight", value }];
};

export const tracking = (
  letterSpacing:
    | StringEnumToNumeric<keyof EvaluatedDefaultTheme["letterSpacing"]>
    | NonNumeric<keyof EvaluatedDefaultTheme["letterSpacing"]>
): EmbedTemplateStyleDecl[] => {
  const key = `${letterSpacing}` as const;
  const valueString = theme("letterSpacing")[key];
  const value = parseCssValue("letterSpacing", valueString);

  return [{ property: "letterSpacing", value }];
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

export const ring = (
  ringColor: keyof EvaluatedDefaultTheme["colors"],
  ringWidth: StringEnumToNumeric<keyof EvaluatedDefaultTheme["ringWidth"]>,
  ringOffsetColor: keyof EvaluatedDefaultTheme["colors"] = "background",
  ringOffsetWidth: StringEnumToNumeric<
    keyof EvaluatedDefaultTheme["ringOffsetWidth"]
  > = 0,
  inset: "inset" | "" = ""
): EmbedTemplateStyleDecl[] => {
  const ringWidthUnits = theme("ringWidth")[ringWidth];
  const ringOffsetWidthUnits = theme("ringOffsetWidth")[ringOffsetWidth];
  const ringColorRgb = theme("colors")[ringColor];
  const ringOffsetColorRgb = theme("colors")[ringOffsetColor];
  const ringOffsetShadow = `${inset} 0 0 0 ${ringOffsetWidthUnits} ${ringOffsetColorRgb}`;

  const ringWidthParsed = parseFloat(ringWidthUnits);
  const ringOffsetWidthParsed = parseFloat(ringOffsetWidthUnits);

  const ringShadow = `${inset} 0 0 0 ${
    ringWidthParsed + ringOffsetWidthParsed
  }px ${ringColorRgb}`;

  const value = parseBoxShadow(`${ringOffsetShadow}, ${ringShadow}`);

  return [
    {
      property: "boxShadow",
      value,
    },
  ];
};

export const hover = (
  value: EmbedTemplateStyleDecl[]
): EmbedTemplateStyleDecl[] => {
  return value.map((decl) => ({
    ...decl,
    state: ":hover",
  }));
};

export const focus = (
  value: EmbedTemplateStyleDecl[]
): EmbedTemplateStyleDecl[] => {
  return value.map((decl) => ({
    ...decl,
    state: ":focus",
  }));
};

export const state = (
  value: EmbedTemplateStyleDecl[],
  state: string
): EmbedTemplateStyleDecl[] => {
  return value.map((decl) => ({
    ...decl,
    state,
  }));
};
