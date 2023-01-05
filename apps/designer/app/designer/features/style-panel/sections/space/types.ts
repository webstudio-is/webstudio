import { categories } from "@webstudio-is/react-sdk";

export const spacingPropertiesNames = categories.space.properties;

export type SpaceStyleProperty = typeof spacingPropertiesNames[number];

export type HoverTagret = {
  property: SpaceStyleProperty;
  element: SVGElement | HTMLElement;
};
