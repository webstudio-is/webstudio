import type { CssProperty } from "@webstudio-is/css-engine";

export const spaceProperties = [
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
] satisfies CssProperty[];

export type SpaceStyleProperty = (typeof spaceProperties)[number];

export type HoverTarget = {
  property: SpaceStyleProperty;
  element: SVGElement | HTMLElement;
};
