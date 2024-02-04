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

export const borderStyleSolid: Styles = [
  {
    property: "borderTopStyle",
    value: { type: "keyword", value: "solid" },
  },
  {
    property: "borderRightStyle",
    value: { type: "keyword", value: "solid" },
  },
  {
    property: "borderBottomStyle",
    value: { type: "keyword", value: "solid" },
  },
  {
    property: "borderLeftStyle",
    value: { type: "keyword", value: "solid" },
  },
];

export const borderStyleNone: Styles = [
  {
    property: "borderTopStyle",
    value: { type: "keyword", value: "none" },
  },
  {
    property: "borderRightStyle",
    value: { type: "keyword", value: "none" },
  },
  {
    property: "borderBottomStyle",
    value: { type: "keyword", value: "none" },
  },
  {
    property: "borderLeftStyle",
    value: { type: "keyword", value: "none" },
  },
];
