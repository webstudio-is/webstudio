import type { Style } from "@webstudio-is/css-data";

export const borders = {
  borderTopColor: {
    type: "keyword",
    value: "currentColor",
  },
  borderRightColor: {
    type: "keyword",
    value: "currentColor",
  },
  borderBottomColor: {
    type: "keyword",
    value: "currentColor",
  },
  borderLeftColor: {
    type: "keyword",
    value: "currentColor",
  },

  borderTopWidth: {
    type: "unit",
    value: 1,
    unit: "px",
  },

  borderRightWidth: {
    type: "unit",
    value: 1,
    unit: "px",
  },
  borderBottomWidth: {
    type: "unit",
    value: 1,
    unit: "px",
  },
  borderLeftWidth: {
    type: "unit",
    value: 1,
    unit: "px",
  },
} as const satisfies Style;
