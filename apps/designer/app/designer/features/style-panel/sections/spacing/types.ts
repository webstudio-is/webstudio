import { categories } from "@webstudio-is/react-sdk";

export const spacingPropertiesNames = categories.spacing.properties;

export type SpacingStyleProperty = typeof spacingPropertiesNames[number];

export type HoverTagret = {
  property: SpacingStyleProperty;
  element: SVGElement | HTMLElement;
};
