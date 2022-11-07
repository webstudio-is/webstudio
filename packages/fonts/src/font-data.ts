import type { FontFormat } from "./types";
import fontkit from "fontkit";
import { FontWeight, fontWeights } from "./font-weights";

// @todo sumbit this to definitely typed, they are not up to date
declare module "fontkit" {
  export interface Font {
    type: string;
    getName: (name: string) => string;
  }
}

export const styles = ["normal", "italic", "oblique"] as const;
type Style = typeof styles[number];

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

// Family name can contain additional information like "Roboto Black" or "Roboto Bold", though we need pure family name, because the rest is already encoded in weight and style.
// We need a name we can reference in CSS font-family property, while CSS matches it with the right font-face considering the weight and style.
export const normalizeFamily = (family: string, subfamily: string) => {
  let simplifiedFamily = family;
  subfamily
    .trim()
    .split(" ")
    .forEach((word: string) => {
      // We need to remove 'Black' or 'black' from 'Roboto Black'
      const index = simplifiedFamily.toLowerCase().indexOf(word.toLowerCase());
      if (index !== -1) {
        const found = simplifiedFamily.slice(index, index + word.length);
        simplifiedFamily = simplifiedFamily.replace(found, "");
      }
    });
  return simplifiedFamily.trim();
};

type FontData = {
  format: FontFormat;
  family: string;
  style: Style;
  weight: number;
};

export const getFontData = (data: Uint8Array): FontData => {
  const font = fontkit.create(data as Buffer);
  const format = font.type.toLowerCase() as FontData["format"];
  const originalFamily = font.getName("fontFamily");
  const subfamily =
    font.getName("preferredSubfamily") ?? font.getName("fontSubfamily");
  const parsedSubfamily = parseSubfamily(subfamily);
  const family = normalizeFamily(originalFamily, subfamily);
  return {
    format,
    family,
    ...parsedSubfamily,
  };
};
