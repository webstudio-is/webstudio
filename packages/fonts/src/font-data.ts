import type { FontFormat, VariationAxes } from "./schema";
import { create as createFontKit } from "fontkit";
import { type FontWeight, fontWeights } from "./font-weights";

// @todo sumbit this to definitely typed, they are not up to date
declare module "fontkit" {
  export interface Font {
    type: string;
    getName: (name: string) => string;
    variationAxes: VariationAxes;
  }
}

export const styles = ["normal", "italic", "oblique"] as const;
type Style = (typeof styles)[number];

export const parseSubfamily = (subfamily: string) => {
  const subfamilyLow = subfamily.toLowerCase();
  let style: Style = "normal";
  for (const possibleStyle of styles) {
    if (subfamilyLow.includes(possibleStyle)) {
      style = possibleStyle;
      break;
    }
  }
  let weight: FontWeight = "400";
  for (weight in fontWeights) {
    const { name } = fontWeights[weight];
    const { alt } = fontWeights[weight];
    if (subfamilyLow.includes(name) || subfamilyLow.includes(alt)) {
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
export const normalizeFamily = (family: string, subfamily: string) => {
  const familyParts = splitAndTrim(family);
  const subfamilyParts = splitAndTrim(subfamily.toLowerCase());
  const familyPartsNormalized = familyParts.filter(
    (familyPart) => subfamilyParts.includes(familyPart.toLowerCase()) === false
  );
  return familyPartsNormalized.join(" ");
};

type FontDataStatic = {
  format: FontFormat;
  family: string;
  style: Style;
  weight: number;
};
type FontDataVariable = {
  format: FontFormat;
  family: string;
  variationAxes: VariationAxes;
};
type FontData = FontDataStatic | FontDataVariable;

export const getFontData = (data: Uint8Array): FontData => {
  const font = createFontKit(data as Buffer);
  const format = font.type.toLowerCase() as FontData["format"];
  const originalFamily = font.getName("fontFamily");
  const subfamily =
    font.getName("preferredSubfamily") ?? font.getName("fontSubfamily");
  const family = normalizeFamily(originalFamily, subfamily);
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
