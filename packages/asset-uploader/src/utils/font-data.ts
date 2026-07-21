import { create as createFontKit } from "fontkit";
import {
  fontWeights,
  FONT_STYLES,
  type FontFormat,
  type VariationAxes,
  type FontStyle,
} from "@webstudio-is/fonts";
import { getFileNameParts } from "@webstudio-is/sdk";

// same default fontkit uses internally
const defaultLanguage = "en";

const normalizeWeightName = (value: string) =>
  value.toLowerCase().replaceAll(/[\s_-]+/g, "");

const fontWeightAliases = Object.entries(fontWeights)
  .flatMap(([weight, { names }]) =>
    names.map((name) => ({
      name: normalizeWeightName(name),
      weight: Number(weight),
    }))
  )
  .sort((left, right) => right.name.length - left.name.length);

export const parseSubfamily = (
  subfamily: string,
  weightClass?: number
): { style: FontStyle; weight: number } => {
  const subfamilyLow = subfamily.toLowerCase();
  const normalizedSubfamily = normalizeWeightName(subfamily);
  let style: FontStyle = "normal";
  for (const possibleStyle of FONT_STYLES) {
    if (subfamilyLow.includes(possibleStyle)) {
      style = possibleStyle;
      break;
    }
  }
  if (
    weightClass !== undefined &&
    Number.isInteger(weightClass) &&
    weightClass >= 1 &&
    weightClass <= 1000
  ) {
    return { style, weight: weightClass };
  }
  const weight = fontWeightAliases.find(({ name }) =>
    normalizedSubfamily.includes(name)
  )?.weight;
  return { style, weight: weight ?? 400 };
};

const splitAndTrim = (string: string) =>
  string
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

// Family name can contain additional information like "Roboto Black" or "Roboto Bold", though we need pure family name "Roboto", because the rest is already encoded in weight and style.
// We need a name we can reference in CSS font-family property, while CSS matches it with the right font-face considering the weight and style.
const normalizeFamily = (
  family: string,
  subfamily: string,
  fileName: string
) => {
  const familyParts = splitAndTrim(family);
  const subfamilyParts = splitAndTrim(subfamily.toLowerCase());
  const familyPartsNormalized = familyParts.filter(
    (familyPart) => subfamilyParts.includes(familyPart.toLowerCase()) === false
  );
  if (familyPartsNormalized.length !== 0) {
    return familyPartsNormalized.join(" ");
  }
  // Broken fonts may lack any family information, so last resort is to use the file name
  return getFileNameParts(fileName).basename;
};

type FontDataStatic = {
  format: FontFormat;
  family: string;
  style: FontStyle;
  weight: number;
};
type FontDataVariable = {
  format: FontFormat;
  family: string;
  variationAxes: VariationAxes;
};
type FontData = FontDataStatic | FontDataVariable;

export const getFontData = (data: Uint8Array, fileName: string): FontData => {
  const font = createFontKit(data as Buffer);
  if (font.type !== "TTF" && font.type !== "WOFF" && font.type !== "WOFF2") {
    throw Error(`Unsupported font type ${font.type}`);
  }
  const format = font.type.toLowerCase() as FontData["format"];
  const originalFamily = font.getName("fontFamily", defaultLanguage) ?? "";
  const subfamily =
    font.getName("preferredSubfamily", defaultLanguage) ??
    font.getName("fontSubfamily", defaultLanguage) ??
    "";
  const family = normalizeFamily(originalFamily, subfamily, fileName);
  const isVariable = Object.keys(font.variationAxes).length !== 0;

  if (isVariable) {
    return {
      format,
      family,
      variationAxes: font.variationAxes,
    };
  }

  return {
    format,
    family,
    ...parseSubfamily(subfamily, font["OS/2"]?.usWeightClass),
  };
};

export const __testing__: {
  normalizeFamily: (
    family: string,
    subfamily: string,
    fileName: string
  ) => string;
} = { normalizeFamily };
