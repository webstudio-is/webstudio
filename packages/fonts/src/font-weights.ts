export const fontWeights = {
  "100": {
    label: "Thin",
    name: "thin",
    alt: "hairline",
  },
  "200": {
    label: "Extra Light",
    name: "extra light",
    alt: "ultra light",
  },
  "300": {
    label: "Light",
    name: "light",
    alt: "light",
  },
  "400": {
    label: "Normal",
    name: "normal",
    alt: "normal",
  },
  "500": {
    label: "Medium",
    name: "medium",
    alt: "medium",
  },
  "600": {
    label: "Semi Bold",
    name: "semi bold",
    alt: "demi bold",
  },
  "700": {
    label: "Bold",
    name: "bold",
    alt: "bold",
  },
  "800": {
    label: "Extra Bold",
    name: "extra bold",
    alt: "ultra bold",
  },
  "900": {
    label: "Black",
    name: "black",
    alt: "heavy",
  },
} as const;

export type FontWeight = keyof typeof fontWeights;
export type FontWeightKeyword =
  | (typeof fontWeights)[FontWeight]["name"]
  | (typeof fontWeights)[FontWeight]["alt"];
