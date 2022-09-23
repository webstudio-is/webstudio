import type { FontFormat } from "./types";
import fontkit from "fontkit";

// @todo sumbit this to definitely typed, they are not up to date
declare module "fontkit" {
  export interface Font {
    type: string;
    getName: (name: string) => string;
  }
}

export const styles = ["normal", "italic", "oblique"] as const;
type Style = typeof styles[number];

const weights = {
  thin: 100,
  hairline: 100,
  "extra light": 200,
  "ultra light": 200,
  light: 300,
  normal: 400,
  medium: 500,
  "semi bold": 600,
  "demi bold": 600,
  bold: 700,
  "extra bold": 800,
  "ultra bold": 800,
  black: 900,
  heavy: 900,
} as const;

type WeightKey = keyof typeof weights;
type WeightValue = typeof weights[WeightKey];

export const parseSubfamily = (subfamily: string) => {
  const subfamilyLow = subfamily.toLowerCase();
  let style: Style = "normal";
  for (const possibleStyle of styles) {
    if (subfamilyLow.includes(possibleStyle)) {
      style = possibleStyle;
      break;
    }
  }
  let weight: WeightValue = weights.normal;
  let possibleWeight: WeightKey;
  for (possibleWeight in weights) {
    if (subfamilyLow.includes(possibleWeight)) {
      weight = weights[possibleWeight];
      break;
    }
  }
  return { style, weight };
};

type FontData = {
  format: FontFormat;
  family: string;
  style: Style;
  weight: WeightValue;
};

export const getFontData = (data: Uint8Array): FontData => {
  const font = fontkit.create(data as Buffer);
  const format = font.type.toLowerCase() as FontData["format"];
  const family = font.getName("fontFamily");
  const parsedSubfamily = parseSubfamily(font.getName("preferredSubfamily"));

  return {
    format,
    family,
    ...parsedSubfamily,
  };
};
