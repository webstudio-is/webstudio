import { StyleUpdate } from "@webstudio-is/project";
import { categories } from "@webstudio-is/react-sdk";
import { StyleUpdateOptions } from "../../shared/use-style-data";

export const spacingPropertiesNames = categories.spacing.properties;

export type SpacingStyleProperty = typeof spacingPropertiesNames[number];

export type HoverTagret = {
  property: SpacingStyleProperty;
  element: SVGElement | HTMLElement;
};

export type StyleChangeHandler = (
  update: StyleUpdate,
  options: StyleUpdateOptions
) => void;
