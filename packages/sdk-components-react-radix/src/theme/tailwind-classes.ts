/**
 * Quik and dirty implementation of tailwind classes conversion to webstudio styles.
 */
import type { EmbedTemplateStyleDecl } from "@webstudio-is/react-sdk";
import type {
  StyleValue,
  StyleProperty,
  TupleValue,
  TupleValueItem,
} from "@webstudio-is/css-data";
import * as theme from "./__generated__/tailwind-theme";

export const property = (
  property: StyleProperty,
  value: string
): EmbedTemplateStyleDecl => {
  if (value.startsWith("--")) {
    return {
      property,
      value: { type: "var", value: value.slice(2), fallbacks: [] },
    };
  }
  return {
    property,
    value: { type: "unparsed", value },
  };
};

// https://github.com/tailwindlabs/tailwindcss/blob/master/src/css/preflight.css
const preflight = (): EmbedTemplateStyleDecl[] => {
  const borderColorValue = theme.colors.border;

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
  value: StringEnumToNumeric<keyof typeof theme.zIndex>
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "zIndex",
      value: theme.zIndex[value],
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
  value: keyof typeof theme.borderRadius = "DEFAULT"
): EmbedTemplateStyleDecl[] => {
  const styleValue = theme.borderRadius[value];
  return [
    { property: "borderTopLeftRadius", value: styleValue },
    { property: "borderTopRightRadius", value: styleValue },
    { property: "borderBottomRightRadius", value: styleValue },
    { property: "borderBottomLeftRadius", value: styleValue },
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
  borderWidthOrColor?:
    | StringEnumToNumeric<keyof typeof theme.borderWidth>
    | keyof typeof theme.colors
): EmbedTemplateStyleDecl[] => {
  if (
    typeof borderWidthOrColor === "number" ||
    borderWidthOrColor === undefined
  ) {
    const styleValue = theme.borderWidth[borderWidthOrColor ?? "DEFAULT"];
    return [
      ...preflight(),
      { property: "borderTopWidth", value: styleValue },
      { property: "borderRightWidth", value: styleValue },
      { property: "borderBottomWidth", value: styleValue },
      { property: "borderLeftWidth", value: styleValue },
    ];
  }

  const styleValue = theme.colors[borderWidthOrColor];

  return [
    { property: "borderTopColor", value: styleValue },
    { property: "borderRightColor", value: styleValue },
    { property: "borderBottomColor", value: styleValue },
    { property: "borderLeftColor", value: styleValue },
  ];
};

export const borderB = (
  borderWidthOrColor?:
    | StringEnumToNumeric<keyof typeof theme.borderWidth>
    | keyof typeof theme.colors
): EmbedTemplateStyleDecl[] => {
  let widthValue: StyleValue = { type: "unit", value: 1, unit: "number" };
  let colorValue: StyleValue = theme.colors.border;
  if (
    typeof borderWidthOrColor === "number" ||
    borderWidthOrColor === undefined
  ) {
    widthValue = theme.borderWidth[borderWidthOrColor ?? "DEFAULT"];
  } else {
    colorValue = theme.colors[borderWidthOrColor];
  }

  return [
    {
      property: "borderBottomWidth",
      value: widthValue,
    },
    {
      property: "borderBottomStyle",
      value: { type: "keyword", value: "solid" },
    },
    {
      property: "borderBottomColor",
      value: colorValue,
    },
  ];
};

const paddingProperty =
  (property: "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft") =>
  (
    padding:
      | StringEnumToNumeric<keyof typeof theme.padding>
      | NonNumeric<keyof typeof theme.padding>
  ): EmbedTemplateStyleDecl[] => {
    return [{ property, value: theme.padding[padding] }];
  };

export const pt: ReturnType<typeof paddingProperty> = (padding) => {
  return paddingProperty("paddingTop")(padding);
};

export const pb: ReturnType<typeof paddingProperty> = (padding) => {
  return paddingProperty("paddingBottom")(padding);
};

export const pl: ReturnType<typeof paddingProperty> = (padding) => {
  return paddingProperty("paddingLeft")(padding);
};

export const pr: ReturnType<typeof paddingProperty> = (padding) => {
  return paddingProperty("paddingRight")(padding);
};

export const px: ReturnType<typeof paddingProperty> = (padding) => {
  return [pl(padding), pr(padding)].flat();
};

export const py: ReturnType<typeof paddingProperty> = (padding) => {
  return [pt(padding), pb(padding)].flat();
};

export const p: ReturnType<typeof paddingProperty> = (padding) => {
  return [px(padding), py(padding)].flat();
};

const marginProperty =
  (property: "marginTop" | "marginRight" | "marginBottom" | "marginLeft") =>
  (
    margin:
      | StringEnumToNumeric<keyof typeof theme.margin>
      | NonNumeric<keyof typeof theme.margin>
  ): EmbedTemplateStyleDecl[] => {
    return [{ property, value: theme.margin[margin] }];
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
    | StringEnumToNumeric<keyof typeof theme.width>
    | NonNumeric<keyof typeof theme.width>
): EmbedTemplateStyleDecl[] => {
  return [{ property: "width", value: theme.width[spacing] }];
};

export const h = (
  spacing:
    | StringEnumToNumeric<keyof typeof theme.height>
    | NonNumeric<keyof typeof theme.height>
): EmbedTemplateStyleDecl[] => {
  return [{ property: "height", value: theme.height[spacing] }];
};

export const minH = (
  spacing: StringEnumToNumeric<keyof typeof theme.minHeight>
): EmbedTemplateStyleDecl[] => {
  return [{ property: "minHeight", value: theme.minHeight[spacing] }];
};

export const opacity = (
  opacity: StringEnumToNumeric<keyof typeof theme.opacity>
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "opacity",
      value: theme.opacity[opacity],
    },
  ];
};

