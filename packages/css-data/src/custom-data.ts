import type { StyleValue } from "./schema";
import { popularityIndex } from "./popularity-index";

// Data type used before we generate a the constants.
type RawPropertyData = {
  unitGroups: string[];
  inherited: boolean;
  initial: StyleValue;
  popularity: number;
  appliesTo: string;
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
