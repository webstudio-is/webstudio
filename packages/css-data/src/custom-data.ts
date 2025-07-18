import type { StyleValue } from "@webstudio-is/css-engine";

// Data type used before we generate a the constants.
type RawPropertyData = {
  unitGroups: Array<string>;
  inherited: boolean;
  initial: StyleValue;
  mdnUrl?: string;
};

export const propertiesData: { [property: string]: RawPropertyData } = {};
export const keywordValues: { [property: string]: Array<string> } = {};

propertiesData["-webkit-font-smoothing"] = {
  unitGroups: [],
  inherited: true,
  initial: {
    type: "keyword",
    value: "auto",
  },
  mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth",
};
keywordValues["-webkit-font-smoothing"] = [
  "auto",
  "none",
  "antialiased",
  "subpixel-antialiased",
];

propertiesData["-moz-osx-font-smoothing"] = {
  unitGroups: [],
  inherited: true,
  initial: {
    type: "keyword",
    value: "auto",
  },
  mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth",
};
keywordValues["-moz-osx-font-smoothing"] = ["auto", "grayscale"];

propertiesData["-webkit-box-orient"] = {
  unitGroups: [],
  inherited: false,
  initial: { type: "keyword", value: "horizontal" },
  mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/box-orient",
};
keywordValues["-webkit-box-orient"] = ["horizontal", "vertical"];

propertiesData["view-timeline-name"] = {
  unitGroups: [],
  inherited: false,
  initial: {
    type: "keyword",
    value: "none",
  },
  mdnUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/view-timeline-name",
};
keywordValues["view-timeline-name"] = [];
propertiesData["scroll-timeline-name"] = {
  unitGroups: [],
  inherited: false,
  initial: {
    type: "keyword",
    value: "none",
  },
  mdnUrl:
    "https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-timeline-name",
};
keywordValues["scroll-timeline-name"] = [];

propertiesData["view-timeline-inset"] = {
  unitGroups: ["length", "percentage"],
  inherited: false,
  initial: {
    type: "keyword",
    value: "auto",
  },
  mdnUrl:
    "https://developer.mozilla.org/en-US/docs/Web/CSS/view-timeline-inset",
};
keywordValues["view-timeline-inset"] = [];

keywordValues["list-style-type"] = [
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
