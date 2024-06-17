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

export const valueTypes = [
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
] as const;

export type UnitGroup = (typeof numericTypes)[number];

// Data type used before we generate a the constants.
export type RawPropertyData = {
  unitGroups: Array<UnitGroup>;
  inherited: boolean;
  initial: StyleValue;
  types: Array<(typeof valueTypes)[number]>;
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
  types: [],
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
  types: [],
};
keywordValues.MozOsxFontSmoothing = ["auto", "grayscale"];

keywordValues.listStyleType = [
  "disc",
  "circle",
  "square",
  "decimal",
  "georgian",
  "trad-chinese-informal",
  "kannada",
];
