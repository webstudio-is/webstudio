import type { EmbedTemplateStyleDecl } from "../embed-template";

export const borders: EmbedTemplateStyleDecl[] = [
  {
    property: "borderTopColor",
    value: { type: "keyword", value: "currentColor" },
  },
  {
    property: "borderRightColor",
    value: { type: "keyword", value: "currentColor" },
  },
  {
    property: "borderBottomColor",
    value: { type: "keyword", value: "currentColor" },
  },
  {
    property: "borderLeftColor",
    value: { type: "keyword", value: "currentColor" },
  },

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
