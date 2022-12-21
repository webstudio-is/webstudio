import type { StyleValue, StyleProperty } from "@webstudio-is/css-data";
import { categories } from "@webstudio-is/react-sdk";

export type StyleChangeEvent = {
  property: StyleProperty;
  value: StyleValue;
  isEphemeral: boolean;
};

export const spacingPropertiesNames = categories.spacing.properties;

export type SpacingStyleProperty = typeof spacingPropertiesNames[number];

export type HoverTagret = {
  property: SpacingStyleProperty;
  element: SVGElement | HTMLElement;
};
