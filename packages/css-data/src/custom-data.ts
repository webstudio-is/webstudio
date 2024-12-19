import type { StyleValue } from "@webstudio-is/css-engine";

const numericTypes = [
  "number",
  "percentage",
  "length",
  "time",
  "angle",
  "resolution",
  "integer",
  "x",
  "y",
] as const;

export const valueTypes: string[] = [
  ...numericTypes,
  "hex-color",
  "url",
  "string",
  "custom-ident",
  "dashed-ident",
  "single-animation-composition",
  "palette-identifier",
  "flex",
  "inset-area",
  "offset-path",
  "coord-box",
  "anchor-element",
  "try-tactic",
  "try-size",
];

// Data type used before we generate a the constants.
export type RawPropertyData = {
  unitGroups: Array<string>;
  inherited: boolean;
  initial: StyleValue;
  mdnUrl?: string;
};

export const propertiesData: { [property: string]: RawPropertyData } = {};
export const keywordValues: { [property: string]: Array<string> } = {};

propertiesData.WebkitFontSmoothing = {
  unitGroups: [],
  inherited: true,
  initial: {
    type: "keyword",
    value: "auto",
  },
  mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth",
};
keywordValues.WebkitFontSmoothing = [
  "auto",
  "none",
  "antialiased",
  "subpixel-antialiased",
];

propertiesData.MozOsxFontSmoothing = {
  unitGroups: [],
  inherited: true,
  initial: {
    type: "keyword",
    value: "auto",
  },
  mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth",
};
keywordValues.MozOsxFontSmoothing = ["auto", "grayscale"];

propertiesData["-webkit-box-orient"] = {
  unitGroups: [],
  inherited: false,
  initial: { type: "keyword", value: "horizontal" },
  mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/box-orient",
};
keywordValues["-webkit-box-orient"] = ["horizontal", "vertical"];

keywordValues.listStyleType = [
  "disc",
  "circle",
  "square",
  "decimal",
  "georgian",
  "trad-chinese-informal",
  "kannada",
  "none",
  "initial",
  "inherit",
  "unset",
];

// removed auto from keywords
// fixed in webref btw
keywordValues.textWrapMode = ["wrap", "nowrap", "initial", "inherit", "unset"];

export const customLonghandPropertyNames = [
  "boxShadowOffsetX",
  "boxShadowOffsetY",
  "boxShadowBlurRadius",
  "boxShadowSpreadRadius",
  "boxShadowColor",
  "boxShadowPosition",
  "textShadowOffsetX",
  "textShadowOffsetY",
  "textShadowBlurRadius",
  "textShadowColor",
  "dropShadowOffsetX",
  "dropShadowOffsetY",
  "dropShadowBlurRadius",
  "dropShadowColor",
  "translateX",
  "translateY",
  "translateZ",
  "rotateX",
  "rotateY",
  "rotateZ",
  "scaleX",
  "scaleY",
  "scaleZ",
  "skewX",
  "skewY",
  "transformOriginX",
  "transformOriginY",
  "transformOriginZ",
  "perspectiveOriginX",
  "perspectiveOriginY",
] as const;
