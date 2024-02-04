import type { Styles } from "./normalize";

export const borderWidth: Styles = [
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

export const outline: Styles = [
  {
    property: "outlineWidth",
    value: { type: "unit", value: 1, unit: "px" },
  },
];

export const borderStyle = (value: string): Styles => [
  {
    property: "borderTopStyle",
    value: { type: "keyword", value },
  },
  {
    property: "borderRightStyle",
    value: { type: "keyword", value },
  },
  {
    property: "borderBottomStyle",
    value: { type: "keyword", value },
  },
  {
    property: "borderLeftStyle",
    value: { type: "keyword", value },
  },
];
