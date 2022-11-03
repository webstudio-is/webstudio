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

export const normalizeFamily = (family: string, subfamily: string) => {
  let simplifiedFamily = family;
  subfamily
    .trim()
    .split(" ")
    .forEach((word: string) => {
      simplifiedFamily = simplifiedFamily.replace(
        new RegExp(word.trim(), "i"),
        ""
      );
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
