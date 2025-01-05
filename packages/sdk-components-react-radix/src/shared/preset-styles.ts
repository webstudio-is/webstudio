// this module should not rely on "template" and other unpublished packages
import type { StyleProperty, Unit } from "@webstudio-is/css-engine";
import type { EmbedTemplateStyleDecl } from "@webstudio-is/sdk";

const unit = (property: StyleProperty, value: number, unit: Unit) => ({
  property,
  value: { type: "unit", unit, value } as const,
});

const keyword = (property: StyleProperty, value: string) => ({
  property,
  value: { type: "keyword", value } as const,
});

const rgb = (property: StyleProperty, r: number, g: number, b: number) => ({
  property,
  value: { type: "rgb", alpha: 1, r, g, b } as const,
});

export const buttonReset: EmbedTemplateStyleDecl[] = [
  {
    property: "backgroundColor",
    value: { type: "keyword", value: "transparent" },
  },
  {
    property: "backgroundImage",
    value: { type: "keyword", value: "none" },
  },

  unit("borderTopWidth", 0, "px"),
  unit("borderRightWidth", 0, "px"),
  unit("borderBottomWidth", 0, "px"),
  unit("borderLeftWidth", 0, "px"),
  keyword("borderTopStyle", "solid"),
  keyword("borderRightStyle", "solid"),
  keyword("borderBottomStyle", "solid"),
  keyword("borderLeftStyle", "solid"),
  rgb("borderTopColor", 226, 232, 240),
  rgb("borderRightColor", 226, 232, 240),
  rgb("borderBottomColor", 226, 232, 240),
  rgb("borderLeftColor", 226, 232, 240),

  unit("paddingTop", 0, "px"),
  unit("paddingRight", 0, "px"),
  unit("paddingBottom", 0, "px"),
  unit("paddingLeft", 0, "px"),
];