export const cursor = (
  cursor: keyof typeof theme.cursor
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "cursor",
      value: theme.cursor[cursor],
    },
  ];
};

export const maxW = (
  spacing:
    | StringEnumToNumeric<keyof typeof theme.maxWidth>
    | NonNumeric<keyof typeof theme.maxWidth>
): EmbedTemplateStyleDecl[] => {
  return [{ property: "maxWidth", value: theme.maxWidth[spacing] }];
};

const positionStyle = (
  property: "left" | "right" | "top" | "bottom",
  spacing:
    | StringEnumToNumeric<keyof typeof theme.inset>
    | NonNumeric<keyof typeof theme.inset>
): EmbedTemplateStyleDecl => {
  return { property, value: theme.inset[spacing] };
};

export const top = (
  spacing:
    | StringEnumToNumeric<keyof typeof theme.inset>
    | NonNumeric<keyof typeof theme.inset>
): EmbedTemplateStyleDecl[] => [positionStyle("top", spacing)];

export const right = (
  spacing:
    | StringEnumToNumeric<keyof typeof theme.inset>
    | NonNumeric<keyof typeof theme.inset>
): EmbedTemplateStyleDecl[] => [positionStyle("right", spacing)];

export const bottom = (
  spacing:
    | StringEnumToNumeric<keyof typeof theme.inset>
    | NonNumeric<keyof typeof theme.inset>
): EmbedTemplateStyleDecl[] => [positionStyle("bottom", spacing)];

export const left = (
  spacing:
    | StringEnumToNumeric<keyof typeof theme.inset>
    | NonNumeric<keyof typeof theme.inset>
): EmbedTemplateStyleDecl[] => [positionStyle("left", spacing)];

export const inset = (
  spacing:
    | StringEnumToNumeric<keyof typeof theme.inset>
    | NonNumeric<keyof typeof theme.inset>
): EmbedTemplateStyleDecl[] => [
  positionStyle("left", spacing),
  positionStyle("right", spacing),
  positionStyle("top", spacing),
  positionStyle("bottom", spacing),
];

export const aspect = (
  value: "auto" | "square" | "video"
): EmbedTemplateStyleDecl[] => {
  let unparsed: string = value;
  if (value === "square") {
    unparsed = "1 / 1";
  }
  if (value === "video") {
    unparsed = "16 / 9";
  }
  return [
    {
      property: "aspectRatio",
      value: { type: "unparsed", value: unparsed },
    },
  ];
};

export const backdropBlur = (
  blur: keyof typeof theme.blur
): EmbedTemplateStyleDecl[] => {
  return [{ property: "backdropFilter", value: theme.blur[blur] }];
};

export const list = (
  listStyle: keyof typeof theme.listStyleType
): EmbedTemplateStyleDecl[] => {
  return [{ property: "listStyleType", value: theme.listStyleType[listStyle] }];
};

export const select = (_selectValue: "none"): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "userSelect",
      value: {
        type: "keyword",
        value: "none",
      },
    },
  ];
};

