import type { StyleValue } from "@webstudio-is/css-engine";
import { popularityIndex } from "./popularity-index";

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
  "single-animation-composition",
  "palette-identifier",
  "flex",
] as const;

export type UnitGroup = (typeof numericTypes)[number];

// Data type used before we generate a the constants.
export type RawPropertyData = {
  unitGroups: Array<UnitGroup>;
  inherited: boolean;
  initial: StyleValue;
  popularity: number;
  appliesTo: string;
  types: Array<(typeof valueTypes)[number]>;
};

export const propertiesData: { [property: string]: RawPropertyData } = {};
export const keywordValues: { [property: string]: Array<string> } = {};

const getPopularityIndex = (property: string) =>
  popularityIndex.find((data) => data.property === property)?.dayPercentage ??
  0;

propertiesData.WebkitFontSmoothing = {
  unitGroups: [],
  inherited: true,
  initial: {
    type: "keyword",
    value: "auto",
  },
  popularity: getPopularityIndex("webkit-font-smoothing"),
  appliesTo: "allElements",
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
  popularity: getPopularityIndex("moz-osx-font-smoothing"),
  appliesTo: "allElements",
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
