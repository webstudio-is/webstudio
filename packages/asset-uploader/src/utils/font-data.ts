import { create as createFontKit } from "fontkit";
import {
  fontWeights,
  FONT_STYLES,
  type FontFormat,
  type FontWeight,
  type VariationAxes,
  type FontStyle,
} from "@webstudio-is/fonts";

// @todo sumbit this to definitely typed, they are not up to date
declare module "fontkit" {
  export interface Font {
    variationAxes: VariationAxes;
  }
}

// same default fontkit uses internally
const defaultLanguage = "en";

export const parseSubfamily = (
  subfamily: string
): { style: FontStyle; weight: number } => {
  const subfamilyLow = subfamily.toLowerCase();
  let style: FontStyle = "normal";
  for (const possibleStyle of FONT_STYLES) {
    if (subfamilyLow.includes(possibleStyle)) {
      style = possibleStyle;
      break;
    }
  }
  let weight: FontWeight = "400";
  for (weight in fontWeights) {
    const { names } = fontWeights[weight];
    if (names.some((name) => subfamilyLow.includes(name))) {
      break;
    }
  }
  return { style, weight: Number(weight) };
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
  const extensionIndex = fileName.lastIndexOf(".");
  return extensionIndex === -1 ? fileName : fileName.slice(0, extensionIndex);
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
    ...parseSubfamily(subfamily),
  };
};

export const __testing__: {
  normalizeFamily: (
    family: string,
    subfamily: string,
    fileName: string
  ) => string;
} = { normalizeFamily };
