export const fontWeights = {
  "100": {
    label: "Thin",
    names: ["thin", "hairline"],
  },
  "200": {
    label: "Extra Light",
    names: ["extra light", "extralight", "ultra light", "ultralight"],
  },
  "300": {
    label: "Light",
    names: ["light"],
  },
  "400": {
    label: "Normal",
    names: ["normal", "regular"],
  },
  "500": {
    label: "Medium",
    names: ["medium"],
  },
  "600": {
    label: "Semi Bold",
    names: ["semi bold", "semibold", "demi bold", "demibold"],
  },
  "700": {
    label: "Bold",
    names: ["bold", "bold"],
  },
  "800": {
    label: "Extra Bold",
    names: ["extra bold", "extrabold", "ultra bold", "ultrabold"],
  },
  "900": {
    label: "Black",
    names: ["black", "heavy"],
  },
} as const;

export type FontWeight = keyof typeof fontWeights;