export const bg = (
  color: keyof typeof theme.colors,
  alpha?: number
): EmbedTemplateStyleDecl[] => {
  const value = theme.colors[color];

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

export const inlineFlex = (): EmbedTemplateStyleDecl[] => {
  return [
    { property: "display", value: { type: "keyword", value: "inline-flex" } },
  ];
};

export const block = (): EmbedTemplateStyleDecl[] => {
  return [{ property: "display", value: { type: "keyword", value: "block" } }];
};

const flexDirection = { row: "row", col: "column" } as const;
type FlexDirection = keyof typeof flexDirection;

type FlexSizing = 1 | "auto" | "initial" | "none";

export const flex = (
  flexParam?: FlexDirection | FlexSizing
): EmbedTemplateStyleDecl[] => {
  if (flexParam === undefined) {
    return [{ property: "display", value: { type: "keyword", value: "flex" } }];
  }

  if (flexParam === 1) {
    return [
      {
        property: "flexGrow",
        value: { type: "unit", value: 1, unit: "number" },
      },
      {
        property: "flexShrink",
        value: { type: "unit", value: 1, unit: "number" },
      },
      {
        property: "flexBasis",
        value: { type: "unit", value: 0, unit: "%" },
      },
    ];
  }

  if (flexParam === "auto") {
    return [
      {
        property: "flexGrow",
        value: { type: "unit", value: 1, unit: "number" },
      },
      {
        property: "flexShrink",
        value: { type: "unit", value: 1, unit: "number" },
      },
      {
        property: "flexBasis",
        value: { type: "keyword", value: "auto" },
      },
    ];
  }

  if (flexParam === "initial") {
    return [
      {
        property: "flexGrow",
        value: { type: "unit", value: 0, unit: "number" },
      },
      {
        property: "flexShrink",
        value: { type: "unit", value: 1, unit: "number" },
      },
      {
        property: "flexBasis",
        value: { type: "keyword", value: "auto" },
      },
    ];
  }

  if (flexParam === "none") {
    return [
      {
        property: "flexGrow",
        value: { type: "unit", value: 0, unit: "number" },
      },
      {
        property: "flexShrink",
        value: { type: "unit", value: 0, unit: "number" },
      },
      {
        property: "flexBasis",
        value: { type: "keyword", value: "auto" },
      },
    ];
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
      value: { type: "unit", value: 1, unit: "number" },
    },
  ];
};

export const shrink = (value: number): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "flexGrow",
      value: { type: "unit", value, unit: "number" },
    },
  ];
};

export const gap = (
  gapValue: StringEnumToNumeric<keyof typeof theme.spacing>
): EmbedTemplateStyleDecl[] => {
  const value = theme.spacing[gapValue];

  return [
    { property: "rowGap", value },
    { property: "columnGap", value },
  ];
};

export const lineClamp = (
  lineClampValue: StringEnumToNumeric<keyof typeof theme.lineClamp>
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "overflow",
      value: {
        type: "keyword",
        value: "hidden",
      },
    },
    {
      property: "display",

      value: {
        type: "keyword",
        value: "-webkit-box",
      },
    },
    {
      property: "-webkit-box-orient" as "display",
      value: {
        type: "keyword",
        value: "vertical",
      },
    },
    {
      property: "-webkit-line-clamp" as "display",
      value: theme.lineClamp[lineClampValue],
    },
  ];
};

export const leading = (
  lineHeight:
    | StringEnumToNumeric<keyof typeof theme.lineHeight>
    | NonNumeric<keyof typeof theme.lineHeight>
): EmbedTemplateStyleDecl[] => {
  return [{ property: "lineHeight", value: theme.lineHeight[lineHeight] }];
};

export const tracking = (
  letterSpacing:
    | StringEnumToNumeric<keyof typeof theme.letterSpacing>
    | NonNumeric<keyof typeof theme.letterSpacing>
): EmbedTemplateStyleDecl[] => {
  return [
    { property: "letterSpacing", value: theme.letterSpacing[letterSpacing] },
  ];
};

export const outline = (_value: "none"): EmbedTemplateStyleDecl[] => {
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

const textSizes = Object.keys(theme.fontSize);
type TextSize = keyof typeof theme.fontSize;

const isTextSize = (value: string): value is TextSize =>
  textSizes.includes(value);

export const text = (
  sizeOrColor: TextSize | keyof typeof theme.colors
): EmbedTemplateStyleDecl[] => {
  if (isTextSize(sizeOrColor)) {
    return [
      { property: "fontSize", value: theme.fontSize[sizeOrColor] },
      { property: "lineHeight", value: theme.fontSizeLineHeight[sizeOrColor] },
    ];
  }
  return [
    {
      property: "color",
      value: theme.colors[sizeOrColor],
    },
  ];
};

export const noUnderline = (): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "textDecorationLine",
      value: { type: "keyword", value: "none" },
    },
  ];
};

