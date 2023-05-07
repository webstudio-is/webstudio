import type { EmbedTemplateStyleDecl } from "../embed-template";

export const borders: EmbedTemplateStyleDecl[] = [
  {
    property: "borderTopWidth",
    value: { type: "unit", value: 1, unit: "px" },
  },
  {
    property: "borderRightWidth",
    value: { type: "unit", value: 1, unit: "px" },
  },
  {
    property: "borderBottomWidth",
    value: { type: "unit", value: 1, unit: "px" },
  },
  {
    property: "borderLeftWidth",
    value: { type: "unit", value: 1, unit: "px" },
  },
];

export const linkColors: EmbedTemplateStyleDecl[] = [
  {
    property: "color",
    value: { type: "rgb", r: 0, g: 0, b: 238, alpha: 1 },
  },
  {
    state: ":active",
    property: "color",
    // chrome and safari use rgb(255, 0, 0)
    value: { type: "rgb", r: 238, g: 0, b: 0, alpha: 1 },
  },
  {
    state: ":visited",
    property: "color",
    value: { type: "rgb", r: 85, g: 26, b: 139, alpha: 1 },
  },
];
