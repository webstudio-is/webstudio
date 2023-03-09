import { categories } from "@webstudio-is/react-sdk";

export const spacePropertiesNames = categories.space.properties;

export type SpaceStyleProperty = (typeof spacePropertiesNames)[number];

export type HoverTagret = {
  property: SpaceStyleProperty;
  element: SVGElement | HTMLElement;
};
