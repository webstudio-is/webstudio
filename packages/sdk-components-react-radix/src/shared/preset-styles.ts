// this module should not rely on "template" and other unpublished packages
import type { CssProperty, Unit } from "@webstudio-is/css-engine";
import type { PresetStyleDecl } from "@webstudio-is/sdk";

const unit = (property: CssProperty, value: number, unit: Unit) => ({
  property,
  value: { type: "unit", unit, value } as const,
});

const keyword = (property: CssProperty, value: string) => ({
  property,
  value: { type: "keyword", value } as const,
});

const rgb = (property: CssProperty, r: number, g: number, b: number) => ({
  property,
  value: { type: "rgb", alpha: 1, r, g, b } as const,
});

export const buttonReset: PresetStyleDecl[] = [
  {
    property: "background-color",
    value: { type: "keyword", value: "transparent" },
  },
  {
    property: "background-image",
    value: { type: "keyword", value: "none" },
  },

  unit("border-top-width", 0, "px"),
  unit("border-right-width", 0, "px"),
  unit("border-bottom-width", 0, "px"),
  unit("border-left-width", 0, "px"),
  keyword("border-top-style", "solid"),
  keyword("border-right-style", "solid"),
  keyword("border-bottom-style", "solid"),
  keyword("border-left-style", "solid"),
  rgb("border-top-color", 226, 232, 240),
  rgb("border-right-color", 226, 232, 240),
  rgb("border-bottom-color", 226, 232, 240),
  rgb("border-left-color", 226, 232, 240),

  unit("padding-top", 0, "px"),
  unit("padding-right", 0, "px"),
  unit("padding-bottom", 0, "px"),
  unit("padding-left", 0, "px"),
];
