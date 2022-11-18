import type { StyleProperty } from "@webstudio-is/css-data";

const layout = [
  "display",
  // Flex
  "flexDirection",
  "flexWrap",
  // Flex or grid
  "alignItems",
  "justifyContent",
  "alignContent",
  // Grid
  "placeContent",
  "justifyItems",
  "rowGap",
  "columnGap",
  "gridAutoFlow",
  "gridAutoRows",
  "gridAutoColumns",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridTemplateAreas",
] as const;

const flexChild = [
  "flexShrink",
  "flexGrow",
  "flexBasis",
  "alignSelf",
  "order",
] as const;

const gridChild = [
  "gridRowEnd",
  "gridRowStart",
  "gridColumnStart",
  "gridColumnEnd",
  "alignSelf",
  "justifySelf",
  "order",
] as const;

const spacing = [
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
] as const;

const size = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "overflow",
  "objectFit",
] as const;

const position = [
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "zIndex",
  "float",
  "clear",
] as const;

const typography = [
  "fontFamily",
  "fontWeight",
  "fontSize",
  "lineHeight",
  "color",
  "textAlign",
  "fontStyle",
  "textDecorationColor",
  "textDecorationLine",
  "textDecorationStyle",

  "letterSpacing",
  "textIndent",

  "columnCount",
  "columnGap",
  "columnRuleStyle",
  "columnRuleWidth",
  "columnRuleColor",

  "textTransform",
  "direction",
  "whiteSpace",
  "textShadow",

  // More
  "fontSizeAdjust",
  "fontStretch",
  "fontVariant",
  "textAlignLast",
  "textJustify",
  "textOverflow",
  "textSizeAdjust",
  "verticalAlign",
  "wordSpacing",
  "wordBreak",
  "wordWrap",
] as const;

const backgrounds = [
  "backgroundAttachment",
  "backgroundClip",
  "backgroundColor",
  "backgroundImage",
  "backgroundOrigin",
  "backgroundPositionX",
  "backgroundPositionY",
  "backgroundRepeat",
  "backgroundSize",
] as const;

const borders = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",

  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",

  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",

  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",

  // More
  "borderImageSlice",
  "borderImageWidth",
  "borderImageOutset",
  "borderImageRepeat",
  "borderImageSource",
] as const;

const effects = [
  "mixBlendMode",
  "opacity",
  "outlineColor",
  "outlineOffset",
  "outlineStyle",
  "outlineWidth",
  "boxShadow",
  "transform",
  "filter",
  "backdropFilter",
  "cursor",
  // More
  "animationDelay",
  "animationDirection",
  "animationDuration",
  "animationFillMode",
  "animationIterationCount",
  "animationName",
  "animationPlayState",
  "animationTimingFunction",
  "transitionDelay",
  "transitionDuration",
  "transitionProperty",
  "transitionTimingFunction",
] as const;

const other = [
  "resize",
  "clip",
  "visibility",
  "boxSizing",
  "content",
  "quotes",
  "counterReset",
  "counterIncrement",
  "inlineSize",
  "blockSize",
  "minInlineSize",
  "minBlockSize",
  "maxInlineSize",
  "maxBlockSize",
  "userSelect",
  "pointerEvents",
] as const;

export const categories = {
  layout: {
    label: "Layout",
    properties: layout,
    moreFrom: "",
  },
  flexChild: {
    label: "Flex Child",
    properties: flexChild,
    moreFrom: "",
  },
  gridChild: {
    label: "Grid Child",
    properties: gridChild,
    moreFrom: "",
  },
  spacing: { label: "Spacing", properties: spacing, moreFrom: "" },
  size: { label: "Size", properties: size, moreFrom: "" },
  position: { label: "Position", properties: position, moreFrom: "" },
  typography: {
    label: "Typography",
    properties: typography,
    moreFrom: "fontSizeAdjust",
  },
  backgrounds: { label: "Backgrounds", properties: backgrounds, moreFrom: "" },
  borders: {
    label: "Borders",
    properties: borders,
    moreFrom: "borderImageSlice",
  },
  effects: {
    label: "Effects",
    properties: effects,
    moreFrom: "animationDelay",
  },
  other: { label: "Other", properties: other, moreFrom: "" },
};

export const propertyCategoryMap = {} as {
  [property in StyleProperty]: Category;
};

let category: Category;
for (category in categories) {
  for (const property of categories[category].properties) {
    // We are widening the type here
    propertyCategoryMap[property as StyleProperty] = category;
  }
}

export type Category = keyof typeof categories;
