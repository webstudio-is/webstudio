import type { spaceProperties } from "./properties";

export type SpaceStyleProperty = (typeof spaceProperties)[number];

export type HoverTarget = {
  property: SpaceStyleProperty;
  element: SVGElement | HTMLElement;
};
