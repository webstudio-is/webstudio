import type { StyleProperty } from "@webstudio-is/css-data";

export const spacePropertiesNames = [
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
] as const satisfies ReadonlyArray<StyleProperty>;

export type SpaceStyleProperty = (typeof spacePropertiesNames)[number];

export type HoverTarget = {
  property: SpaceStyleProperty;
  element: SVGElement | HTMLElement;
};
