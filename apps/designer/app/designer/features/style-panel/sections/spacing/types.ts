import { StyleProperty } from "@webstudio-is/css-data";
import { StyleUpdate } from "@webstudio-is/project";
import { categories } from "@webstudio-is/react-sdk";
import { StyleUpdateOptions } from "../../shared/use-style-data";

export const spacingPropertiesNames = categories.spacing.properties;

// @todo: remove if not used
export const toSpacingProperty = (
  property: StyleProperty
): SpacingStyleProperty => {
  if ((spacingPropertiesNames as readonly string[]).includes(property)) {
    return property as SpacingStyleProperty;
  }
  throw new Error(`Property ${property} is not a spacing property`);
};

export type SpacingStyleProperty = typeof spacingPropertiesNames[number];

export type HoverTagret = {
  property: SpacingStyleProperty;
  element: SVGElement | HTMLElement;
};

export type StyleChangeHandler = (
  update: StyleUpdate,
  options: StyleUpdateOptions
) => void;