export const underline = (): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "textDecorationLine",
      value: { type: "keyword", value: "underline" },
    },
  ];
};

export const underlineOffset = (
  offset: StringEnumToNumeric<keyof typeof theme.textUnderlineOffset>
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "textUnderlineOffset",
      value: theme.textUnderlineOffset[offset],
    },
  ];
};

const weights = {
  thin: "100",
  extralight: "200",
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
} as const;

export const font = (
  weight:
    | "thin"
    | "extralight"
    | "light"
    | "normal"
    | "medium"
    | "semibold"
    | "bold"
    | "extrabold"
    | "black"
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "fontWeight",
      value: { type: "keyword", value: weights[weight] },
    },
  ];
};

export const whitespace = (
  value: "normal" | "nowrap" | "pre" | "pre-line" | "pre-wrap" | "break-spaces"
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "whiteSpace",
      value: { type: "keyword", value },
    },
  ];
};

export const shadow = (
  shadowSize: keyof typeof theme.boxShadow
): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "boxShadow",
      value: theme.boxShadow[shadowSize],
    },
  ];
};

export const ring = (
  ringColor: keyof typeof theme.colors,
  ringWidth: StringEnumToNumeric<keyof typeof theme.ringWidth>,
  ringOffsetColor: keyof typeof theme.colors = "background",
  ringOffsetWidth: StringEnumToNumeric<keyof typeof theme.ringOffsetWidth> = 0
): EmbedTemplateStyleDecl[] => {
  const ringWidthStyleValue = theme.ringWidth[ringWidth];
  const ringOffsetWidthStyleValue = theme.ringOffsetWidth[ringOffsetWidth];
  const ringColorStyleValue = theme.colors[ringColor];
  const ringOffsetColorStyleValue = theme.colors[ringOffsetColor];

  // 0 0 0 ringOffsetWidth ringOffsetColor
  const ringOffsetShadow: TupleValue = {
    type: "tuple",
    value: [
      { type: "unit", value: 0, unit: "number" },
      { type: "unit", value: 0, unit: "number" },
      { type: "unit", value: 0, unit: "number" },
      ringOffsetWidthStyleValue as TupleValueItem,
      ringOffsetColorStyleValue as TupleValueItem,
    ],
  };

  const ringWidthValue =
    ringWidthStyleValue.type === "unit" ? ringWidthStyleValue.value : 0;
  const ringOffsetWidthValue =
    ringOffsetWidthStyleValue.type === "unit"
      ? ringOffsetWidthStyleValue.value
      : 0;

  // 0 0 0 ringWidth + ringOffsetWidth ringColor
  const ringShadow: TupleValue = {
    type: "tuple",
    value: [
      { type: "unit", value: 0, unit: "number" },
      { type: "unit", value: 0, unit: "number" },
      { type: "unit", value: 0, unit: "number" },
      {
        type: "unit",
        value: ringWidthValue + ringOffsetWidthValue,
        unit:
          ringWidthStyleValue.type === "unit"
            ? ringWidthStyleValue.unit
            : "number",
      },
      ringColorStyleValue as TupleValueItem,
    ],
  };

  return [
    {
      property: "boxShadow",
      value: {
        type: "layers",
        value: [ringOffsetShadow, ringShadow],
      },
    },
  ];
};

export const pointerEvents = (
  value: "none" | "auto"
): EmbedTemplateStyleDecl[] => {
  return [{ property: "pointerEvents", value: { type: "keyword", value } }];
};

export const transition = (
  value: "none" | "all" | "transform"
): EmbedTemplateStyleDecl[] => {
  if (value === "none") {
    return [
      {
        property: "transitionProperty",
        value: { type: "keyword", value: "all" },
      },
    ];
  }
  return [
    {
      property: "transitionProperty",
      value: { type: "keyword", value },
    },
    {
      property: "transitionTimingFunction",
      value: { type: "unparsed", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
    },
    {
      property: "transitionDuration",
      value: { type: "unparsed", value: "150ms" },
    },
  ];
};

export const duration = (ms: number): EmbedTemplateStyleDecl[] => {
  return [
    {
      property: "transitionDuration",
      value: { type: "unit", value: ms, unit: "ms" },
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

export const focusVisible = (
  value: EmbedTemplateStyleDecl[]
): EmbedTemplateStyleDecl[] => {
  return value.map((decl) => ({
    ...decl,
    state: ":focus-visible",
  }));
};

export const disabled = (
  value: EmbedTemplateStyleDecl[]
): EmbedTemplateStyleDecl[] => {
  return value.map((decl) => ({
    ...decl,
    state: ":disabled",
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
